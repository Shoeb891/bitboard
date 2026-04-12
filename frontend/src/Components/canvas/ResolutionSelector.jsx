// ResolutionSelector — row of buttons for picking the canvas format before drawing.
//
// Props:
//   selected — the key of the currently active preset (e.g. "square_sm")
//   onChange — called with the new preset key when the user picks a different one
//
// The available presets come directly from GRID_PRESETS in DrawingCanvas.jsx
// so this component always stays in sync with what the editor actually supports.
import { GRID_PRESETS } from "../../Pages/DrawingCanvas";

export default function ResolutionSelector({ selected, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
      {Object.entries(GRID_PRESETS).map(([key, { label, tag }]) => (
        <button
          key={key}
          // Active preset gets the solid (black) button style
          className={`bb-btn${selected === key ? " bb-btn-solid" : ""}`}
          style={{ fontSize: 7, padding: "6px 10px", lineHeight: 1.6 }}
          onClick={() => onChange(key)}
        >
          {/* e.g. "Post" */}
          <div>{tag}</div>
          {/* e.g. "48×48" */}
          <div style={{ opacity: 0.6, fontSize: 6 }}>{label}</div>
        </button>
      ))}
    </div>
  );
}
