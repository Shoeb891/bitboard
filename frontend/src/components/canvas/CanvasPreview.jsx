// CanvasPreview — displays a read-only thumbnail of a bitmap as an <img>.
//
// Props:
//   bitmap   — { width, height, pixels, scale } — the bitmap to render
//   palette  — colour palette for full-colour bitmaps (defaults to DEFAULT_PALETTE)
//   maxWidth — CSS max-width applied to the <img> (default 200px)
//   style    — additional inline styles merged onto the <img>
//
// Why an <img> instead of a <canvas>?
//   <img> elements are much cheaper to display in a grid (like PostGrid) because
//   the browser caches them and doesn't need to run canvas drawing commands for
//   every thumbnail. bitmapToDataURL() renders to an offscreen canvas once and
//   returns a data URL, which the <img> src displays.
//
// useMemo ensures we only re-render the offscreen canvas when the bitmap actually
// changes — not on every parent re-render.
import { useMemo } from "react";
import { bitmapToDataURL } from "../../utils/bitmap";
import { DEFAULT_PALETTE } from "../../utils/palette";

export default function CanvasPreview({ bitmap, palette = DEFAULT_PALETTE, maxWidth = 200, style = {} }) {
  // Render the bitmap to a data URL only when the bitmap changes
  const src = useMemo(() => {
    if (!bitmap?.pixels?.length) return null;
    return bitmapToDataURL(bitmap, palette);
  }, [bitmap, palette]);

  // Return nothing if there's no bitmap yet (e.g. canvas is still blank)
  if (!src) return null;

  return (
    <img
      src={src}
      alt="bitmap preview"
      style={{
        maxWidth,
        display: "block",
        imageRendering: "pixelated", // prevents blurry upscaling in the browser
        border: "1px solid rgba(0,0,0,0.1)",
        ...style,
      }}
    />
  );
}
