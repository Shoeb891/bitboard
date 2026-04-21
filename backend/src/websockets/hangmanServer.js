// hangmanServer.js — Multiplayer Hangman over Socket.io.
//
// Room lifecycle:
//   hangman:create  → host creates room, gets a 6-char code
//   hangman:join    → others join with that code
//   hangman:start   → host starts; rounds begin
//   hangman:set-word → the current setter submits a secret word
//   hangman:guess   → a guesser picks a letter
//   hangman:leave / disconnect → player removed; room cleaned up when empty
//
// Round flow:
//   startRound() → phase = 'setting' (setter types their word)
//   setter submits word → phase = 'guessing'
//   word solved OR 6 wrong guesses → endRound()
//   endRound() → phase = 'between' (4s), then next round or 'ended'

const rooms = {};

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getWordProgress(room) {
  if (!room.currentWord) return [];
  return room.currentWord.split("").map((ch) => {
    if (ch === " ") return " ";
    return room.guessedLetters.has(ch) ? ch : "_";
  });
}

function isWordSolved(room) {
  if (!room.currentWord) return false;
  return room.currentWord
    .split("")
    .every((ch) => ch === " " || room.guessedLetters.has(ch));
}

function roomView(room, forUserId) {
  const setter = room.players[room.currentSetterIndex] || null;
  const isSetter = setter && setter.userId === forUserId;
  const revealWord =
    isSetter || room.phase === "between" || room.phase === "ended";

  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    maxRounds: room.maxRounds,
    word: revealWord ? room.currentWord : null,
    wordLength: room.currentWord ? room.currentWord.length : null,
    wordProgress: getWordProgress(room),
    guessedLetters: [...room.guessedLetters],
    wrongGuesses: room.wrongGuesses,
    lastRoundWon: room.lastRoundWon,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
      isSetter: setter ? p.userId === setter.userId : false,
    })),
    hostId: room.hostId,
    isSetter,
    setterId: setter ? setter.userId : null,
    setterName: setter ? setter.username : null,
  };
}

function broadcast(io, room) {
  for (const player of room.players) {
    io.to(player.socketId).emit("hangman:state", roomView(room, player.userId));
  }
}

function advanceAfterBetween(io, room) {
  if (room.players.length < 2) {
    room.phase = "ended";
    broadcast(io, room);
    return;
  }

  room.currentSetterIndex =
    (room.currentSetterIndex + 1) % room.players.length;

  if (room.currentSetterIndex === 0) {
    room.round += 1;
  }

  if (room.round > room.maxRounds) {
    room.phase = "ended";
    room.currentWord = null;
    broadcast(io, room);
  } else {
    room.phase = "setting";
    room.currentWord = null;
    room.guessedLetters = new Set();
    room.wrongGuesses = [];
    broadcast(io, room);
  }
}

function endRound(io, room, guessersWon) {
  if (room.phase !== "guessing") return;
  room.phase = "between";
  room.lastRoundWon = guessersWon;

  broadcast(io, room);

  room.betweenTimeout = setTimeout(() => {
    room.betweenTimeout = null;
    advanceAfterBetween(io, room);
  }, 4000);
}

function cleanupRoom(room) {
  if (room.betweenTimeout) {
    clearTimeout(room.betweenTimeout);
    room.betweenTimeout = null;
  }
  delete rooms[room.code];
}

function handleLeave(io, socket) {
  const code = socket.hangmanRoom;
  if (!code) return;

  const room = rooms[code];
  if (!room) return;

  socket.leave(`hangman:${code}`);
  socket.hangmanRoom = null;

  const setter = room.players[room.currentSetterIndex];
  const leavingIsSetter = setter && setter.userId === socket.userId;

  room.players = room.players.filter((p) => p.socketId !== socket.id);

  if (room.players.length === 0) {
    cleanupRoom(room);
    return;
  }

  if (room.hostId === socket.userId) {
    room.hostId = room.players[0].userId;
  }

  if (room.currentSetterIndex >= room.players.length) {
    room.currentSetterIndex = 0;
  }

  // Setter left mid-round — skip to next round
  if ((room.phase === "guessing" || room.phase === "setting") && leavingIsSetter) {
    room.phase = "between";
    room.lastRoundWon = null;
    broadcast(io, room);
    room.betweenTimeout = setTimeout(() => {
      room.betweenTimeout = null;
      advanceAfterBetween(io, room);
    }, 3000);
    return;
  }

  if (room.phase === "guessing" && room.players.length < 2) {
    endRound(io, room, false);
    return;
  }

  broadcast(io, room);
}

function setupHangmanHandlers(io, socket) {
  // ── hangman:create ────────────────────────────────────────────────────────
  socket.on("hangman:create", function (data, callback) {
    if (typeof callback !== "function") return;
    if (socket.hangmanRoom) return callback({ ok: false, error: "Already in a room" });

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
      currentSetterIndex: 0,
      round: 1,
      maxRounds: 3,
      guessedLetters: new Set(),
      wrongGuesses: [],
      betweenTimeout: null,
      lastRoundWon: null,
    };

    socket.join(`hangman:${code}`);
    socket.hangmanRoom = code;

    callback({ ok: true, code, state: roomView(rooms[code], socket.userId) });
  });

  // ── hangman:join ──────────────────────────────────────────────────────────
  socket.on("hangman:join", function (data, callback) {
    if (typeof callback !== "function") return;

    const { code, username } = data || {};
    const room = rooms[code];

    if (!room) return callback({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby") return callback({ ok: false, error: "Game already started" });
    if (room.players.length >= 8) return callback({ ok: false, error: "Room is full (max 8)" });

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

    socket.join(`hangman:${code}`);
    socket.hangmanRoom = code;

    broadcast(io, room);
    callback({ ok: true, state: roomView(room, socket.userId) });
  });

  // ── hangman:start ─────────────────────────────────────────────────────────
  socket.on("hangman:start", function (data, callback) {
    const code = socket.hangmanRoom;
    const room = rooms[code];

    if (!room) return callback?.({ ok: false, error: "Not in a room" });
    if (room.hostId !== socket.userId) return callback?.({ ok: false, error: "Only the host can start" });
    if (room.players.length < 2) return callback?.({ ok: false, error: "Need at least 2 players" });
    if (room.phase !== "lobby") return callback?.({ ok: false, error: "Already started" });

    room.maxRounds = data?.maxRounds || 3;
    room.currentSetterIndex = 0;
    room.round = 1;
    room.phase = "setting";

    broadcast(io, room);
    callback?.({ ok: true });
  });

  // ── hangman:set-word ──────────────────────────────────────────────────────
  socket.on("hangman:set-word", function (data, callback) {
    const code = socket.hangmanRoom;
    const room = rooms[code];

    if (!room || room.phase !== "setting") return callback?.({ ok: false, error: "Not in setting phase" });

    const setter = room.players[room.currentSetterIndex];
    if (!setter || setter.userId !== socket.userId) {
      return callback?.({ ok: false, error: "Not your turn to set the word" });
    }

    const word = (data?.word || "").trim().toLowerCase();
    if (!word || word.length < 2) return callback?.({ ok: false, error: "Word must be at least 2 letters" });
    if (word.length > 20) return callback?.({ ok: false, error: "Word too long (max 20 letters)" });
    if (!/^[a-z ]+$/.test(word)) return callback?.({ ok: false, error: "Letters and spaces only" });

    room.currentWord = word;
    room.guessedLetters = new Set();
    room.wrongGuesses = [];
    room.phase = "guessing";

    broadcast(io, room);
    callback?.({ ok: true });
  });

  // ── hangman:guess ─────────────────────────────────────────────────────────
  socket.on("hangman:guess", function (data, callback) {
    const code = socket.hangmanRoom;
    const room = rooms[code];

    if (!room || room.phase !== "guessing") return callback?.({ ok: false });

    const setter = room.players[room.currentSetterIndex];
    if (setter?.userId === socket.userId) return; // setter can't guess

    const letter = (data?.letter || "").toLowerCase();
    if (!letter || !/^[a-z]$/.test(letter)) return;
    if (room.guessedLetters.has(letter)) return;

    room.guessedLetters.add(letter);

    const inWord = room.currentWord.includes(letter);

    if (inWord) {
      // Points per occurrence of the letter in the word
      const occurrences = room.currentWord.split("").filter((ch) => ch === letter).length;
      const player = room.players.find((p) => p.userId === socket.userId);
      if (player) player.score += occurrences * 10;

      if (isWordSolved(room)) {
        // Bonus for the guesser who solved it
        if (player) player.score += 50;
        endRound(io, room, true);
        return;
      }
    } else {
      room.wrongGuesses.push(letter);

      if (room.wrongGuesses.length >= 6) {
        // Setter wins — full hangman drawn
        if (setter) setter.score += 80;
        endRound(io, room, false);
        return;
      }
    }

    broadcast(io, room);
    callback?.({ ok: true, correct: inWord });
  });

  // ── hangman:leave ─────────────────────────────────────────────────────────
  socket.on("hangman:leave", function () {
    handleLeave(io, socket);
  });

  socket.on("disconnect", function () {
    handleLeave(io, socket);
  });
}

module.exports = { setupHangmanHandlers };
