// Layout — the shared shell that wraps every page except /demo.
//
// Renders:
//   - the animated grid background (bb-app class)
//   - the sidebar NavBar on the left
//   - a sticky topbar showing the current page title and the theme toggle
//   - <Outlet /> where React Router injects the active page's content
//
// useWebSocket() is called here so the mock real-time notifications run for
// the entire session — Layout stays mounted whenever the user navigates
// between pages, so the timer never resets.
import { Outlet, useLocation } from "react-router-dom";
import NavBar from "../Components/common/NavBar";
import ThemeToggle from "../Components/common/ThemeToggle";
import NotificationBell from "../Components/common/NotificationBell";
import { useWebSocket } from "../hooks/useWebSocket";

// Maps route prefixes to the title shown in the topbar
const ROUTE_TITLES = {
  "/feed":     "FEED",
  "/explore":  "EXPLORE",
  "/draw":     "DRAW",
  "/animate":  "ANIMATE",
  "/game":     "GAME",
  "/hangman":  "HANGMAN",
  "/profile":  "PROFILE",
  "/settings": "SETTINGS",
};

export default function Layout() {
  const location = useLocation();

  // Start the mock real-time notification drip for this session
  useWebSocket();

  // Find the title whose path prefix matches the current URL
  const title = Object.entries(ROUTE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? "BITBOARD";

  return (
    <div className="bb-app">
      {/* Sidebar navigation */}
      <NavBar />

      {/* Scrollable main column */}
      <div className="bb-main">
        {/* Sticky topbar — page title on the left, controls on the right.
            The notification bell is wrapped in bb-topbar-bell so CSS can hide
            it on desktop/tablet where the sidebar bell takes its place. */}
        <div className="bb-topbar bb-zone">
          <span className="bb-topbar-title">{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="bb-topbar-bell"><NotificationBell /></div>
            <ThemeToggle />
          </div>
        </div>

        {/* The active page renders here */}
        <Outlet />
      </div>
    </div>
  );
}
