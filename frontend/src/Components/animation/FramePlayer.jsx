// Frame player used inside AnimationRoom for live and post-preview playback.
import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import CanvasPreview from "../canvas/CanvasPreview";
import { DEFAULT_PALETTE } from "../../utils/palette";

export default function FramePlayer({ frames = [], fps = 4 }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (playing && frames.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent(i => (i + 1) % frames.length);
      }, 1000 / fps);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, frames.length, fps]);

  if (frames.length === 0) return null;

  const frame = frames[current];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <CanvasPreview bitmap={frame.bitmap} palette={DEFAULT_PALETTE} maxWidth={240} />
      <div style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.5 }}>
        {current + 1} / {frames.length}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="bb-btn" style={{ padding: "5px 8px" }} onClick={() => setCurrent(0)}>
          <SkipBack size={12} />
        </button>
        <button
          className={`bb-btn${playing ? " bb-btn-solid" : ""}`}
          style={{ padding: "5px 10px" }}
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button className="bb-btn" style={{ padding: "5px 8px" }} onClick={() => setCurrent(frames.length - 1)}>
          <SkipForward size={12} />
        </button>
      </div>
    </div>
  );
}
