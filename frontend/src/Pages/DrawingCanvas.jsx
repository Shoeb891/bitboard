/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                  BITBOARD — DrawingCanvas.jsx                 ║
 * ║    Pixel bitmap editor · Nintendo DS PictureChat aesthetic    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   import DrawingCanvas, { DEFAULT_PALETTE, GRID_PRESETS } from './DrawingCanvas';
 *
 *   <DrawingCanvas
 *     width={32}
 *     height={32}
 *     palette={DEFAULT_PALETTE}
 *     onChange={({ width, height, pixels }) => console.log(pixels)}
 *   />
 *
 * For a full demo with preset switcher, import BitboardDemo:
 *   import { BitboardDemo } from './DrawingCanvas';
 */

import { useRef, useState, useEffect, useCallback, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PALETTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default 16-color palette.
 * Index 0 is always the background / eraser color (rendered as off-white).
 * Indices 1–15 are drawing colors.
 */
export const DEFAULT_PALETTE = [
  "#F8F9FA", // 0  — bg / transparent
  "#1A1A2E", // 1  — near-black   ← default draw color
  "#E63946", // 2  — red
  "#F4A261", // 3  — orange
  "#FFD166", // 4  — yellow
  "#2DC653", // 5  — green
  "#118AB2", // 6  — blue
  "#7B2FBE", // 7  — purple
  "#F72585", // 8  — hot-pink
  "#06D6A0", // 9  — mint
  "#8D6346", // 10 — brown
  "#9CA3AF", // 11 — gray
  "#FF6B6B", // 12 — salmon
  "#C4F135", // 13 — lime
  "#ADE8F4", // 14 — sky
  "#FFC8DD", // 15 — blush
];

// ─────────────────────────────────────────────────────────────────────────────
//  GRID PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Available canvas sizes.
 * Horizontal formats suit social banners / headers.
 * Vertical format suits portrait posts.
 *
 * Design rationale for a Twitter-inspired platform:
 *   square_sm  →  profile avatar / icon
 *   square_md  →  standard square post
 *   banner     →  header / cover art  (wide, 8:3 ratio)
 *   wide       →  landscape post      (12:5 ratio)
 *   portrait   →  vertical post       (2:3 ratio)
 */
export const GRID_PRESETS = {
  square_sm: { width: 32, height: 32, label: "32×32",      tag: "Avatar"   },
  square_md: { width: 48, height: 48, label: "48×48",      tag: "Post"     },
  banner:    { width: 64, height: 24, label: "64×24",      tag: "Banner"   },
  wide:      { width: 48, height: 20, label: "48×20",      tag: "Wide"     },
  portrait:  { width: 24, height: 36, label: "24×36",      tag: "Portrait" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TOOL = {
  BRUSH:  "brush",
  ERASER: "eraser",
  FILL:   "fill",
};

// Maps tool id → display label (intentionally terse / retro)
const TOOL_LABEL = {
  [TOOL.BRUSH]:  "PEN",
  [TOOL.ERASER]: "ERS",
  [TOOL.FILL]:   "FILL",
};

// Maps tool id → CSS cursor
const TOOL_CURSOR = {
  [TOOL.BRUSH]:  "crosshair",
  [TOOL.ERASER]: "cell",
  [TOOL.FILL]:   "cell",
};

// ─────────────────────────────────────────────────────────────────────────────
//  MATH / DRAWING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bresenham's line algorithm (generator).
 *
 * Yields every [col, row] grid cell along the line from (x0,y0) to (x1,y1).
 * Used to fill in pixels between the last mouse position and the current one,
 * so fast mouse moves don't leave gaps in strokes.
 *
 * Time: O(max(|dx|, |dy|))
 */
function* bresenham(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  for (;;) {
    yield [x0, y0];
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/**
 * Iterative flood fill (no recursion → no stack-overflow on large grids).
 * Mutates `pixels` in place.
 *
 * @param {Int32Array} pixels     - flat pixel color-index array
 * @param {number}     width      - grid width
 * @param {number}     height     - grid height
 * @param {number}     startX     - seed column
 * @param {number}     startY     - seed row
 * @param {number}     targetIdx  - color index to replace
 * @param {number}     fillIdx    - color index to fill with
 */
function floodFill(pixels, width, height, startX, startY, targetIdx, fillIdx) {
  if (targetIdx === fillIdx) return;

  const visited = new Uint8Array(width * height); // cheap O(1) visit check
  const stack   = [[startX, startY]];

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = y * width + x;
    if (visited[i] || pixels[i] !== targetIdx) continue;
    visited[i] = 1;
    pixels[i]  = fillIdx;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOW-LEVEL CANVAS RENDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paint one pixel cell onto the canvas context.
 * `cs` = cell size in CSS pixels.
 */
function renderCell(ctx, col, row, colorIdx, cs, palette) {
  ctx.fillStyle = palette[colorIdx] ?? palette[0];
  ctx.fillRect(col * cs, row * cs, cs, cs);
}

/**
 * Overlay a subtle grid on top of all pixels.
 * Called once after renderFull, or patched per-cell when showGrid is on.
 */
function renderGrid(ctx, w, h, cs) {
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x++) {
    ctx.moveTo(x * cs, 0);
    ctx.lineTo(x * cs, h * cs);
  }
  for (let y = 0; y <= h; y++) {
    ctx.moveTo(0,     y * cs);
    ctx.lineTo(w * cs, y * cs);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Full canvas repaint — used on init and after bulk operations (fill, clear).
 * For single-pixel updates, use renderCell + renderGrid patch (much faster).
 */
function renderFull(ctx, pixels, w, h, cs, palette, showGrid) {
  ctx.clearRect(0, 0, w * cs, h * cs);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      renderCell(ctx, col, row, pixels[row * w + col], cs, palette);
    }
  }
  if (showGrid) renderGrid(ctx, w, h, cs);
}

// ─────────────────────────────────────────────────────────────────────────────
//  DrawingCanvas COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DrawingCanvas — reusable Bitboard pixel editor.
 *
 * @param {object}   props
 * @param {number}   props.width     Grid columns           (default 32)
 * @param {number}   props.height    Grid rows              (default 32)
 * @param {string[]} props.palette   Array of CSS colors    (default DEFAULT_PALETTE)
 * @param {function} props.onChange  Called on stroke-end with { width, height, pixels: number[] }
 */
export default function DrawingCanvas({
  width   = 32,
  height  = 32,
  palette = DEFAULT_PALETTE,
  onChange,
}) {
  // ── Canvas & pixel buffer refs (mutations bypass React render) ────────────

  /** The <canvas> DOM element */
  const canvasRef = useRef(null);

  /** 2D rendering context (set once after mount) */
  const ctxRef = useRef(null);

  /**
   * Flat array of palette color indices — Int32Array for speed.
   * Length = width × height.  Index 0 = background.
   * This is the source of truth for the drawing; canvas mirrors it.
   */
  const pixelsRef = useRef(null);

  /** Whether the user is currently holding the mouse button down */
  const isDrawingRef = useRef(false);

  /**
   * The last grid cell touched during the current stroke.
   * Used by Bresenham to fill gaps on fast mouse moves.
   * Reset to null on each stroke start and on pointer-leave.
   */
  const lastCellRef = useRef(null);

  // Mirror showGrid in a ref so event-handler callbacks can read it
  // without needing to close over stale state.
  const showGridRef = useRef(true);

  // ── UI state ──────────────────────────────────────────────────────────────

  const [selectedColor, setSelectedColor] = useState(1);       // palette index
  const [selectedTool,  setSelectedTool]  = useState(TOOL.BRUSH);
  const [showGrid,      setShowGrid]      = useState(true);

  // Keep ref in sync so pointer callbacks always see current value
  showGridRef.current = showGrid;

  // ── Cell size (computed) ──────────────────────────────────────────────────

  /**
   * Derive cell size (CSS px per grid cell) so the canvas fits within
   * ~560 × 460 px. This keeps every preset reasonably sized.
   *
   * Examples at these targets:
   *   32×32  → 14 px/cell → 448×448 canvas
   *   64×24  → 10 px/cell → 640×240 canvas (capped at 560 wide → 8 px/cell)
   *   24×36  → 12 px/cell → 288×432 canvas
   */
  const cellSize = useMemo(() => {
    const maxW = 560, maxH = 460;
    return Math.max(4, Math.min(
      Math.floor(maxW / width),
      Math.floor(maxH / height),
    ));
  }, [width, height]);

  const canvasW = width  * cellSize; // CSS pixels
  const canvasH = height * cellSize;

  // ── Initialization & re-init on dimension/palette change ─────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    // Cap DPR at 2 to avoid massive textures on 3× screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Physical pixel dimensions (retina-aware)
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);          // all subsequent drawing uses CSS-pixel coords
    ctxRef.current = ctx;

    // Wipe pixel buffer on dimension change
    pixelsRef.current = new Int32Array(width * height); // 0 = bg
    renderFull(ctx, pixelsRef.current, width, height, cellSize, palette, showGridRef.current);
  }, [width, height, cellSize, palette]);

  // Re-draw when grid toggle changes (no dimension change, just visual)
  useEffect(() => {
    if (!ctxRef.current || !pixelsRef.current) return;
    renderFull(ctxRef.current, pixelsRef.current, width, height, cellSize, palette, showGrid);
  }, [showGrid, width, height, cellSize, palette]);

  // ── Coordinate mapping ────────────────────────────────────────────────────

  /**
   * Convert a pointer event into { col, row } grid coordinates.
   * Handles any canvas display size / DPR by reading getBoundingClientRect.
   */
  const getCell = useCallback((e) => {
    const rect   = canvasRef.current.getBoundingClientRect();
    const scaleX = width  / rect.width;   // CSS px → grid cols
    const scaleY = height / rect.height;  // CSS px → grid rows
    return {
      col: Math.floor((e.clientX - rect.left) * scaleX),
      row: Math.floor((e.clientY - rect.top)  * scaleY),
    };
  }, [width, height]);

  // ── Pixel painting ────────────────────────────────────────────────────────

  /**
   * Write a single pixel to the buffer and update just that canvas cell.
   * O(1) — far cheaper than a full redraw.
   * Returns false if cell was already that color (no-op).
   */
  const paintPixel = useCallback((col, row, colorIdx) => {
    if (col < 0 || col >= width || row < 0 || row >= height) return false;
    const i = row * width + col;
    if (pixelsRef.current[i] === colorIdx) return false; // skip unchanged

    pixelsRef.current[i] = colorIdx;

    const ctx = ctxRef.current;
    const cs  = cellSize;

    // 1. Repaint the cell background
    renderCell(ctx, col, row, colorIdx, cs, palette);

    // 2. Restore the grid lines around this cell (if grid is on)
    if (showGridRef.current) {
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth   = 0.5;
      // Inset by 0.25px so the stroke stays inside the cell bounds
      ctx.strokeRect(col * cs + 0.25, row * cs + 0.25, cs - 0.5, cs - 0.5);
      ctx.restore();
    }

    return true;
  }, [width, height, cellSize, palette]);

  /**
   * Paint a stroke from the previous pointer position to (col, row).
   * Interpolates with Bresenham so fast moves produce solid strokes.
   */
  const paintStroke = useCallback((col, row, colorIdx) => {
    const last = lastCellRef.current;
    if (last && (last.col !== col || last.row !== row)) {
      // Walk every cell on the line segment
      for (const [c, r] of bresenham(last.col, last.row, col, row)) {
        paintPixel(c, r, colorIdx);
      }
    } else {
      paintPixel(col, row, colorIdx);
    }
    lastCellRef.current = { col, row };
  }, [paintPixel]);

  /**
   * Snapshot the pixel buffer and fire onChange.
   * Called on pointer-up (end of stroke) or after bulk operations.
   * Array.from converts Int32Array → plain number[] for clean JSON serialization.
   */
  const emitChange = useCallback(() => {
    onChange?.({
      width,
      height,
      pixels: Array.from(pixelsRef.current),
    });
  }, [width, height, onChange]);

  // ── Pointer events ────────────────────────────────────────────────────────

  /** Resolve the color index for the current tool + selected color */
  const activeColorIdx = (tool) => tool === TOOL.ERASER ? 0 : selectedColor;

  const handlePointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return; // left-click only
    e.preventDefault();

    // Capture pointer so moves outside the canvas still register
    canvasRef.current?.setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    lastCellRef.current  = null; // fresh stroke — no previous cell

    const { col, row } = getCell(e);
    const colorIdx = activeColorIdx(selectedTool);

    // Flood fill is a one-shot action, not a drag operation
    if (selectedTool === TOOL.FILL) {
      const targetIdx = pixelsRef.current[row * width + col];
      floodFill(pixelsRef.current, width, height, col, row, targetIdx, colorIdx);
      renderFull(ctxRef.current, pixelsRef.current, width, height, cellSize, palette, showGridRef.current);
      emitChange();
      isDrawingRef.current = false;
      return;
    }

    paintStroke(col, row, colorIdx);
  }, [getCell, selectedTool, selectedColor, width, height, cellSize, palette, paintStroke, emitChange]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { col, row } = getCell(e);
    paintStroke(col, row, activeColorIdx(selectedTool));
  }, [getCell, selectedTool, selectedColor, paintStroke]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastCellRef.current  = null;
    emitChange();
  }, [emitChange]);

  /**
   * When the pointer leaves the canvas mid-stroke, clear lastCell.
   * This prevents a jump-line when the pointer re-enters from a different edge.
   */
  const handlePointerLeave = useCallback(() => {
    lastCellRef.current = null;
  }, []);

  // Global fallback: pointer released outside the canvas element
  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp]);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  /** Reset all pixels to background color */
  const clearCanvas = useCallback(() => {
    pixelsRef.current.fill(0);
    renderFull(ctxRef.current, pixelsRef.current, width, height, cellSize, palette, showGridRef.current);
    emitChange();
  }, [width, height, cellSize, palette, emitChange]);

  /**
   * Snapshot & export the current bitmap.
   * Returns { width, height, pixels: number[] }.
   * Also logs to console for easy debugging / copy-paste.
   */
  const exportBitmap = useCallback(() => {
    const data = { width, height, pixels: Array.from(pixelsRef.current) };
    console.log("[Bitboard] Exported bitmap →", JSON.stringify(data));
    return data;
  }, [width, height]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>

      {/* ── Drawing surface ──────────────────────────────────────────────── */}
      <div style={S.canvasFrame}>
        {/* Scanline overlay for retro CRT texture */}
        <div style={S.scanlines} aria-hidden="true" />

        <canvas
          ref={canvasRef}
          style={{
            ...S.canvas,
            width:  canvasW,
            height: canvasH,
            cursor: TOOL_CURSOR[selectedTool],
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="Pixel drawing canvas"
          role="img"
        />
      </div>

      {/* ── Toolbar row ──────────────────────────────────────────────────── */}
      <div style={S.toolbar}>

        {/* Tool buttons */}
        <div style={S.toolGroup}>
          {Object.values(TOOL).map((id) => (
            <button
              key={id}
              style={{
                ...S.toolBtn,
                ...(selectedTool === id ? S.toolBtnActive : {}),
              }}
              onClick={() => setSelectedTool(id)}
              title={id.charAt(0).toUpperCase() + id.slice(1)}
            >
              {TOOL_LABEL[id]}
            </button>
          ))}
        </div>

        <div style={S.divider} />

        {/* Grid toggle */}
        <button
          style={{
            ...S.iconBtn,
            ...(showGrid ? S.iconBtnActive : {}),
          }}
          onClick={() => setShowGrid((g) => !g)}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          ⊞
        </button>

        <div style={S.spacer} />

        {/* Clear */}
        <button
          style={{ ...S.actionBtn, ...S.clearBtn }}
          onClick={clearCanvas}
          title="Clear all pixels"
        >
          CLEAR
        </button>

        {/* Export */}
        <button
          style={{ ...S.actionBtn, ...S.exportBtn }}
          onClick={exportBitmap}
          title="Log bitmap to console"
        >
          EXPORT
        </button>
      </div>

      {/* ── Palette row ───────────────────────────────────────────────────── */}
      <div style={S.paletteRow}>
        <span style={S.paletteLabel}>PALETTE</span>

        <div style={S.swatchGrid}>
          {palette.map((color, i) => (
            <button
              key={i}
              style={{
                ...S.swatch,
                background: i === 0 ? undefined : color,
                // Index 0 renders as a checkerboard (transparent indicator)
                ...(i === 0 ? S.swatchTransparent : {}),
                ...(selectedColor === i ? S.swatchSelected : {}),
              }}
              onClick={() => {
                setSelectedColor(i);
                // Switch off eraser when picking a color
                if (selectedTool === TOOL.ERASER) setSelectedTool(TOOL.BRUSH);
              }}
              title={i === 0 ? "Background / Eraser" : `Color ${i}: ${color}`}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES — Nintendo DS PictureChat aesthetic
//  Rules: hard pixel-art borders · flat colors · monospace type · pastel chrome
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:           "#DDE4F0",  // soft blue-gray page background
  surface:      "#FFFFFF",
  border:       "#1A1A2E",  // near-black — all borders share this
  accent:       "#6B7FD4",  // periwinkle blue
  accentPale:   "#C5CCEF",
  mint:         "#B8F0C8",
  text:         "#1A1A2E",
  textMuted:    "#7B82A0",
  danger:       "#FFD6D6",
  dangerText:   "#C0392B",
  export:       "#1A1A2E",
};

/** Shared button base — monospace, no frills, hard borders */
const btnBase = {
  fontFamily:   "'Courier New', Courier, monospace",
  fontWeight:   700,
  letterSpacing: "0.06em",
  cursor:       "pointer",
  border:       `2px solid ${C.border}`,
  borderRadius: 6,
  padding:      0,
  lineHeight:   1,
  transition:   "transform 80ms, box-shadow 80ms",
  userSelect:   "none",
};

const S = {
  root: {
    display:        "inline-flex",
    flexDirection:  "column",
    gap:            10,
    background:     C.bg,
    padding:        14,
    borderRadius:   14,
    border:         `3px solid ${C.border}`,
    boxShadow:      `5px 5px 0 ${C.border}`,
    fontFamily:     "'Courier New', Courier, monospace",
    userSelect:     "none",
  },

  // ── Canvas frame ──────────────────────────────────────────────────────────

  canvasFrame: {
    position:     "relative",
    border:       `3px solid ${C.border}`,
    borderRadius: 6,
    overflow:     "hidden",
    lineHeight:   0,                              // kill inline gap below canvas
    boxShadow:    `inset 0 1px 0 rgba(255,255,255,0.6), 2px 2px 0 ${C.border}`,
    background:   "#F8F9FA",
  },

  /** Subtle horizontal scan-line texture — pure CSS, zero JS cost */
  scanlines: {
    position:        "absolute",
    inset:           0,
    backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.025) 1px, rgba(0,0,0,0.025) 2px)",
    pointerEvents:   "none",
    zIndex:          1,
  },

  canvas: {
    display:         "block",
    imageRendering:  "pixelated",   // keep pixels crisp at any DPR
    touchAction:     "none",        // prevent browser scroll while drawing
  },

  // ── Toolbar ───────────────────────────────────────────────────────────────

  toolbar: {
    display:      "flex",
    alignItems:   "center",
    gap:          6,
    background:   C.surface,
    borderRadius: 8,
    border:       `2px solid ${C.border}`,
    padding:      "7px 10px",
    boxShadow:    `2px 2px 0 ${C.border}`,
  },

  toolGroup: {
    display: "flex",
    gap:     4,
  },

  toolBtn: {
    ...btnBase,
    width:      44,
    height:     28,
    fontSize:   10,
    background: C.surface,
    color:      C.text,
    boxShadow:  `1px 1px 0 ${C.border}`,
  },

  toolBtnActive: {
    background:  C.accent,
    color:       "#fff",
    borderColor: C.accent,
    transform:   "translate(1px, 1px)",
    boxShadow:   "none",
  },

  iconBtn: {
    ...btnBase,
    width:      28,
    height:     28,
    fontSize:   16,
    background: C.surface,
    color:      C.text,
    boxShadow:  `1px 1px 0 ${C.border}`,
  },

  iconBtnActive: {
    background:  C.mint,
    transform:   "translate(1px, 1px)",
    boxShadow:   "none",
  },

  actionBtn: {
    ...btnBase,
    height:   28,
    padding:  "0 10px",
    fontSize: 10,
    boxShadow: `1px 1px 0 ${C.border}`,
  },

  clearBtn: {
    background: C.danger,
    color:      C.dangerText,
  },

  exportBtn: {
    background: C.export,
    color:      "#fff",
    borderColor: C.export,
  },

  divider: {
    width:      1,
    height:     20,
    background: C.border,
    opacity:    0.2,
    margin:     "0 2px",
  },

  spacer: { flex: 1 },

  // ── Palette ───────────────────────────────────────────────────────────────

  paletteRow: {
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    background:   C.surface,
    borderRadius: 8,
    border:       `2px solid ${C.border}`,
    padding:      "8px 12px",
    boxShadow:    `2px 2px 0 ${C.border}`,
  },

  paletteLabel: {
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: "0.12em",
    color:         C.textMuted,
    whiteSpace:    "nowrap",
  },

  swatchGrid: {
    display:   "flex",
    flexWrap:  "wrap",
    gap:       5,
    flex:      1,
  },

  swatch: {
    ...btnBase,
    width:        22,
    height:       22,
    borderRadius: "50%",
    flexShrink:   0,
    transition:   "transform 100ms, box-shadow 100ms",
  },

  swatchSelected: {
    transform:  "scale(1.3)",
    boxShadow:  `0 0 0 2px ${C.accent}, 0 0 0 4px ${C.border}`,
    zIndex:     1,
  },

  /** Checkerboard pattern for the "transparent / background" swatch */
  swatchTransparent: {
    backgroundImage:
      "linear-gradient(45deg, #ccc 25%, transparent 25%)," +
      "linear-gradient(-45deg, #ccc 25%, transparent 25%)," +
      "linear-gradient(45deg, transparent 75%, #ccc 75%)," +
      "linear-gradient(-45deg, transparent 75%, #ccc 75%)",
    backgroundSize:     "6px 6px",
    backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  DEMO APP  (named export — remove or tree-shake in production)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BitboardDemo — wraps DrawingCanvas with a preset selector and live data display.
 * Mount this at your dev entry point:
 *   import { BitboardDemo } from './DrawingCanvas';
 *   <BitboardDemo />
 */
export function BitboardDemo() {
  const [presetKey, setPresetKey] = useState("square_sm");
  const [lastExport, setLastExport] = useState(null);

  const preset = GRID_PRESETS[presetKey];

  const handleChange = useCallback((data) => {
    setLastExport(data);
  }, []);

  return (
    <div style={DS.page}>
      {/* ── Header ── */}
      <div style={DS.header}>
        <div style={DS.logo}>
          <span style={DS.logoBox}>B</span>
          <span style={DS.logoText}>it.board</span>
        </div>
        <p style={DS.tagline}>pixel art for the feed</p>
      </div>

      {/* ── Preset tabs ── */}
      <div style={DS.tabs}>
        {Object.entries(GRID_PRESETS).map(([key, p]) => (
          <button
            key={key}
            style={{
              ...DS.tab,
              ...(presetKey === key ? DS.tabActive : {}),
            }}
            onClick={() => setPresetKey(key)}
          >
            <span style={DS.tabTag}>{p.tag}</span>
            <span style={DS.tabSize}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* ── Canvas ── */}
      <DrawingCanvas
        width={preset.width}
        height={preset.height}
        palette={DEFAULT_PALETTE}
        onChange={handleChange}
      />

      {/* ── Live data readout ── */}
      {lastExport && (
        <div style={DS.dataBox}>
          <span style={DS.dataLabel}>BITMAP DATA</span>
          <div style={DS.dataMeta}>
            {lastExport.width} × {lastExport.height} · {lastExport.pixels.filter(Boolean).length} painted px
          </div>
          <div style={DS.dataPixels}>
            [{lastExport.pixels.slice(0, 48).join(", ")}{lastExport.pixels.length > 48 ? " …" : ""}]
          </div>
        </div>
      )}
    </div>
  );
}

// Demo styles
const DS = {
  page: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "flex-start",
    gap:            14,
    padding:        24,
    background:     "#D8E0F0",
    minHeight:      "100vh",
    fontFamily:     "'Courier New', Courier, monospace",
  },

  header: {
    display:      "flex",
    alignItems:   "baseline",
    gap:          14,
  },

  logo: {
    display:    "flex",
    alignItems: "baseline",
    gap:        4,
  },

  logoBox: {
    display:      "inline-block",
    width:        36,
    height:       36,
    lineHeight:   "36px",
    textAlign:    "center",
    border:       "3px solid #1A1A2E",
    fontFamily:   "'Courier New', Courier, monospace",
    fontWeight:   900,
    fontSize:     22,
    color:        "#1A1A2E",
    borderRadius: 4,
    boxShadow:    "2px 2px 0 #1A1A2E",
  },

  logoText: {
    fontSize:   26,
    fontWeight: 700,
    color:      "#1A1A2E",
    fontFamily: "Georgia, serif",
    fontStyle:  "italic",
    letterSpacing: "-0.02em",
  },

  tagline: {
    margin:        0,
    fontSize:      11,
    color:         "#7B82A0",
    letterSpacing: "0.08em",
  },

  tabs: {
    display:      "flex",
    gap:          6,
    flexWrap:     "wrap",
  },

  tab: {
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           2,
    padding:       "6px 12px",
    border:        "2px solid #1A1A2E",
    borderRadius:  8,
    background:    "#fff",
    cursor:        "pointer",
    boxShadow:     "2px 2px 0 #1A1A2E",
    transition:    "transform 80ms, box-shadow 80ms",
  },

  tabActive: {
    background:  "#6B7FD4",
    color:       "#fff",
    transform:   "translate(1px,1px)",
    boxShadow:   "none",
  },

  tabTag: {
    fontSize:      11,
    fontWeight:    700,
    letterSpacing: "0.06em",
    fontFamily:    "'Courier New', Courier, monospace",
  },

  tabSize: {
    fontSize:  9,
    opacity:   0.7,
    fontFamily:"'Courier New', Courier, monospace",
  },

  dataBox: {
    background:   "#fff",
    border:       "2px solid #1A1A2E",
    borderRadius: 8,
    padding:      "10px 14px",
    boxShadow:    "2px 2px 0 #1A1A2E",
    maxWidth:     560,
  },

  dataLabel: {
    display:       "block",
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: "0.12em",
    color:         "#7B82A0",
    marginBottom:  4,
  },

  dataMeta: {
    fontSize:     12,
    fontWeight:   700,
    color:        "#1A1A2E",
    marginBottom: 6,
  },

  dataPixels: {
    fontSize:     10,
    color:        "#7B82A0",
    wordBreak:    "break-all",
    lineHeight:   1.5,
    fontFamily:   "monospace",
  },
};
