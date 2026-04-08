// Colour palette utilities shared across the app.
//
// DEFAULT_PALETTE is re-exported from DrawingCanvas so every component
// that needs to render pixel art has one canonical source of truth for colours.
export { DEFAULT_PALETTE } from "../Pages/DrawingCanvas";

// Five background/text colour pairs used for the diagonal username badges.
// These match the PALETTES array inside Bitboard.jsx so the demo and the
// real app look consistent.
export const USER_PALETTES = [
  { bg: "#7fdbca", text: "#1a4a44" }, // mint
  { bg: "#ffb3c6", text: "#5a1a2e" }, // pink
  { bg: "#c8c8c8", text: "#2a2a2a" }, // grey
  { bg: "#b3c8f0", text: "#1a2a5a" }, // ice blue
  { bg: "#ffd166", text: "#3a2a00" }, // yellow
];

/**
 * Deterministically picks a badge palette for a user based on their ID.
 * The same ID will always return the same palette — no random flicker on
 * re-render. Uses a simple djb2-style hash so the distribution is even.
 */
export function getUserPalette(userId = "") {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return USER_PALETTES[Math.abs(hash) % USER_PALETTES.length];
}
