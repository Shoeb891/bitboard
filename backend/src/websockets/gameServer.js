// gameServer.js — Skribbl-style drawing-and-guessing game over Socket.io.
//
// All game state lives in-memory (the `rooms` object). No DB persistence
// for the MVP — if the server restarts, active rooms are lost.
//
// Room lifecycle:
//   game:create  → host creates room, gets a 6-char code
//   game:join    → others join with that code
//   game:start   → host starts; rounds begin
//   game:draw    → drawer streams strokes; server relays to other players
//   game:guess   → guessers submit text; server checks and scores
//   game:leave / disconnect → player removed; room cleaned up when empty
//
// Round flow (per round):
//   startRound() → phase = 'drawing', word chosen, 60-s timer starts
//   endRound()   → phase = 'between' (4 s), then next round or 'ended'

const WORDS = require("../data/words");

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
// Drawers see the current word; guessers only see its length.
// During 'between' and 'ended' phases everyone sees the last word.
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
    })),
    hostId: room.hostId,
    isDrawer,
  };
}

// Send a tailored state snapshot to every connected player.
function broadcast(io, room) {
  for (const player of room.players) {
    io.to(player.socketId).emit("game:state", roomView(room, player.userId));
  }
}

// ── Round management ──────────────────────────────────────────────────────────

function startRound(io, room) {
  room.phase = "drawing";
  room.currentWord = pickWord();
  room.guessedPlayerIds = new Set();
  room.timeLeft = 60;
  room.canvas = []; // reset stored strokes for this round

  // Tell all players to clear their canvas before the new round starts
  for (const player of room.players) {
    io.to(player.socketId).emit("game:canvas-clear");
  }

  broadcast(io, room);

  // Server-side countdown — ticks every second
  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1;

    for (const player of room.players) {
      io.to(player.socketId).emit("game:timer", { timeLeft: room.timeLeft });
    }

    if (room.timeLeft <= 0) {
      endRound(io, room);
    }
  }, 1000);
}

function endRound(io, room) {
  // Guard against calling endRound twice (timer + all-guessed race)
  if (room.phase !== "drawing") return;

  clearInterval(room.timerInterval);
  room.timerInterval = null;
  room.phase = "between";

  broadcast(io, room);

  // Pause between rounds, then either start the next or end the game
  room.betweenTimeout = setTimeout(() => {
    room.betweenTimeout = null;

    if (room.players.length < 2) {
      room.phase = "ended";
      broadcast(io, room);
      return;
    }

    // Advance drawer index, wrapping around
    room.currentDrawerIndex =
      (room.currentDrawerIndex + 1) % room.players.length;

    // Completed a full rotation → increment round counter
    if (room.currentDrawerIndex === 0) {
      room.round += 1;
    }

    if (room.round > room.maxRounds) {
      room.phase = "ended";
      room.currentWord = null;
      broadcast(io, room);
    } else {
      startRound(io, room);
    }
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
  delete rooms[room.code];
}

// ── Player leave / disconnect ─────────────────────────────────────────────────

function handleLeave(io, socket) {
  const code = socket.gameRoom;
  if (!code) return;

  const room = rooms[code];
  if (!room) return;

  socket.leave(`game:${code}`);
  socket.gameRoom = null;

  // Determine if the leaving player was the current drawer before removing
  const drawer = room.players[room.currentDrawerIndex];
  const leavingIsDrawer = drawer && drawer.userId === socket.userId;

  room.players = room.players.filter((p) => p.socketId !== socket.id);

  if (room.players.length === 0) {
    cleanupRoom(room);
    return;
  }

  // Transfer host if needed
  if (room.hostId === socket.userId) {
    room.hostId = room.players[0].userId;
  }

  // Fix drawer index if it's now out of bounds
  if (room.currentDrawerIndex >= room.players.length) {
    room.currentDrawerIndex = 0;
  }

  // If the drawer left mid-game, skip to next round
  if (room.phase === "drawing" && leavingIsDrawer) {
    endRound(io, room);
    return;
  }

  // Not enough players left — end game
  if (room.phase === "drawing" && room.players.length < 2) {
    endRound(io, room);
    return;
  }

  broadcast(io, room);
}

// ── Socket event handlers ─────────────────────────────────────────────────────

function setupGameHandlers(io, socket) {
  // ── game:create ──────────────────────────────────────────────────────────
  socket.on("game:create", function (data, callback) {
    if (typeof callback !== "function") return;

    // One game room per socket at a time
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
      canvas: [],
    };

    socket.join(`game:${code}`);
    socket.gameRoom = code;

    callback({ ok: true, code, state: roomView(rooms[code], socket.userId) });
  });

  // ── game:join ────────────────────────────────────────────────────────────
  socket.on("game:join", function (data, callback) {
    if (typeof callback !== "function") return;

    const { code, username } = data || {};
    const room = rooms[code];

    if (!room) return callback({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby")
      return callback({ ok: false, error: "Game already started" });
    if (room.players.length >= 8)
      return callback({ ok: false, error: "Room is full (max 8)" });

    // Allow reconnect: same user joins again
    const existing = room.players.find((p) => p.userId === socket.userId);
    if (existing) {
      existing.socketId = socket.id;
    } else {
      room.players.push({
        socketId: socket.id,
        userId: socket.userId,
        username: username || "Player",
        score: 0,
      });
    }

    socket.join(`game:${code}`);
    socket.gameRoom = code;

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

    startRound(io, room);
    callback?.({ ok: true });
  });

  // ── game:draw ────────────────────────────────────────────────────────────
  // Drawer sends stroke segments; server relays to all other players.
  // Stroke format: { type: 'start'|'move'|'end'|'clear', x, y, color, size }
  // x and y are normalised to [0, 1] so they render correctly on any screen.
  socket.on("game:draw", function (strokeData) {
    const code = socket.gameRoom;
    const room = rooms[code];
    if (!room || room.phase !== "drawing") return;

    const drawer = room.players[room.currentDrawerIndex];
    if (!drawer || drawer.userId !== socket.userId) return;

    // Persist stroke so latecomers can replay the canvas
    room.canvas.push(strokeData);

    // Relay to everyone else in the room
    for (const player of room.players) {
      if (player.userId !== socket.userId) {
        io.to(player.socketId).emit("game:draw", strokeData);
      }
    }
  });

  // ── game:guess ───────────────────────────────────────────────────────────
  socket.on("game:guess", function (data, callback) {
    const code = socket.gameRoom;
    const room = rooms[code];
    if (!room || room.phase !== "drawing") return callback?.({ ok: false });

    const drawer = room.players[room.currentDrawerIndex];
    if (drawer?.userId === socket.userId) return; // drawer can't guess
    if (room.guessedPlayerIds.has(socket.userId)) return; // already correct

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

    // Broadcast the guess message to everyone in the room
    for (const p of room.players) {
      io.to(p.socketId).emit("game:guess", msgPayload);
    }

    if (correct) {
      room.guessedPlayerIds.add(socket.userId);

      // Score: guesser earns points proportional to remaining time
      const guesserPoints = Math.max(50, room.timeLeft * 5);
      const drawerPoints = 20;

      if (player) player.score += guesserPoints;
      if (drawer) drawer.score += drawerPoints;

      broadcast(io, room);

      // End round early if every non-drawer has guessed correctly
      const nonDrawers = room.players.filter(
        (p) => p.userId !== drawer?.userId
      );
      const allGuessed = nonDrawers.every((p) =>
        room.guessedPlayerIds.has(p.userId)
      );
      if (allGuessed) endRound(io, room);
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
