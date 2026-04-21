# Draw & Guess Game — Feature Documentation

A Skribbl.io-style real-time drawing and guessing game built into Bitboard.
Players take turns drawing a word while others race to guess it in the chat.

---

## Table of Contents

1. [How to Play](#how-to-play)
2. [Feature Overview](#feature-overview)
3. [Files Changed or Created](#files-changed-or-created)
4. [How It Works — Backend](#how-it-works--backend)
5. [How It Works — Frontend](#how-it-works--frontend)
6. [Socket Events Reference](#socket-events-reference)
7. [Scoring System](#scoring-system)
8. [Known Limitations (MVP)](#known-limitations-mvp)
9. [Future Improvements](#future-improvements)

---

## How to Play

1. Log in to Bitboard and click **GAME** in the navbar.
2. One player clicks **Create Room** — they become the host and get a 6-character room code (e.g. `XK92BT`).
3. Other players click **Join a Room** and enter that code.
4. Once 2 or more players are in the lobby, the host clicks **Start Game**.
5. Players take turns drawing a word while everyone else types guesses.
6. Correct guesses earn points — faster guesses earn more points.
7. After 3 rounds, the final scoreboard is shown with a winner.

You need **2 browser sessions** to test it (e.g. two different browsers, or one normal + one incognito window, each logged into a different account).

---

## Feature Overview

| Area | Detail |
|---|---|
| Route | `/game` |
| Players | 2–8 per room |
| Rounds | 3 (default) |
| Time per turn | 60 seconds |
| Word list | ~130 words across 8 categories |
| Drawing | Freehand canvas, 16 colours, 5 brush sizes, clear button |
| Communication | Socket.io (real-time WebSockets) |
| Persistence | In-memory only — no database |

---

## Files Changed or Created

### New Files

| File | Purpose |
|---|---|
| `backend/src/data/words.js` | Word list (~130 words across animals, food, objects, nature, vehicles, buildings, activities, misc) |
| `backend/src/websockets/gameServer.js` | All game logic: room management, turn rotation, timer, scoring, socket events |
| `frontend/src/Components/game/GameCanvas.jsx` | HTML5 canvas component with drawing tools and real-time stroke sync |
| `frontend/src/Pages/GamePage.jsx` | Main game UI — manages all phases (home, lobby, drawing, between, ended) |

### Modified Files

| File | Change |
|---|---|
| `backend/src/websockets/socketServer.js` | Added `setupGameHandlers(io, socket)` call inside the connection handler |
| `frontend/src/App.jsx` | Added `<Route path="game" element={<GamePage />} />` inside protected routes |
| `frontend/src/Pages/Layout.jsx` | Added `"/game": "GAME"` to the page title map |
| `frontend/src/Components/common/NavBar.jsx` | Added GAME link with `Gamepad2` icon |
| `frontend/vite.config.js` | Added `/socket.io` proxy with `ws: true` so WebSockets work in local dev |

---

## How It Works — Backend

### In-Memory State (`gameServer.js`)

All room data lives in a plain JavaScript object called `rooms`. There is no database involved — if the server restarts, all active rooms disappear.

Each room object looks like this:

```js
{
  code: "XK92BT",          // 6-char join code
  hostId: "user-uuid",     // who can start the game
  players: [               // list of connected players
    {
      socketId: "...",
      userId: "...",
      username: "Alice",
      score: 0,
    }
  ],
  phase: "lobby",          // lobby | drawing | between | ended
  currentWord: "elephant", // the word being drawn this round
  currentDrawerIndex: 0,   // index into players[] for who draws
  round: 1,                // current round number
  maxRounds: 3,
  timeLeft: 60,            // seconds remaining this turn
  timerInterval: null,     // setInterval handle
  betweenTimeout: null,    // setTimeout handle (pause between rounds)
  guessedPlayerIds: Set,   // which players guessed correctly this round
  canvas: [],              // stored strokes for late-joiners to replay
}
```

### Room Lifecycle

```
game:create  →  lobby phase (host joins)
game:join    →  more players join lobby
game:start   →  host triggers first round
  └─ startRound() → phase = 'drawing', word picked, 60s timer starts
      └─ on time up OR all guessed → endRound()
          └─ phase = 'between' (4s pause)
              └─ advance drawer index, check if game over
                  ├─ more rounds → startRound() again
                  └─ done → phase = 'ended'
```

### Privacy: What Each Player Sees

The `roomView(room, forUserId)` function builds a tailored snapshot for each player:
- **Drawer** sees the actual word
- **Guessers** see only the word's letter count as blank underscores
- **Between/ended phases** — everyone sees the word

The server calls `broadcast(io, room)` which loops through every player and sends them their personalised snapshot individually (not a single broadcast to the whole room).

### Timer

The server runs the countdown with `setInterval` every 1000ms. This is authoritative — clients cannot manipulate it. Each tick emits a `game:timer` event to all players. When `timeLeft` reaches 0, `endRound()` is called server-side.

### What Happens When a Player Leaves

- If the room becomes empty → room is deleted from memory
- If the host leaves → host role transfers to the next player
- If the current drawer leaves mid-round → round ends immediately, next player draws
- If fewer than 2 players remain → game ends

---

## How It Works — Frontend

### GamePage.jsx — Phase Machine

`GamePage` manages 5 UI phases using a single `phase` state variable:

| Phase | What the user sees |
|---|---|
| `home` | Create room button + join code input |
| `lobby` | Room code display, player list, start button (host only) |
| `drawing` | Canvas + scoreboard + guess chat + timer |
| `between` | Same layout but canvas is frozen, word is revealed, "NEXT ROUND..." shown |
| `ended` | Final scoreboard with medal rankings |

The phase is always driven by the server — when the backend sends a `game:state` event, the frontend updates `phase` to match `state.phase`. The frontend never changes phase on its own.

### Socket Connection

`GamePage` creates its own Socket.io connection separate from the notification socket used elsewhere in the app. This keeps game logic isolated.

```js
const socket = io(import.meta.env.VITE_API_BASE_URL || "", {
  auth: { token: session.access_token },  // Supabase JWT for authentication
  transports: ["websocket", "polling"],
});
```

The socket is stored in a `useRef` so it persists across renders without triggering re-renders. It disconnects automatically when the component unmounts.

### GameCanvas.jsx — Drawing Surface

The canvas is a standard HTML5 `<canvas>` element (600×420px, scales down on mobile).

**For the drawer:**
- Mouse and touch events are listened to
- On each event, a stroke object is created and emitted via `game:draw`
- The stroke is also applied locally immediately (no waiting for server echo)

**For viewers:**
- Canvas is read-only (`cursor: default`, events ignored)
- Incoming strokes from `externalStrokes` prop are replayed on the canvas

**Coordinate normalisation:**
All x/y positions are divided by canvas width/height before sending:
```js
x: (clientX - rect.left) / rect.width,  // always 0.0–1.0
y: (clientY - rect.top)  / rect.height, // always 0.0–1.0
```
When rendering incoming strokes, they are multiplied back by the canvas dimensions. This means a stroke drawn on a 1920px wide screen looks correct on a 400px wide screen.

**Stroke format:**
```js
{ type: "start", x: 0.3, y: 0.5, color: "#e63946", size: 8 }
{ type: "move",  x: 0.31, y: 0.52 }
{ type: "end" }
{ type: "clear" }  // clear whole canvas
```

---

## Socket Events Reference

### Client → Server (emitted by frontend)

| Event | Payload | Description |
|---|---|---|
| `game:create` | `{ username }` | Create a new room. Callback returns `{ ok, code, state }` |
| `game:join` | `{ code, username }` | Join existing room by code. Callback returns `{ ok, state }` |
| `game:start` | `{ maxRounds }` | Host starts the game |
| `game:draw` | `{ type, x, y, color, size }` | Drawer sends a stroke segment |
| `game:guess` | `{ guess }` | Guesser submits a word guess |
| `game:leave` | — | Player voluntarily leaves the room |

### Server → Client (listened to by frontend)

| Event | Payload | Description |
|---|---|---|
| `game:state` | Full room snapshot (see below) | Sent on any state change (join, score, phase change) |
| `game:draw` | Stroke object | Relay of drawer's stroke to all other players |
| `game:canvas-clear` | — | Tells all clients to clear the canvas (new round) |
| `game:guess` | `{ userId, username, guess, correct }` | Broadcast of a guess attempt to all players |
| `game:timer` | `{ timeLeft }` | Server countdown tick every second |

### Room State Snapshot

```js
{
  code: "XK92BT",
  phase: "drawing",       // lobby | drawing | between | ended
  round: 1,
  maxRounds: 3,
  timeLeft: 42,
  word: "elephant",       // null for guessers during drawing phase
  wordLength: 8,          // always present so guessers can show blanks
  isDrawer: false,        // true only for the drawing player
  hostId: "user-uuid",
  players: [
    {
      userId: "...",
      username: "Alice",
      score: 150,
      isDrawer: true,
      guessed: false,
    }
  ]
}
```

---

## Scoring System

| Action | Points Earned |
|---|---|
| Correct guess | `max(50, timeLeft × 5)` — faster = more points |
| Drawer (per correct guess by others) | +20 pts per guesser who got it right |

Examples:
- Guess at 55s left → `max(50, 275)` = **275 pts**
- Guess at 8s left → `max(50, 40)` = **50 pts** (minimum floor)
- Drawer with 3 correct guessers → **+60 pts**

Scores are accumulated across all rounds. Final scoreboard is sorted highest to lowest.

---

## Known Limitations (MVP)

- **No persistence** — rooms are lost if the server restarts or crashes
- **No rejoin** — if you refresh mid-game, you lose your place (you'd need to join again with the code, which only works in lobby phase)
- **No room list** — you must share the code manually (copy button provided)
- **No custom word lists** — word list is hardcoded in `backend/src/data/words.js`
- **No spectator mode** — can only join in the lobby phase
- **3 rounds hardcoded in UI** — `maxRounds` is passed as 3 from the Start button (server supports any value)
- **Word display for drawer shows full word** — no blank-fill hint for drawer

---

## Future Improvements

- Persistent rooms with database storage
- Custom word lists per room
- Configurable round count and timer from the lobby UI
- Rejoin support for disconnected players
- Spectator mode
- Drawing history replay for late joiners (strokes are already stored server-side in `room.canvas`, just not sent on join yet)
- Hint reveals (expose one letter every 15s)
- Prevent same word from being picked twice in a game
