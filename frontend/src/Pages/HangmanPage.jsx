// HangmanPage — Multiplayer Hangman game.
//
// Phases:
//   'home'    → create or join a room
//   'lobby'   → waiting room; host starts once ≥2 players
//   'setting' → current setter types a secret word; others wait
//   'guessing'→ everyone sees the board and guesses letters (setter watches)
//   'between' → 4s pause revealing the word and result
//   'ended'   → final scoreboard

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuthContext } from "../context/AuthContext";
import HangmanDrawing from "../Components/game/HangmanDrawing";
import { Puzzle, Copy, CheckCheck, Trophy } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

export default function HangmanPage() {
  const { session, user } = useAuthContext();
  const socketRef = useRef(null);

  const [phase, setPhase] = useState("home");
  const [roomState, setRoomState] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.access_token) return;

    const socket = io(SOCKET_URL, {
      auth: { token: session.access_token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("hangman:state", (state) => {
      setRoomState(state);
      setPhase(state.phase);
    });

    socket.on("connect_error", (err) => {
      console.warn("Hangman socket error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.access_token]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function createRoom() {
    const socket = socketRef.current;
    if (!socket) return;
    setError("");
    socket.emit("hangman:create", { username: user?.username || "Player" }, (res) => {
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
      "hangman:join",
      { code: joinCode.trim().toUpperCase(), username: user?.username || "Player" },
      (res) => {
        if (!res.ok) return setError(res.error);
        setRoomState(res.state);
        setPhase("lobby");
      }
    );
  }

  function startGame() {
    socketRef.current?.emit("hangman:start", { maxRounds: 3 }, (res) => {
      if (res && !res.ok) setError(res.error);
    });
  }

  function submitWord(e) {
    e.preventDefault();
    const word = wordInput.trim();
    if (!word) return;
    setError("");
    socketRef.current?.emit("hangman:set-word", { word }, (res) => {
      if (res && !res.ok) setError(res.error);
      else setWordInput("");
    });
  }

  function guessLetter(letter) {
    socketRef.current?.emit("hangman:guess", { letter });
  }

  function leaveRoom() {
    socketRef.current?.emit("hangman:leave");
    setRoomState(null);
    setPhase("home");
    setJoinCode("");
    setWordInput("");
    setError("");
  }

  function copyCode() {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const myUserId = user?.id;
  const isHost = roomState?.hostId === myUserId;
  const isSetter = roomState?.isSetter;
  const guessedSet = new Set(roomState?.guessedLetters || []);
  const wrongCount = roomState?.wrongGuesses?.length || 0;

  function sortedPlayers() {
    return [...(roomState?.players ?? [])].sort((a, b) => b.score - a.score);
  }

  // ── Phase: HOME ───────────────────────────────────────────────────────────
  if (phase === "home") {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Puzzle size={20} />
          <span style={{ fontFamily: "var(--fp)", fontSize: 12 }}>HANGMAN</span>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 18, marginBottom: 12 }}>CREATE A ROOM</div>
          <p style={{ fontSize: 14, marginBottom: 16, color: "#555" }}>
            Start a new game. Players take turns picking a secret word for others to guess.
          </p>
          <button className="bb-btn bb-btn-accent" onClick={createRoom} style={{ width: "100%" }}>
            CREATE ROOM
          </button>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 24 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 18, marginBottom: 12 }}>JOIN A ROOM</div>
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
          <button className="bb-btn" onClick={joinRoom} style={{ width: "100%" }}>
            JOIN
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#e63946", fontFamily: "var(--fb)", fontSize: 14 }}>{error}</div>
        )}
      </div>
    );
  }

  // ── Phase: LOBBY ──────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 10 }}>WAITING ROOM</span>
          <button onClick={leaveRoom} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 14, color: "#999" }}>
            LEAVE
          </button>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 20, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 13, color: "#666", marginBottom: 4 }}>ROOM CODE</div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 20, letterSpacing: 6 }}>{roomState?.code}</div>
          </div>
          <button
            onClick={copyCode}
            style={{ background: "none", border: "var(--border)", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--fb)", fontSize: 13 }}
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>

        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--fb)", fontSize: 14, marginBottom: 10 }}>
            PLAYERS ({roomState?.players?.length ?? 0}/8)
          </div>
          {roomState?.players?.map((p) => (
            <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #eee", fontFamily: "var(--fb)", fontSize: 15 }}>
              {p.userId === roomState.hostId && (
                <span style={{ fontSize: 11, background: "#7b2fbe", color: "#fff", padding: "1px 5px" }}>HOST</span>
              )}
              {p.username}
              {p.userId === myUserId && <span style={{ fontSize: 11, color: "#999" }}>(you)</span>}
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
          <div style={{ marginTop: 12, color: "#e63946", fontFamily: "var(--fb)", fontSize: 14 }}>{error}</div>
        )}
      </div>
    );
  }

  // ── Phase: SETTING ────────────────────────────────────────────────────────
  if (phase === "setting") {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>
            ROUND {roomState?.round}/{roomState?.maxRounds}
          </span>
          <button onClick={leaveRoom} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 13, color: "#999" }}>
            LEAVE
          </button>
        </div>

        {isSetter ? (
          <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 24 }}>
            <div style={{ fontFamily: "var(--fb)", fontSize: 18, marginBottom: 8 }}>YOUR TURN TO SET A WORD</div>
            <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
              Type any word or short phrase. Others will try to guess it letter by letter.
            </p>
            <form onSubmit={submitWord}>
              <input
                className="bb-input"
                placeholder="Type a secret word..."
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                autoFocus
                style={{ width: "100%", marginBottom: 12, padding: "8px 10px", border: "var(--border)", fontFamily: "var(--fb)", fontSize: 16, boxSizing: "border-box" }}
              />
              <button className="bb-btn bb-btn-accent" type="submit" style={{ width: "100%" }}>
                SET WORD
              </button>
            </form>
            {error && <div style={{ marginTop: 8, color: "#e63946", fontFamily: "var(--fb)", fontSize: 14 }}>{error}</div>}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontFamily: "var(--fp)", fontSize: 10, marginBottom: 16, color: "#666" }}>WAITING</div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 22 }}>
              {roomState?.setterName || "?"} is picking a word...
            </div>
          </div>
        )}

        {/* Scores while waiting */}
        <div className="bb-zone" style={{ border: "var(--border)", background: "#fff", padding: 12, marginTop: 16 }}>
          <div style={{ fontFamily: "var(--fp)", fontSize: 8, marginBottom: 8 }}>SCORES</div>
          {sortedPlayers().map((p) => (
            <div key={p.userId} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f0f0f0", fontFamily: "var(--fb)", fontSize: 14 }}>
              <span>{p.isSetter ? "✏ " : ""}{p.username}{p.userId === myUserId ? " (you)" : ""}</span>
              <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: GUESSING + BETWEEN ─────────────────────────────────────────────
  if (phase === "guessing" || phase === "between") {
    const isBetween = phase === "between";
    const progress = roomState?.wordProgress || [];

    return (
      <div style={{ padding: "16px 24px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>
            ROUND {roomState?.round}/{roomState?.maxRounds}
          </span>

          {isBetween ? (
            <span style={{ fontFamily: "var(--fb)", fontSize: 16, color: roomState?.lastRoundWon ? "#43aa8b" : "#e63946" }}>
              {roomState?.lastRoundWon ? "GUESSERS WIN!" : "SETTER WINS!"}
              {"  THE WORD: "}
              <span style={{ textTransform: "uppercase" }}>{roomState?.word}</span>
            </span>
          ) : (
            <span style={{ fontFamily: "var(--fb)", fontSize: 14, color: "#666" }}>
              {isSetter
                ? `Your word: "${roomState?.word?.toUpperCase()}" — watch others guess`
                : `${roomState?.setterName || "?"} set the word`}
            </span>
          )}

          <button onClick={leaveRoom} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 13, color: "#999" }}>
            LEAVE
          </button>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Left: hangman + word + letters */}
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            {/* Hangman figure */}
            <div style={{ border: "var(--border)", background: "#fff", padding: 16, marginBottom: 16, display: "inline-block" }}>
              <HangmanDrawing wrongCount={wrongCount} />
              <div style={{ textAlign: "center", fontFamily: "var(--fp)", fontSize: 9, marginTop: 4, color: wrongCount >= 6 ? "#e63946" : "#666" }}>
                {wrongCount}/6 WRONG
              </div>
            </div>

            {/* Word progress */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {progress.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    width: ch === " " ? 16 : 28,
                    borderBottom: ch === " " ? "none" : "3px solid var(--black, #1a1a1a)",
                    textAlign: "center",
                    fontFamily: "var(--fp)",
                    fontSize: 22,
                    textTransform: "uppercase",
                    lineHeight: "32px",
                    minHeight: 32,
                  }}
                >
                  {ch !== "_" ? ch : ""}
                </div>
              ))}
            </div>

            {/* Wrong letters */}
            {roomState?.wrongGuesses?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--fp)", fontSize: 8, color: "#e63946", marginRight: 8 }}>WRONG:</span>
                {roomState.wrongGuesses.map((l) => (
                  <span key={l} style={{ fontFamily: "var(--fp)", fontSize: 14, color: "#e63946", marginRight: 6, textTransform: "uppercase" }}>{l}</span>
                ))}
              </div>
            )}

            {/* Letter buttons — only for guessers during guessing phase */}
            {!isSetter && !isBetween && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ALPHABET.map((letter) => {
                  const used = guessedSet.has(letter);
                  const isWrong = roomState?.wrongGuesses?.includes(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => guessLetter(letter)}
                      disabled={used}
                      style={{
                        width: 34,
                        height: 34,
                        fontFamily: "var(--fp)",
                        fontSize: 13,
                        textTransform: "uppercase",
                        border: "var(--border)",
                        cursor: used ? "default" : "pointer",
                        background: used ? (isWrong ? "#ffeaea" : "#e8f8f0") : "#fff",
                        color: used ? (isWrong ? "#e63946" : "#43aa8b") : "inherit",
                        opacity: used ? 0.6 : 1,
                        fontWeight: used ? "bold" : "normal",
                      }}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            )}

            {isSetter && !isBetween && (
              <div style={{ fontFamily: "var(--fb)", fontSize: 14, color: "#999" }}>
                You set this word — sit back and watch!
              </div>
            )}
          </div>

          {/* Right: scores */}
          <div style={{ flex: "0 0 200px" }}>
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
                  }}
                >
                  <span>
                    {p.isSetter ? "✏ " : ""}
                    {p.username}
                    {p.userId === myUserId ? " (you)" : ""}
                  </span>
                  <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: ENDED ──────────────────────────────────────────────────────────
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

        <button className="bb-btn bb-btn-accent" onClick={leaveRoom} style={{ width: "100%" }}>
          BACK TO HOME
        </button>
      </div>
    );
  }

  return null;
}
