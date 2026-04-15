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

// Returns black or white so text stays legible against `hex`, using the WCAG
// relative-luminance formula. Accepts 3- or 6-digit #RRGGBB.
function contrastFor(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  // WCAG relative luminance: sRGB -> linear, then weighted (0.2126 / 0.7152 / 0.0722).
  const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#1a1a1a" : "#ffffff";
}

/**
 * Picks a badge palette for a user. Accepts either a user object or a raw id
 * string (for backwards-compat). If the user has an explicit `avatarColor`,
 * it wins and text is auto-contrasted. Otherwise falls back to a deterministic
 * djb2 hash into USER_PALETTES so the same id always maps to the same preset.
 */
export function getUserPalette(userOrId = "") {
  if (userOrId && typeof userOrId === "object") {
    if (userOrId.avatarColor) {
      return { bg: userOrId.avatarColor, text: contrastFor(userOrId.avatarColor) };
    }
    return hashPalette(userOrId.id || "");
  }
  return hashPalette(String(userOrId));
}

// djb2 hash -> deterministic palette index per user id.
function hashPalette(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return USER_PALETTES[Math.abs(hash) % USER_PALETTES.length];
}
