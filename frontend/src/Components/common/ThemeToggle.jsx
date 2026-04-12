// ThemeToggle — single button that switches between light and dark mode.
//
// Reads the current theme from AppContext and dispatches SET_THEME to flip it.
// The actual CSS change is applied in AppContext's useEffect, which sets
// document.documentElement.dataset.theme, triggering the [data-theme="dark"]
// rules defined in src/styles/theme.css.
import { Sun, Moon } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

export default function ThemeToggle() {
  const { state, dispatch } = useAppContext();
  const isDark = state.theme === "dark";

  return (
    <button
      onClick={() => dispatch({ type: "SET_THEME", payload: isDark ? "light" : "dark" })}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--black)", display: "flex", alignItems: "center", padding: "4px",
        borderRadius: "2px",
      }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Show Sun when dark (click to go light), Moon when light (click to go dark) */}
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
