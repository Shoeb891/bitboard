// GameCanvas — freehand drawing surface for the Skribbl-style game.
//
// Props:
//   isDrawer   {boolean}  — true means this player controls the brush
//   onStroke   {function} — called with stroke data when isDrawer is true
//   externalStrokes {array} — strokes received from the server (for viewers)
//   clearSignal {number}  — increment to wipe the canvas (new round)
//
// Coordinate system: all x/y values are normalised to [0, 1] before being
// emitted so they render correctly on any screen size.  Incoming strokes
// are scaled back to the canvas's actual pixel dimensions on render.

import { useRef, useEffect, useCallback } from "react";

const COLORS = [
  "#1a1a1a", "#e63946", "#f4a261", "#f9c74f", "#43aa8b",
  "#4361ee", "#9b5de5", "#f15bb5", "#ffffff", "#adb5bd",
  "#6d4c41", "#00b4d8", "#90e0ef", "#b5e48c", "#ffd6ff",
  "#ffb3c6",
];
const SIZES = [2, 4, 8, 14, 22];

export default function GameCanvas({ isDrawer, onStroke, externalStrokes, clearSignal }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const color = useRef("#1a1a1a");
  const size = useRef(4);
  const colorStateRef = useRef("#1a1a1a"); // for re-render without state
  const sizeStateRef = useRef(4);

  // ── Internal draw helpers ────────────────────────────────────────────────

  function getCtx() {
    return canvasRef.current?.getContext("2d");
  }

  function applyStroke(ctx, stroke, canvasW, canvasH) {
    if (stroke.type === "clear") {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);
      return;
    }

    const px = stroke.x * canvasW;
    const py = stroke.y * canvasH;

    if (stroke.type === "start") {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.strokeStyle = stroke.color || "#1a1a1a";
      ctx.lineWidth = stroke.size || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else if (stroke.type === "move") {
      ctx.lineTo(px, py);
      ctx.stroke();
    } else if (stroke.type === "end") {
      ctx.closePath();
    }
  }

  // ── Clear canvas when clearSignal changes ─────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [clearSignal]);

  // ── Replay incoming strokes from other players ─────────────────────────

  useEffect(() => {
    if (!externalStrokes || externalStrokes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const lastStroke = externalStrokes[externalStrokes.length - 1];
    applyStroke(ctx, lastStroke, canvas.width, canvas.height);
  }, [externalStrokes]);

  // ── Mouse / touch event handlers (drawer only) ───────────────────────────

  function normalise(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  const emitStroke = useCallback(
    (stroke) => {
      if (onStroke) onStroke(stroke);
    },
    [onStroke]
  );

  function handleMouseDown(e) {
    if (!isDrawer) return;
    drawing.current = true;
    const canvas = canvasRef.current;
    const { x, y } = normalise(canvas, e.clientX, e.clientY);
    const stroke = { type: "start", x, y, color: color.current, size: size.current };
    const ctx = getCtx();
    applyStroke(ctx, stroke, canvas.width, canvas.height);
    emitStroke(stroke);
  }

  function handleMouseMove(e) {
    if (!isDrawer || !drawing.current) return;
    const canvas = canvasRef.current;
    const { x, y } = normalise(canvas, e.clientX, e.clientY);
    const stroke = { type: "move", x, y };
    const ctx = getCtx();
    applyStroke(ctx, stroke, canvas.width, canvas.height);
    emitStroke(stroke);
  }

  function handleMouseUp() {
    if (!isDrawer || !drawing.current) return;
    drawing.current = false;
    const stroke = { type: "end" };
    emitStroke(stroke);
  }

  function handleTouchStart(e) {
    e.preventDefault();
    handleMouseDown(e.touches[0]);
  }
  function handleTouchMove(e) {
    e.preventDefault();
    handleMouseMove(e.touches[0]);
  }
  function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp();
  }

  function handleClear() {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    emitStroke({ type: "clear" });
  }

  // ── Toolbar colour/size pickers ──────────────────────────────────────────
  // These mutate refs rather than state to avoid re-renders mid-stroke.

  function pickColor(c) {
    color.current = c;
    colorStateRef.current = c;
    // Force a re-render of the toolbar by triggering a harmless state change
    // via a data-attribute on the canvas wrapper
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) wrapper.dataset.color = c;
  }

  function pickSize(s) {
    size.current = s;
    sizeStateRef.current = s;
    const wrapper = canvasRef.current?.parentElement;
    if (wrapper) wrapper.dataset.size = s;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={420}
        style={{
          border: "var(--border)",
          background: "#fff",
          cursor: isDrawer ? "crosshair" : "default",
          touchAction: "none",
          maxWidth: "100%",
          display: "block",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Toolbar — shown to drawer only */}
      {isDrawer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 600 }}>
          {/* Colour swatches */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  background: c,
                  border: color.current === c ? "3px solid var(--black)" : "2px solid #aaa",
                  cursor: "pointer",
                  padding: 0,
                  borderRadius: 2,
                }}
              />
            ))}
          </div>

          {/* Brush sizes + Clear button */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => pickSize(s)}
                title={`Size ${s}`}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: size.current === s ? "2px solid var(--black)" : "var(--border)",
                  background: "#fff",
                  cursor: "pointer",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: Math.min(s, 20),
                    height: Math.min(s, 20),
                    borderRadius: "50%",
                    background: "#1a1a1a",
                  }}
                />
              </button>
            ))}
            <button
              onClick={handleClear}
              style={{
                marginLeft: "auto",
                padding: "4px 12px",
                border: "var(--border)",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "var(--fb)",
                fontSize: 14,
              }}
            >
              CLEAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
