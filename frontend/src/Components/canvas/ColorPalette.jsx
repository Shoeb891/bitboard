// ColorPalette — a grid of colour swatches the user can click to select a colour.
//
// Props:
//   palette  — array of hex colour strings (e.g. DEFAULT_PALETTE from DrawingCanvas)
//   selected — index of the currently selected colour
//   onSelect — called with the new colour index when the user clicks a swatch
//
// Used in SettingsPage to display the avatar colour picker.
// DrawingCanvas has its own built-in palette UI, so this component is
// used in contexts outside the drawing editor.
export default function ColorPalette({ palette, selected, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 220 }}>
      {palette.map((color, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          title={color} // shows the hex value on hover
          style={{
            width: 22,
            height: 22,
            background: color,
            // Thicker border + white inner outline on the selected swatch
            border: selected === i
              ? "2px solid var(--black)"
              : "1px solid rgba(0,0,0,0.2)",
            cursor: "pointer",
            outline: selected === i ? "2px solid #fff" : "none",
            outlineOffset: -3,
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}
