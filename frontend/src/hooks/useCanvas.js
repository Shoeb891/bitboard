// useCanvas — state management for the drawing page.
//
// Sits between DrawPage and the DrawingCanvas component:
//   - tracks which canvas size preset is selected (e.g. "square_sm", "banner")
//   - stores the latest pixel data emitted by DrawingCanvas via its onChange callback
//   - tracks whether the canvas has any drawn pixels (isDirty), so we can warn
//     the user before they lose work by switching format
import { useState, useCallback } from "react";
import { GRID_PRESETS } from "../Pages/DrawingCanvas";

export function useCanvas(initialPreset = "square_sm") {
  const [presetKey, setPresetKey] = useState(initialPreset);
  const [exportData, setExportData] = useState(null); // { width, height, pixels }
  const [isDirty, setIsDirty] = useState(false);      // true if any pixel has been drawn

  // Look up the full preset object (width, height, label, tag) from the key
  const preset = GRID_PRESETS[presetKey] ?? GRID_PRESETS.square_sm;

  // Called every time the user finishes a stroke in DrawingCanvas.
  // useCallback prevents a new function reference on every render, which would
  // cause DrawingCanvas to unnecessarily re-subscribe to the callback.
  const handleChange = useCallback(({ width, height, pixels }) => {
    setExportData({ width, height, pixels });
    // The canvas is dirty if at least one pixel is non-zero (colour index 0 = background)
    setIsDirty(pixels.some(v => v !== 0));
  }, []);

  // Switch to a different canvas size.
  // If the user has drawn something, ask before discarding their work —
  // changing width/height causes DrawingCanvas to reinitialise and clears all pixels.
  function setPreset(key) {
    if (isDirty) {
      if (!window.confirm("Changing format will clear your drawing. Continue?")) return;
    }
    setPresetKey(key);
    setExportData(null);
    setIsDirty(false);
  }

  // Clears the stored export data and dirty flag (used after posting)
  function reset() {
    setExportData(null);
    setIsDirty(false);
  }

  // Returns the latest pixel data — null if nothing has been drawn yet
  function getExportData() {
    return exportData;
  }

  return { presetKey, preset, isDirty, handleChange, setPreset, reset, getExportData };
}
