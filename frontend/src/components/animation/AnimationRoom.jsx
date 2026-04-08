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

  async function handlePost() {
    if (frames.length === 0) return;
    setPosting(true);
    // Post first frame as the representative image
    await addPost({
      bitmap: frames[0].bitmap,
      caption: `Animation — ${frames.length} frame${frames.length !== 1 ? "s" : ""}`,
      tags: ["#animation", "#pixelart"],
      format: "square_sm",
    });
    setPosting(false);
    navigate("/feed");
  }

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", flexWrap: "wrap" }}>
      {/* Left: frame list */}
      <div style={{
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

      {/* Center: canvas */}
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bb-btn" onClick={addFrame} disabled={!currentPixels}>
            + ADD FRAME
          </button>
          <button
            className="bb-btn bb-btn-accent"
            onClick={handlePost}
            disabled={frames.length === 0 || posting}
          >
            {posting ? "POSTING..." : "POST ANIMATION"}
          </button>
        </div>
      </div>

      {/* Right: playback */}
      {frames.length > 0 && (
        <div style={{
          width: 200,
          borderLeft: "var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 16,
          gap: 12,
          background: "var(--white)",
        }}>
          <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.6 }}>PREVIEW</div>
          <FramePlayer frames={frames} fps={4} />
        </div>
      )}
    </div>
  );
}
