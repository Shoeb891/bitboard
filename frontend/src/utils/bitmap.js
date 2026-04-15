// Pixel generators (mock-post patterns) and canvas/data-URL rendering helpers.
import { DEFAULT_PALETTE } from "../Pages/DrawingCanvas";

// ─── PIXEL GENERATORS ────────────────────────────────────────────────────────
// Each returns a flat number[] of length width*height.
// Values are 0 (empty) or 1 (filled) — binary monochrome for mock posts.

// Zig-zag wave: linear ramp up then back down, traced as a 2-pixel-thick band.
export function genWave(w, h) {
  const px = new Array(w * h).fill(0);
  const period = w / 2.5;
  for (let x = 0; x < w; x++) {
    const t = (x % period) / period;
    const raw = t < 0.5 ? t * 2 * (h - 3) : (1 - t) * 2 * (h - 3);
    const y = Math.max(0, Math.min(h - 2, Math.round(raw)));
    px[y * w + x] = 1;
    px[(y + 1) * w + x] = 1;
  }
  return px;
}

// Vertical barcode: alternating filled/empty columns of varying widths.
export function genBars(w, h) {
  const px = new Array(w * h).fill(0);
  const pattern = [3, 1, 3, 1, 2, 1, 3, 1, 1, 1];
  let x = 0, i = 0;
  while (x < w) {
    const bw = pattern[i % pattern.length];
    if (i % 2 === 0) {
      for (let bx = 0; bx < bw && x + bx < w; bx++)
        for (let y = 0; y < h; y++)
          px[y * w + (x + bx)] = 1;
    }
    x += bw; i++;
  }
  return px;
}

// Two concentric diamond outlines (Manhattan distance to centre).
export function genDiamond(w, h) {
  const px = new Array(w * h).fill(0);
  const cx = w / 2 - 0.5, cy = h / 2 - 0.5;
  const r1 = Math.min(cx, cy) - 1;
  const r2 = r1 - 5;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (Math.round(d) === Math.round(r1) || (r2 > 0 && Math.round(d) === Math.round(r2)))
        px[y * w + x] = 1;
    }
  return px;
}

// Sparse grid: fills every `step`-th row and column.
export function genGridPattern(w, h) {
  const px = new Array(w * h).fill(0);
  const step = 6;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (x % step === 0 || y % step === 0) px[y * w + x] = 1;
  return px;
}

// Random speckle. `density` is the probability each cell is filled.
export function genNoise(w, h, density = 0.18) {
  return Array.from({ length: w * h }, () => (Math.random() < density ? 1 : 0));
}

// Concentric square rings every 4 steps out from the centre (Chebyshev distance).
export function genPulse(w, h) {
  const px = new Array(w * h).fill(0);
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d % 4 === 0) px[y * w + x] = 1;
    }
  return px;
}

// Classic chessboard pattern.
export function genCheckers(w, h) {
  return Array.from({ length: w * h }, (_, i) => {
    const x = i % w, y = Math.floor(i / w);
    return (x + y) % 2 === 0 ? 1 : 0;
  });
}

// Thick plus / cross through the middle.
export function genCross(w, h) {
  const px = new Array(w * h).fill(0);
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  const thick = 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (Math.abs(x - cx) <= thick || Math.abs(y - cy) <= thick)
        px[y * w + x] = 1;
  return px;
}

// ─── CANVAS RENDERER ─────────────────────────────────────────────────────────

/**
 * Render a bitmap into an HTML canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ width, height, pixels, scale }} bitmap
 * @param {string[]} [palette]  - colour palette; defaults to DEFAULT_PALETTE.
 *   If pixels[i] is 0 or 1 (binary mock data), renders as white/near-black.
 *   If pixels[i] > 1, uses palette[pixels[i]] for full colour output.
 */
export function renderBitmapToCanvas(canvas, bitmap, palette = DEFAULT_PALETTE) {
  const { width: w, height: h, pixels, scale: s = 7 } = bitmap;
  const ctx = canvas.getContext("2d");

  canvas.width  = w * s;
  canvas.height = h * s;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pixels — handle binary (0/1) and palette-index arrays
  const isBinary = pixels.every(v => v === 0 || v === 1);
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    if (!v) continue;
    ctx.fillStyle = isBinary ? "#1a1a1a" : (palette[v] ?? "#1a1a1a");
    const x = i % w;
    const y = Math.floor(i / w);
    ctx.fillRect(x * s, y * s, s, s);
  }

  // Subtle grid overlay
  ctx.strokeStyle = "rgba(210,210,210,0.6)";
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= w; x++) {
    ctx.beginPath();
    ctx.moveTo(x * s, 0);
    ctx.lineTo(x * s, h * s);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * s);
    ctx.lineTo(w * s, y * s);
    ctx.stroke();
  }
}

/**
 * Render a bitmap to an offscreen canvas and return a data URL.
 * Useful for <img> thumbnails (PostGrid, CanvasPreview).
 */
export function bitmapToDataURL(bitmap, palette = DEFAULT_PALETTE) {
  const offscreen = document.createElement("canvas");
  renderBitmapToCanvas(offscreen, bitmap, palette);
  return offscreen.toDataURL();
}

/**
 * Compute the integer render scale so the bitmap fits inside maxW × maxH.
 */
export function scaleBitmapForDisplay(width, height, maxW, maxH) {
  return Math.max(1, Math.floor(Math.min(maxW / width, maxH / height)));
}
