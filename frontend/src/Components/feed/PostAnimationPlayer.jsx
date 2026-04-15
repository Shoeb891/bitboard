import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack } from "lucide-react";
import { renderBitmapToCanvas } from "../../utils/bitmap";
import { DEFAULT_PALETTE } from "../../utils/palette";

const FPS = 4;

export default function PostAnimationPlayer({ post }) {
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const frames = Array.isArray(post.frames) ? post.frames : [];

  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;
    renderBitmapToCanvas(
      canvasRef.current,
      { ...post.bitmap, pixels: frames[current].pixels },
      DEFAULT_PALETTE
    );
  }, [current, post.id]);

  useEffect(() => {
    if (playing && frames.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent(i => (i + 1) % frames.length);
      }, 1000 / FPS);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, frames.length]);

  if (frames.length === 0) return null;

  return (
    <div className="bb-post-anim">
      <canvas ref={canvasRef} className="bb-post-canvas" />
      <div className="bb-post-anim-controls">
        <button
          className="bb-btn"
          style={{ padding: "4px 8px" }}
          onClick={() => { setPlaying(false); setCurrent(0); }}
          title="Restart"
        >
          <SkipBack size={12} />
        </button>
        <button
          className={`bb-btn${playing ? " bb-btn-solid" : ""}`}
          style={{ padding: "4px 12px" }}
          onClick={() => setPlaying(p => !p)}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <span style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.5 }}>
          {current + 1} / {frames.length}
        </span>
      </div>
    </div>
  );
}
