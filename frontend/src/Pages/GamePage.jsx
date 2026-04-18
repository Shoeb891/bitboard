// GamePage — Skribbl-style drawing and guessing game.
//
// Phases managed by this component:
//   'home'    → create or join a room
//   'lobby'   → waiting room; host can start once ≥2 players present
//   'drawing' → one player draws, others guess; timer counts down
//   'between' → brief pause between rounds showing the correct word
//   'ended'   → final scoreboard
//
// The game uses the existing Socket.io connection (auth via Supabase token).
// A separate socket instance is created for the game so it doesn't interfere
// with the notification socket managed by useWebSocket in Layout.

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuthContext } from "../context/AuthContext";
import GameCanvas from "../Components/game/GameCanvas";
import { Gamepad2, Copy, CheckCheck, Trophy, Clock } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function GamePage() {
  const { session, user } = useAuthContext();

  // ── Socket ────────────────────────────────────────────────────────────────
  const socketRef = useRef(null);

  // ── UI phase: 'home' | 'lobby' | 'drawing' | 'between' | 'ended' ─────────
  const [phase, setPhase] = useState("home");

  // ── Room state from server ────────────────────────────────────────────────
  const [roomState, setRoomState] = useState(null);

  // ── Chat / guess messages ─────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // ── Timer (kept separately for smooth countdown without full re-renders) ──
  const [timeLeft, setTimeLeft] = useState(60);

  // ── Drawing strokes received from server ──────────────────────────────────
  const [externalStrokes, setExternalStrokes] = useState([]);
  const [clearSignal, setClearSignal] = useState(0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState("");
  const [guessText, setGuessText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Connect socket on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!session?.access_token) return;

    const socket = io(SOCKET_URL, {
      auth: { token: session.access_token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // Full room state update (on join, start, score change, etc.)
    socket.on("game:state", (state) => {
      setRoomState(state);
      setPhase(state.phase);
      if (state.timeLeft !== undefined) setTimeLeft(state.timeLeft);
    });

    // Stroke received from drawer
    socket.on("game:draw", (stroke) => {
      setExternalStrokes((prev) => [...prev, stroke]);
    });

    // New round → clear canvas
    socket.on("game:canvas-clear", () => {
      setExternalStrokes([]);
      setClearSignal((n) => n + 1);
      setMessages([]);
    });

    // Guess message (correct or not) from any player
    socket.on("game:guess", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Timer tick
    socket.on("game:timer", ({ timeLeft: t }) => {
      setTimeLeft(t);
    });

    socket.on("connect_error", (err) => {
      console.warn("Game socket error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.access_token]);

  // ── Auto-scroll guess list ────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function createRoom() {
    const socket = socketRef.current;
    if (!socket) return;
    setError("");
    socket.emit("game:create", { username: user?.username || "Player" }, (res) => {
      if (!res.ok) return setError(res.error);
      setRoomState(res.state);
      setPhase("lobby");
    });
  }

  function joinRoom() {
    const socket = socketRef.current;
    if (!socket || !joinCode.trim()) return;
    setError("");
    socket.emit(
      "game:join",
      { code: joinCode.trim().toUpperCase(), username: user?.username || "Player" },
      (res) => {
        if (!res.ok) return setError(res.error);
        setRoomState(res.state);
        setPhase("lobby");
      }
    );
  }

  function startGame() {
    socketRef.current?.emit("game:start", { maxRounds: 3 }, (res) => {
      if (res && !res.ok) setError(res.error);
    });
  }

  function leaveRoom() {
    socketRef.current?.emit("game:leave");
    setRoomState(null);
    setPhase("home");
    setMessages([]);
    setExternalStrokes([]);
    setJoinCode("");
    setError("");
  }

  const handleStroke = useCallback((stroke) => {
    socketRef.current?.emit("game:draw", stroke);
  }, []);

  function submitGuess(e) {
    e.preventDefault();
    if (!guessText.trim()) return;
    socketRef.current?.emit("game:guess", { guess: guessText }, () => {});
    setGuessText("");
  }

  function copyCode() {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const myUserId = user?.id;
  const isHost = roomState?.hostId === myUserId;
  const isDrawer = roomState?.isDrawer;

  function wordDisplay() {
    if (!roomState) return "";
    if (roomState.word) return roomState.word.toUpperCase();
    if (roomState.wordLength) {
      return Array.from({ length: roomState.wordLength }, () => "_").join(" ");
    }
    return "";
  }

  function sortedPlayers() {
    return [...(roomState?.players ?? [])].sort((a, b) => b.score - a.score);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Phase: HOME ──────────────────────────────────────────────────────────
  if (phase === "home") {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Gamepad2 size={20} />
          <span style={{ fontFamily: "var(--fp)", fontSize: 12 }}>DRAW &amp; GUESS</span>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 18, marginBottom: 16 }}>
            CREATE A ROOM
          </div>
          <p style={{ fontSize: 14, marginBottom: 16, color: "#555" }}>
            Start a new game and share the room code with friends.
          </p>
          <button
            className="bb-btn bb-btn-accent"
            onClick={createRoom}
            style={{ width: "100%" }}
          >
            CREATE ROOM
          </button>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 24 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 18, marginBottom: 16 }}>
            JOIN A ROOM
          </div>
          <input
            className="bb-input"
            placeholder="Enter room code (e.g. XK92BT)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            maxLength={6}
            style={{
              width: "100%",
              marginBottom: 12,
              padding: "8px 10px",
              border: "var(--border)",
              fontFamily: "var(--fb)",
              fontSize: 16,
              letterSpacing: 4,
              boxSizing: "border-box",
            }}
          />
          <button
            className="bb-btn"
            onClick={joinRoom}
            style={{ width: "100%" }}
          >
            JOIN
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#e63946", fontFamily: "var(--fb)", fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: LOBBY ─────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 10 }}>WAITING ROOM</span>
          <button onClick={leaveRoom} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 14, color: "#999" }}>
            LEAVE
          </button>
        </div>

        {/* Room code */}
        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 20, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 13, color: "#666", marginBottom: 4 }}>ROOM CODE</div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 20, letterSpacing: 6 }}>{roomState?.code}</div>
          </div>
          <button
            onClick={copyCode}
            title="Copy code"
            style={{ background: "none", border: "var(--border)", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--fb)", fontSize: 13 }}
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>

        {/* Player list */}
        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 14, marginBottom: 10 }}>
            PLAYERS ({roomState?.players?.length ?? 0}/8)
          </div>
          {roomState?.players?.map((p) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: "1px solid #eee",
                fontFamily: "var(--fb)",
                fontSize: 15,
              }}
            >
              {p.userId === roomState.hostId && (
                <span title="Host" style={{ fontSize: 11, background: "#7b2fbe", color: "#fff", padding: "1px 5px" }}>
                  HOST
                </span>
              )}
              {p.username}
              {p.userId === myUserId && (
                <span style={{ fontSize: 11, color: "#999" }}>(you)</span>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            className="bb-btn bb-btn-accent"
            onClick={startGame}
            disabled={(roomState?.players?.length ?? 0) < 2}
            style={{ width: "100%", opacity: (roomState?.players?.length ?? 0) < 2 ? 0.5 : 1 }}
          >
            {(roomState?.players?.length ?? 0) < 2 ? "WAITING FOR PLAYERS..." : "START GAME"}
          </button>
        ) : (
          <div style={{ textAlign: "center", fontFamily: "var(--fb)", fontSize: 14, color: "#666", padding: 16 }}>
            Waiting for host to start...
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, color: "#e63946", fontFamily: "var(--fb)", fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: DRAWING ────────────────────────────────────────────────────────
  if (phase === "drawing" || phase === "between") {
    const isBetween = phase === "between";

    return (
      <div style={{ padding: "16px 24px" }}>
        {/* Top bar: round info + word + timer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>
            ROUND {roomState?.round}/{roomState?.maxRounds}
          </span>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {isBetween ? (
              <span style={{ fontFamily: "var(--fb)", fontSize: 18, color: "#7b2fbe" }}>
                THE WORD WAS: {(roomState?.word || "").toUpperCase()}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--fp)", fontSize: 14, letterSpacing: 6 }}>
                {wordDisplay()}
              </span>
            )}
            {!isBetween && (
              <span style={{ fontFamily: "var(--fb)", fontSize: 13, color: "#666" }}>
                {isDrawer ? "YOU ARE DRAWING" : `${roomState?.players?.find(p => p.isDrawer)?.username || "?"} IS DRAWING`}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--fp)", fontSize: 11 }}>
            <Clock size={14} />
            {isBetween ? "NEXT ROUND..." : `${timeLeft}s`}
          </div>
        </div>

        {/* Main layout: canvas + side panel */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Canvas */}
          <div style={{ flex: "1 1 500px", minWidth: 0 }}>
            <GameCanvas
              isDrawer={isDrawer && !isBetween}
              onStroke={handleStroke}
              externalStrokes={externalStrokes}
              clearSignal={clearSignal}
            />
          </div>

          {/* Right panel: scores + guesses */}
          <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Scoreboard */}
            <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 12 }}>
              <div style={{ fontFamily: "var(--fp)", fontSize: 8, marginBottom: 8 }}>SCORES</div>
              {sortedPlayers().map((p) => (
                <div
                  key={p.userId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontFamily: "var(--fb)",
                    fontSize: 15,
                    color: p.guessed ? "#43aa8b" : "inherit",
                  }}
                >
                  <span>
                    {p.isDrawer ? "✏ " : ""}
                    {p.username}
                    {p.userId === myUserId ? " (you)" : ""}
                    {p.guessed ? " ✓" : ""}
                  </span>
                  <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>{p.score}</span>
                </div>
              ))}
            </div>

            {/* Guess chat */}
            <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 12, display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "var(--fp)", fontSize: 8, marginBottom: 8 }}>GUESSES</div>

              {/* Messages */}
              <div style={{ height: 200, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "var(--fb)",
                      fontSize: 14,
                      color: msg.correct ? "#43aa8b" : "#333",
                      background: msg.correct ? "#f0faf6" : "transparent",
                      padding: msg.correct ? "2px 4px" : 0,
                    }}
                  >
                    <strong>{msg.username}:</strong>{" "}
                    {msg.correct ? `✓ ${msg.guess}` : msg.guess}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Guess input — hidden for drawer and during between phase */}
              {!isDrawer && !isBetween && (
                <form onSubmit={submitGuess} style={{ display: "flex", gap: 4 }}>
                  <input
                    value={guessText}
                    onChange={(e) => setGuessText(e.target.value)}
                    placeholder="Type guess..."
                    autoComplete="off"
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      border: "var(--border)",
                      fontFamily: "var(--fb)",
                      fontSize: 14,
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="submit"
                    className="bb-btn"
                    style={{ padding: "4px 8px", fontSize: 13 }}
                  >
                    GO
                  </button>
                </form>
              )}

              {isDrawer && !isBetween && (
                <div style={{ fontFamily: "var(--fb)", fontSize: 13, color: "#999", textAlign: "center" }}>
                  You are drawing — no guessing!
                </div>
              )}
            </div>

            <button
              onClick={leaveRoom}
              style={{ background: "none", border: "var(--border)", padding: "6px", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 13, color: "#999" }}
            >
              LEAVE GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: ENDED ─────────────────────────────────────────────────────────
  if (phase === "ended") {
    const players = sortedPlayers();
    const winner = players[0];

    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Trophy size={20} />
          <span style={{ fontFamily: "var(--fp)", fontSize: 12 }}>GAME OVER</span>
        </div>

        {winner && (
          <div style={{ textAlign: "center", marginBottom: 24, padding: 20, border: "var(--border)", background: "#fff" }}>
            <div style={{ fontFamily: "var(--fp)", fontSize: 10, color: "#7b2fbe", marginBottom: 8 }}>WINNER</div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 28 }}>{winner.username}</div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 14, color: "#43aa8b" }}>{winner.score} pts</div>
          </div>
        )}

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--fp)", fontSize: 9, marginBottom: 12 }}>FINAL SCORES</div>
          {players.map((p, idx) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
                fontFamily: "var(--fb)",
                fontSize: 17,
              }}
            >
              <span>
                {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `}
                {p.username}
                {p.userId === myUserId ? " (you)" : ""}
              </span>
              <span style={{ fontFamily: "var(--fp)", fontSize: 10 }}>{p.score} pts</span>
            </div>
          ))}
        </div>

        <button
          className="bb-btn bb-btn-accent"
          onClick={leaveRoom}
          style={{ width: "100%" }}
        >
          BACK TO HOME
        </button>
      </div>
    );
  }

  return null;
}
