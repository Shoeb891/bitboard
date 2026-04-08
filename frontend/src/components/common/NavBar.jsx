// NavBar — the left sidebar navigation present on every page.
//
// Renders:
//   - the Bitboard logo at the top
//   - a list of NavLinks (React Router) that highlight when their route is active
//   - a purple "+ CREATE" shortcut that jumps straight to /draw
//   - the current user's username badge and the notification bell at the bottom
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, PenLine, Film, User, Settings, Plus } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { getUserPalette } from "../../utils/palette";
import NotificationBell from "./NotificationBell";

// Each entry maps to one nav link: route path, display label, and Lucide icon
const NAV_ITEMS = [
  { to: "/feed",     label: "FEED",    Icon: Home },
  { to: "/explore",  label: "EXPLORE", Icon: Compass },
  { to: "/draw",     label: "DRAW",    Icon: PenLine },
  { to: "/animate",  label: "ANIMATE", Icon: Film },
  { to: "/profile",  label: "PROFILE", Icon: User },
  { to: "/settings", label: "SETTINGS",Icon: Settings },
];

// Bottom nav shows these 5 routes — Animate is WIP so it's excluded
const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter(({ to }) => to !== "/animate");

export default function NavBar() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const user = state.currentUser;

  // Derive the avatar badge colour from the user's ID — same colour every time
  const palette = getUserPalette(user?.id ?? "");

  return (
    <>
    {/* ── Desktop/tablet sidebar (hidden on mobile via CSS) ── */}
    <nav className="bb-sidebar bb-zone">
      {/* ── Logo ── */}
      <div className="bb-logo">
        <span className="bb-logo-b">B</span>
        <span className="bb-logo-script">it.board</span>
        <span style={{ fontSize: 16, marginLeft: 2 }}>✏</span>
      </div>

      {/* ── Navigation links ──
          NavLink automatically receives the `isActive` boolean from React Router,
          which we use to add the "active" class (black background, white text). */}
      <div style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bb-nav-item${isActive ? " active" : ""}`}
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* ── Quick-create button — navigates to the draw page ── */}
      <button
        className="bb-btn bb-btn-accent"
        style={{ margin: 12, display: "flex", alignItems: "center", gap: 6 }}
        onClick={() => navigate("/draw")}
      >
        <Plus size={12} />
        CREATE
      </button>

      {/* ── Bottom bar: avatar badge + notification bell ── */}
      <div style={{
        borderTop: "var(--border)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Show a truncated username in the user's badge colour */}
        <span
          className="bb-usertag"
          style={{ background: palette.bg, color: palette.text, fontSize: 6 }}
        >
          {user?.username?.slice(0, 8) ?? "..."}
        </span>

        {/* Bell icon with unread count badge */}
        <NotificationBell />
      </div>
    </nav>

    {/* ── Mobile bottom navigation bar (hidden on desktop/tablet via CSS) ──
        position: fixed in CSS so DOM position here doesn't matter */}
    <nav className="bb-bottomnav">
      {BOTTOM_NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bb-bottomnav-item${isActive ? " active" : ""}`}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
    </>
  );
}
