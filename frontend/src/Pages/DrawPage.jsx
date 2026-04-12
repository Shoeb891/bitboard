// DrawPage — the full drawing and publishing flow.
//
// Layout (top to bottom):
//   1. ResolutionSelector — pick the canvas size/format
//   2. DrawingCanvas     — the actual pixel editor (from DrawingCanvas.jsx)
//   3. Action buttons    — PREVIEW / POST / CLEAR
//   4. CanvasPreview     — optional live thumbnail (toggled by PREVIEW button)
//   5. Post panel        — inline form for caption and tags (shown when POST is clicked)
//
// Data flow:
//   DrawingCanvas calls onChange() after every stroke → useCanvas stores the pixel data.
//   When the user clicks CONFIRM POST, handlePost() reads getExportData(), builds the
//   post object, calls useFeed().addPost(), then navigates to /feed.
//
// Scale calculation:
//   The render scale (pixels per grid cell) is calculated so the post looks good
//   in the feed. We target a canvas width of ~280px: scale = floor(280 / canvasWidth).
//   Minimum scale is 4 so tiny canvases (portrait 24px wide) don't look microscopic.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DrawingCanvas, { DEFAULT_PALETTE, GRID_PRESETS } from "./DrawingCanvas";
import ResolutionSelector from "../Components/canvas/ResolutionSelector";
import CanvasPreview from "../Components/canvas/CanvasPreview";
import { useCanvas } from "../hooks/useCanvas";
import { useFeed } from "../hooks/useFeed";

export default function DrawPage() {
  const navigate = useNavigate();
  const { presetKey, preset, handleChange, setPreset, reset, getExportData } = useCanvas();
  const { addPost } = useFeed();

  // UI toggle state
  const [showPreview, setShowPreview]     = useState(false);
  const [showPostPanel, setShowPostPanel] = useState(false);

  // Post form fields
  const [caption, setCaption]   = useState("");
  const [tagInput, setTagInput] = useState("");
  const [posting, setPosting]   = useState(false); // disables the button while saving

  const exportData = getExportData(); // null until the user draws something

  async function handlePost() {
    if (!exportData) return;

    // Split the tag input on spaces or commas, strip blanks, ensure # prefix
    const tags = tagInput
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith("#") ? t : `#${t}`));

    setPosting(true);
    await addPost({
      bitmap: {
        width: exportData.width,
        height: exportData.height,
        pixels: exportData.pixels,
        // Fit the drawing to roughly 280px wide in the feed
        scale: Math.max(4, Math.floor(280 / exportData.width)),
      },
      caption,
      tags,
      format: presetKey,
    });
    setPosting(false);

    // Reset the editor and navigate to feed after a successful post
    reset();
    setCaption("");
    setTagInput("");
    setShowPostPanel(false);
    navigate("/feed");
  }

  // Build a preview bitmap at a smaller scale so it fits nicely in the preview area
  const previewBitmap = exportData
    ? { ...exportData, scale: Math.max(3, Math.floor(200 / exportData.width)) }
    : null;

  return (
    <div className="bb-draw-page">
      {/* ── Step 1: pick canvas size ── */}
      <ResolutionSelector selected={presetKey} onChange={setPreset} />

      {/* ── Step 2: draw ── */}
      <DrawingCanvas
        width={preset.width}
        height={preset.height}
        palette={DEFAULT_PALETTE}
        onChange={handleChange} // fires after every stroke, stores data in useCanvas
      />

      {/* ── Step 3: action buttons ── */}
      <div className="bb-draw-actions">
        <button className="bb-btn" onClick={() => setShowPreview(v => !v)}>
          {showPreview ? "HIDE PREVIEW" : "PREVIEW"}
        </button>
        {/* POST is disabled until the user has drawn at least one pixel */}
        <button
          className="bb-btn bb-btn-accent"
          onClick={() => setShowPostPanel(v => !v)}
          disabled={!exportData}
        >
          POST
        </button>
        <button className="bb-btn" onClick={reset}>CLEAR</button>
      </div>

      {/* ── Optional preview thumbnail ── */}
      {showPreview && previewBitmap && (
        <CanvasPreview bitmap={previewBitmap} maxWidth={300} />
      )}

      {/* ── Post panel: caption + tags form ── */}
      {showPostPanel && (
        <div className="bb-draw-post-panel">
          <label style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6 }}>CAPTION</label>
          <input
            className="bb-input"
            placeholder="Add a caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={120}
          />
          <label style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6 }}>TAGS</label>
          <input
            className="bb-input"
            placeholder="#pixelart #retro ..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="bb-btn bb-btn-solid"
              style={{ flex: 1 }}
              onClick={handlePost}
              disabled={posting}
            >
              {posting ? "POSTING..." : "CONFIRM POST"}
            </button>
            <button className="bb-btn" onClick={() => setShowPostPanel(false)}>
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
