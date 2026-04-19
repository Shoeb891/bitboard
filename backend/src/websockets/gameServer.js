// gameServer.js — Skribbl-style drawing-and-guessing game over Socket.io.
//
// All game state lives in-memory (the `rooms` object). No DB persistence
// for the MVP — if the server restarts, active rooms are lost.
//
// Room lifecycle:
//   game:create  → host creates room, gets a 6-char code
//   game:join    → others join with that code (also handles reconnect mid-game)
//   game:start   → host starts; rounds begin
//   game:draw    → drawer streams strokes; server relays to other players
//   game:guess   → guessers submit text; server checks and scores
//   game:leave / disconnect → player marked disconnected; removed after 10 s grace
//
// Round flow (per round):
//   startRound() → phase = 'drawing', word chosen, 60-s timer starts
//   endRound()   → phase = 'between' (4 s), then next round or 'ended'
//
// Drawer rotation is tracked via room.drawersThisRound (Set of userIds) so that
// leaves and reconnects don't skip players or falsely advance the round counter.

const WORDS = require("../data/words");

const DISCONNECT_GRACE_MS = 10_000;

// ── In-memory store ───────────────────────────────────────────────────────────
const rooms = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// Build a room-state snapshot for a specific player.
function roomView(room, forUserId) {
  const drawer = room.players[room.currentDrawerIndex] || null;
  const isDrawer = drawer && drawer.userId === forUserId;
  const revealWord =
    room.phase === "between" || room.phase === "ended" || isDrawer;

  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    maxRounds: room.maxRounds,
    timeLeft: room.timeLeft,
    word: revealWord ? room.currentWord : null,
    wordLength: room.currentWord ? room.currentWord.length : null,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
      isDrawer: drawer ? p.userId === drawer.userId : false,
      guessed: room.guessedPlayerIds.has(p.userId),
      disconnected: !!p.disconnected,
    })),
    hostId: room.hostId,
    isDrawer,
  };
}

// Send a tailored state snapshot to every connected player.
function broadcast(io, room) {
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit("game:state", roomView(room, p.userId));
  }
}

// Emit a system chat message (join/leave/host-change/etc.) to the whole room.
function systemMsg(io, room, text) {
  const payload = { text, ts: Date.now() };
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit("game:system", payload);
  }
}

// ── Round management ──────────────────────────────────────────────────────────

// One tick of the server-side countdown; extracted so the resume path can reuse it.
function tickTimer(io, room) {
  room.timeLeft -= 1;
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit("game:timer", { timeLeft: room.timeLeft });
  }
  if (room.timeLeft <= 0) endRound(io, room);
}

function startRound(io, room) {
  room.phase = "drawing";
  room.currentWord = pickWord();
  room.guessedPlayerIds = new Set();
  room.timeLeft = 60;
  room.canvas = [];

  const drawer = room.players[room.currentDrawerIndex];
  if (drawer) room.drawersThisRound.add(drawer.userId);

  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit("game:canvas-clear");
  }

  broadcast(io, room);

  room.timerInterval = setInterval(() => tickTimer(io, room), 1000);
}

function endRound(io, room) {
  if (room.phase !== "drawing") return;

  clearInterval(room.timerInterval);
  room.timerInterval = null;
  room.phase = "between";

  broadcast(io, room);

  room.betweenTimeout = setTimeout(() => {
    room.betweenTimeout = null;

    if (room.players.length < 2) {
      room.phase = "ended";
      broadcast(io, room);
      return;
    }

    // Pick the next drawer as the first surviving player who has not drawn yet.
    // Position-independent so leaves/reconnects can't skip a player.
    const nextDrawer = room.players.find(
      (p) => !room.drawersThisRound.has(p.userId)
    );

    if (!nextDrawer) {
      room.round += 1;
      room.drawersThisRound = new Set();

      if (room.round > room.maxRounds) {
        room.phase = "ended";
        room.currentWord = null;
        broadcast(io, room);
        return;
      }

      room.currentDrawerIndex = 0;
    } else {
      room.currentDrawerIndex = room.players.indexOf(nextDrawer);
    }

    startRound(io, room);
  }, 4000);
}

function cleanupRoom(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.betweenTimeout) {
    clearTimeout(room.betweenTimeout);
    room.betweenTimeout = null;
  }
  for (const p of room.players) {
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = null;
    }
  }
  delete rooms[room.code];
}

// ── Player leave / disconnect ─────────────────────────────────────────────────

// Mark a player as disconnected, pause the round timer if they were drawing,
// and schedule the actual removal after the grace period.
function handleLeave(io, socket) {
  const code = socket.gameRoom;
  if (!code) return;

  const room = rooms[code];
  if (!room) return;

  socket.leave(`game:${code}`);
  socket.gameRoom = null;

  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) return;

  const drawer = room.players[room.currentDrawerIndex];
  const leavingIsDrawer = drawer && drawer.userId === player.userId;

  player.disconnected = true;
  player.socketId = null;

  if (leavingIsDrawer && room.phase === "drawing" && room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
    systemMsg(io, room, `${player.username} (drawer) disconnected — pausing`);
  } else {
    systemMsg(io, room, `${player.username} disconnected — waiting 10s…`);
  }

  if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
  player.disconnectTimer = setTimeout(() => {
    finalizeLeave(io, room, player);
  }, DISCONNECT_GRACE_MS);

  broadcast(io, room);
}

// Actually remove a player whose grace period has expired.
function finalizeLeave(io, room, player) {
  if (!player.disconnected) return;
  if (!rooms[room.code]) return;

  const drawerBefore = room.players[room.currentDrawerIndex];
  const drawerWasLeaver = drawerBefore && drawerBefore.userId === player.userId;

  room.players = room.players.filter((p) => p.userId !== player.userId);
  player.disconnectTimer = null;

  systemMsg(io, room, `${player.username} left`);

  if (room.players.length === 0) {
    cleanupRoom(room);
    return;
  }

  if (room.hostId === player.userId) {
    room.hostId = room.players[0].userId;
    systemMsg(io, room, `${room.players[0].username} is now the host`);
  }

  if (room.phase === "drawing") {
    if (drawerWasLeaver) {
      systemMsg(io, room, `Drawer left — skipping round`);
      endRound(io, room);
      return;
    }
    if (room.players.length < 2) {
      endRound(io, room);
      return;
    }
  }

  if (room.currentDrawerIndex >= room.players.length) {
    room.currentDrawerIndex = Math.max(0, room.players.length - 1);
  }

  broadcast(io, room);
}

// ── Socket event handlers ─────────────────────────────────────────────────────

function setupGameHandlers(io, socket) {
  // ── game:create ──────────────────────────────────────────────────────────
  socket.on("game:create", function (data, callback) {
    if (typeof callback !== "function") return;

    if (socket.gameRoom) {
      return callback({ ok: false, error: "Already in a room" });
    }

    const { username } = data || {};
    const code = generateCode();

    rooms[code] = {
      code,
      hostId: socket.userId,
      players: [
        {
          socketId: socket.id,
          userId: socket.userId,
          username: username || "Player",
          score: 0,
          disconnected: false,
          disconnectTimer: null,
        },
      ],
      phase: "lobby",
      currentWord: null,
      currentDrawerIndex: 0,
      round: 1,
      maxRounds: 3,
      timeLeft: 60,
      timerInterval: null,
      betweenTimeout: null,
      guessedPlayerIds: new Set(),
      drawersThisRound: new Set(),
      canvas: [],
    };

    socket.join(`game:${code}`);
    socket.gameRoom = code;

    callback({ ok: true, code, state: roomView(rooms[code], socket.userId) });
  });

  // ── game:join ────────────────────────────────────────────────────────────
  // Handles both first-time joins (lobby only) and mid-game reconnects.
  socket.on("game:join", function (data, callback) {
    if (typeof callback !== "function") return;

    const { code, username } = data || {};
    const room = rooms[code];
    if (!room) return callback({ ok: false, error: "Room not found" });

    const existing = room.players.find((p) => p.userId === socket.userId);

    // Reconnect path — same userId already has a seat (possibly disconnected).
    if (existing) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }
      existing.disconnected = false;
      existing.socketId = socket.id;

      socket.join(`game:${code}`);
      socket.gameRoom = code;

      systemMsg(io, room, `${existing.username} reconnected`);

      // Replay persisted canvas strokes for the returning player.
      for (const stroke of room.canvas) {
        socket.emit("game:draw", stroke);
      }

      // Resume the timer if the reconnecting player is the current drawer.
      if (room.phase === "drawing") {
        const drawer = room.players[room.currentDrawerIndex];
        if (drawer && drawer.userId === socket.userId && !room.timerInterval) {
          room.timerInterval = setInterval(() => tickTimer(io, room), 1000);
          systemMsg(io, room, `Drawer reconnected — resuming`);
        }
      }

      broadcast(io, room);
      return callback({
        ok: true,
        state: roomView(room, socket.userId),
        resumed: true,
      });
    }

    // New-join path — only allowed in lobby.
    if (room.phase !== "lobby")
      return callback({ ok: false, error: "Game already started" });
    if (room.players.length >= 8)
      return callback({ ok: false, error: "Room is full (max 8)" });

    const newPlayer = {
      socketId: socket.id,
      userId: socket.userId,
      username: username || "Player",
      score: 0,
      disconnected: false,
      disconnectTimer: null,
    };
    room.players.push(newPlayer);

    socket.join(`game:${code}`);
    socket.gameRoom = code;

    systemMsg(io, room, `${newPlayer.username} joined`);
    broadcast(io, room);
    callback({ ok: true, state: roomView(room, socket.userId) });
  });

  // ── game:start ───────────────────────────────────────────────────────────
  socket.on("game:start", function (data, callback) {
    const code = socket.gameRoom;
    const room = rooms[code];

    if (!room) return callback?.({ ok: false, error: "Not in a room" });
    if (room.hostId !== socket.userId)
      return callback?.({ ok: false, error: "Only the host can start" });
    if (room.players.length < 2)
      return callback?.({ ok: false, error: "Need at least 2 players to start" });
    if (room.phase !== "lobby")
      return callback?.({ ok: false, error: "Game already started" });

    room.maxRounds = (data?.maxRounds) || 3;
    room.currentDrawerIndex = 0;
    room.round = 1;
    room.drawersThisRound = new Set();

    startRound(io, room);
    callback?.({ ok: true });
  });

  // ── game:draw ────────────────────────────────────────────────────────────
  // Drawer sends stroke segments; server relays to all other connected players.
  // Stroke format: { type: 'start'|'move'|'end'|'clear', x, y, color, size }
  socket.on("game:draw", function (strokeData) {
    const code = socket.gameRoom;
    const room = rooms[code];
    if (!room || room.phase !== "drawing") return;

    const drawer = room.players[room.currentDrawerIndex];
    if (!drawer || drawer.userId !== socket.userId) return;

    room.canvas.push(strokeData);

    for (const p of room.players) {
      if (p.userId !== socket.userId && p.socketId) {
        io.to(p.socketId).emit("game:draw", strokeData);
      }
    }
  });

  // ── game:guess ───────────────────────────────────────────────────────────
  socket.on("game:guess", function (data, callback) {
    const code = socket.gameRoom;
    const room = rooms[code];
    if (!room || room.phase !== "drawing") return callback?.({ ok: false });

    const drawer = room.players[room.currentDrawerIndex];
    if (drawer?.userId === socket.userId) return;
    if (room.guessedPlayerIds.has(socket.userId)) return;

    const guess = (data?.guess || "").trim();
    if (!guess) return;

    const correct =
      guess.toLowerCase() === (room.currentWord || "").toLowerCase();

    const player = room.players.find((p) => p.userId === socket.userId);
    const msgPayload = {
      userId: socket.userId,
      username: player?.username || "?",
      guess,
      correct,
    };

    for (const p of room.players) {
      if (p.socketId) io.to(p.socketId).emit("game:guess", msgPayload);
    }

    if (correct) {
      room.guessedPlayerIds.add(socket.userId);

      const guesserPoints = Math.max(50, room.timeLeft * 5);
      const drawerPoints = 20;

      if (player) player.score += guesserPoints;
      if (drawer) drawer.score += drawerPoints;

      broadcast(io, room);

      // Round ends early only when every CONNECTED non-drawer has guessed.
      const nonDrawers = room.players.filter(
        (p) => p.userId !== drawer?.userId && !p.disconnected
      );
      const allGuessed = nonDrawers.every((p) =>
        room.guessedPlayerIds.has(p.userId)
      );
      if (allGuessed && nonDrawers.length > 0) endRound(io, room);
    }

    callback?.({ ok: true, correct });
  });

  // ── game:leave ───────────────────────────────────────────────────────────
  socket.on("game:leave", function () {
    handleLeave(io, socket);
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", function () {
    handleLeave(io, socket);
  });
}

module.exports = { setupGameHandlers };
