import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import DrawingCanvas, { DEFAULT_PALETTE, GRID_PRESETS } from "../../Pages/DrawingCanvas";
import CanvasPreview from "../canvas/CanvasPreview";
import FramePlayer from "./FramePlayer";
import { useFeed } from "../../hooks/useFeed";

const ANIM_PRESET = GRID_PRESETS.square_sm; // 32×32 for animations

export default function AnimationRoom() {
  const navigate = useNavigate();
  const { addPost } = useFeed();

  const [frames, setFrames] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentPixels, setCurrentPixels] = useState(null);
  const [posting, setPosting] = useState(false);

  const [showPreview, setShowPreview]     = useState(false);
  const [showPostPanel, setShowPostPanel] = useState(false);
  const [caption, setCaption]   = useState("");
  const [tagInput, setTagInput] = useState("");

  function addFrame() {
    if (!currentPixels) return;
    const frame = {
      id: Date.now(),
      bitmap: {
        width: ANIM_PRESET.width,
        height: ANIM_PRESET.height,
        pixels: [...currentPixels.pixels],
        scale: 5,
      },
    };
    setFrames(prev => [...prev, frame]);
    setActiveIdx(frames.length);
  }

  function deleteFrame(idx) {
    setFrames(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIdx(Math.min(activeIdx, next.length - 1));
      return next;
    });
  }

  function clearAll() {
    setFrames([]);
    setActiveIdx(0);
    setCaption("");
    setTagInput("");
    setShowPostPanel(false);
    setShowPreview(false);
  }

  async function handlePost() {
    if (frames.length < 2) return;

    const tags = tagInput
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith("#") ? t : `#${t}`));
    if (tags.length === 0) tags.push("#animation");

    const finalCaption = caption.trim()
      || `Animation — ${frames.length} frame${frames.length !== 1 ? "s" : ""}`;

    setPosting(true);
    try {
      await addPost({
        bitmap: frames[0].bitmap,
        caption: finalCaption,
        tags,
        format: "square_sm",
        frames: frames.map(f => ({ pixels: f.bitmap.pixels })),
      });
      clearAll();
      navigate("/feed");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bb-anim-room" style={{ display: "flex", gap: 0, height: "100%", flexWrap: "wrap" }}>
      {/* Left: frame list */}
      <div className="bb-anim-frames" style={{
        width: 120,
        borderRight: "var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--white)",
        overflowY: "auto",
      }}>
        <div style={{ padding: "8px 10px", fontFamily: "var(--fp)", fontSize: 7, borderBottom: "var(--border)", opacity: 0.6 }}>
          FRAMES
        </div>
        {frames.map((frame, idx) => (
          <div
            key={frame.id}
            style={{
              position: "relative",
              padding: 6,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              background: idx === activeIdx ? "rgba(0,0,0,0.05)" : "transparent",
              cursor: "pointer",
            }}
            onClick={() => setActiveIdx(idx)}
          >
            <CanvasPreview bitmap={{ ...frame.bitmap, scale: 2 }} maxWidth={80} />
            <div style={{ fontFamily: "var(--fp)", fontSize: 6, opacity: 0.5, marginTop: 3 }}>
              #{idx + 1}
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteFrame(idx); }}
              style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", cursor: "pointer", color: "#e63946", opacity: 0.7 }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <button
          className="bb-btn"
          style={{ margin: 8, fontSize: 7, display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}
          onClick={addFrame}
          disabled={!currentPixels}
        >
          <Plus size={10} /> ADD FRAME
        </button>
      </div>

      {/* Center: canvas + actions */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 16, gap: 12, overflowY: "auto" }}>
        <div style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6 }}>
          DRAW FRAME {activeIdx + 1}
        </div>
        <DrawingCanvas
          width={ANIM_PRESET.width}
          height={ANIM_PRESET.height}
          palette={DEFAULT_PALETTE}
          onChange={data => setCurrentPixels(data)}
        />

        <div className="bb-draw-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="bb-btn" onClick={addFrame} disabled={!currentPixels}>
            + ADD FRAME
          </button>
          <button
            className="bb-btn"
            onClick={() => setShowPreview(v => !v)}
            disabled={frames.length === 0}
          >
            {showPreview ? "HIDE PREVIEW" : "PREVIEW"}
          </button>
          <button
            className="bb-btn bb-btn-accent"
            onClick={() => setShowPostPanel(v => !v)}
            disabled={frames.length < 2}
            title={frames.length < 2 ? "Add at least 2 frames to post an animation" : undefined}
          >
            POST
          </button>
          <button className="bb-btn" onClick={clearAll} disabled={frames.length === 0}>
            CLEAR
          </button>
        </div>

        {showPreview && frames.length > 0 && (
          <div style={{ padding: 12, background: "var(--white)", border: "var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.6 }}>FEED PREVIEW</div>
            <FramePlayer frames={frames} fps={4} />
          </div>
        )}

        {showPostPanel && (
          <div className="bb-draw-post-panel" style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6 }}>CAPTION</label>
            <input
              className="bb-input"
              placeholder="Describe your animation..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={120}
            />
            <label style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6 }}>TAGS</label>
            <input
              className="bb-input"
              placeholder="#pixelart #loop ..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="bb-btn bb-btn-solid"
                style={{ flex: 1 }}
                onClick={handlePost}
                disabled={posting || frames.length < 2}
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

      {/* Right: live playback while editing */}
      {frames.length > 0 && (
        <div className="bb-anim-preview" style={{
          width: 200,
          borderLeft: "var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 16,
          gap: 12,
          background: "var(--white)",
        }}>
          <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.6 }}>LIVE</div>
          <FramePlayer frames={frames} fps={4} />
        </div>
      )}
    </div>
  );
}
