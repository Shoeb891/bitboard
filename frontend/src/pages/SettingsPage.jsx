// SettingsPage — user preferences and profile editing.
//
// Sections:
//   PROFILE    — edit bio, display username (read-only)
//   AVATAR COLOUR — shows the colour palette; avatar colour is auto-derived
//                   from username so this is informational only for now
//   APPEARANCE — toggle dark/light theme, adjust global grid density
//   ABOUT      — version string, link to the /demo reference page
//
// Grid density slider:
//   Moves the --cell CSS custom property directly on <html> via
//   document.documentElement.style.setProperty(). This changes the background
//   grid size across the whole app in real time without a re-render.
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { DEFAULT_PALETTE } from "../Pages/DrawingCanvas";
import ColorPalette from "../Components/canvas/ColorPalette";
import ThemeToggle from "../Components/common/ThemeToggle";
import * as usersApi from "../api/usersApi";
import * as authApi from "../api/authApi";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const user = state.currentUser;

  const [bio, setBio]         = useState(user?.bio ?? "");
  const [saved, setSaved]     = useState(false);   // drives the "SAVED!" flash on the button
  // Restore last saved grid density from localStorage so it survives page refreshes
  const [cellSize, setCellSize] = useState(
    () => Number(localStorage.getItem("bb_cell") ?? 22)
  );

  // Apply the restored cell size to the CSS variable on mount
  useEffect(() => {
    document.documentElement.style.setProperty("--cell", `${cellSize}px`);
  }, []);

  // Save the bio to the mock API, update AppContext, and briefly flash "SAVED!"
  async function handleSaveBio() {
    await usersApi.updateProfile({ bio });
    dispatch({ type: "UPDATE_BIO", payload: bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000); // reset button label after 2 seconds
  }

  // Update the --cell variable directly on <html> so the grid redraws immediately,
  // and persist the value to localStorage so it survives page refreshes
  function handleCellChange(val) {
    setCellSize(val);
    document.documentElement.style.setProperty("--cell", `${val}px`);
    localStorage.setItem("bb_cell", val);
  }

  return (
    <div>
      {/* ── PROFILE section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">PROFILE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Username is display-only — changing it requires backend support */}
          <div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.5, marginBottom: 6 }}>USERNAME</div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 18, opacity: 0.7 }}>
              {user?.username ?? "—"}
            </div>
          </div>

          {/* Bio textarea */}
          <div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.5, marginBottom: 6 }}>BIO</div>
            <textarea
              className="bb-input"
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={160}
              style={{ resize: "vertical" }}
            />
          </div>

          <button
            className="bb-btn bb-btn-solid"
            onClick={handleSaveBio}
            style={{ alignSelf: "flex-start" }}
          >
            {saved ? "SAVED!" : "SAVE PROFILE"}
          </button>
        </div>
      </div>

      {/* ── AVATAR COLOUR section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">AVATAR COLOUR</div>
        {/* Display the full palette — the selected swatch is shown but clicking
            has no effect yet because avatar colour is derived from username */}
        <ColorPalette
          palette={DEFAULT_PALETTE}
          selected={user?.paletteId ?? 0}
          onSelect={() => {}}
        />
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
          Avatar colour is derived from your username automatically.
        </div>
      </div>

      {/* ── APPEARANCE section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">APPEARANCE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Theme toggle — light/dark mode */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--fp)", fontSize: 8 }}>THEME</span>
            <ThemeToggle />
          </div>

          {/* Grid density slider — changes the background grid cell size globally */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--fp)", fontSize: 8 }}>GRID DENSITY</span>
              <span style={{ fontFamily: "var(--fb)", fontSize: 15 }}>{cellSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={40}
              value={cellSize}
              onChange={e => handleCellChange(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* ── ACCOUNT section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">ACCOUNT</div>
        <button
          className="bb-btn"
          style={{ color: "#d33" }}
          onClick={async function() { await authApi.logout(); navigate("/login"); }}
        >
          LOG OUT
        </button>
      </div>

      {/* ── ABOUT section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">ABOUT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <div style={{ opacity: 0.6 }}>Bitboard v0.1.0 — pixel-first social platform</div>
          <Link to="/demo" style={{ color: "var(--accent)", textDecoration: "underline", fontSize: 13 }}>
            View original demo →
          </Link>
        </div>
      </div>
    </div>
  );
}
