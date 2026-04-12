// SettingsPage — user preferences and profile editing.
//
// Sections:
//   PROFILE    — edit username + bio; SAVE PROFILE also persists avatar colour
//   AVATAR COLOUR — pick a swatch from DEFAULT_PALETTE; saved with the profile
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

  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio]         = useState(user?.bio ?? "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? null);
  const [saved, setSaved]     = useState(false);   // drives the "SAVED!" flash on the button
  const [error, setError]     = useState("");
  // Restore last saved grid density from localStorage so it survives page refreshes
  const [cellSize, setCellSize] = useState(
    () => Number(localStorage.getItem("bb_cell") ?? 22)
  );

  // Apply the restored cell size to the CSS variable on mount
  useEffect(() => {
    document.documentElement.style.setProperty("--cell", `${cellSize}px`);
  }, []);

  // Save profile fields to the API, update AppContext, and briefly flash "SAVED!"
  async function handleSaveProfile() {
    setError("");
    const payload = { bio, avatarColor };
    if (username && username !== user?.username) payload.username = username;
    try {
      const updated = await usersApi.updateProfile(payload);
      dispatch({ type: "UPDATE_PROFILE", payload: updated });
      setUsername(updated.username);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Save failed");
    }
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
          {/* Username — editable; backend sanitises to [a-z0-9_-] and enforces uniqueness */}
          <div>
            <div style={{ fontFamily: "var(--fp)", fontSize: 7, opacity: 0.5, marginBottom: 6 }}>USERNAME</div>
            <input
              className="bb-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={28}
              spellCheck={false}
              autoCapitalize="off"
            />
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

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="bb-btn bb-btn-solid"
              onClick={handleSaveProfile}
              style={{ alignSelf: "flex-start" }}
            >
              {saved ? "SAVED!" : "SAVE PROFILE"}
            </button>
            {error && (
              <span style={{ color: "#d33", fontSize: 12 }}>{error}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── AVATAR COLOUR section ── */}
      <div className="bb-settings-section">
        <div className="bb-settings-label">AVATAR COLOUR</div>
        {/* Pick any drawing-palette colour for your username badge.
            Saved alongside the rest of the profile on SAVE PROFILE. */}
        <ColorPalette
          palette={DEFAULT_PALETTE}
          selected={DEFAULT_PALETTE.indexOf(avatarColor)}
          onSelect={i => setAvatarColor(DEFAULT_PALETTE[i])}
        />
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
