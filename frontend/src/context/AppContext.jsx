// AppContext — global low-churn state shared across the whole app.
//
// Holds three pieces of state that many components need but that don't
// change on every interaction:
//   currentUser   — the logged-in user object (always jeffery_owns until real auth exists)
//   theme         — "light" or "dark", applied to <html data-theme="...">
//   notifications — inbox list, including mock real-time arrivals from useWebSocket
//
// Components access state via the useAppContext() hook.
// Actions are dispatched with { type, payload } — see the reducer below.
import { createContext, useContext, useReducer, useEffect } from "react";
import { MOCK_NOTIFICATIONS, CURRENT_USER_ID } from "../assets/mockData";
import * as usersApi from "../api/usersApi";

const AppContext = createContext(null);

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initialState = {
  currentUser: null,  // populated on mount by the useEffect below
  // Restore last saved theme from localStorage so the preference survives refresh
  theme: localStorage.getItem("bb_theme") ?? "light",
  // Shallow-copy each notification so the store doesn't share references
  // with the mockData array (mutations would otherwise affect the source)
  notifications: MOCK_NOTIFICATIONS.map(n => ({ ...n })),
};

// ─── REDUCER ─────────────────────────────────────────────────────────────────
// Pure function — takes the old state and an action, returns new state.
// Every case returns a new object so React detects the change and re-renders.
function appReducer(state, action) {
  switch (action.type) {

    // Replace the current user object (called once on mount)
    case "SET_USER":
      return { ...state, currentUser: action.payload };

    // Switch between "light" and "dark"
    case "SET_THEME":
      return { ...state, theme: action.payload };

    // Prepend a new notification so it appears at the top of the list
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [action.payload, ...state.notifications] };

    // Mark a single notification as read by its ID
    case "MARK_READ":
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    // Mark every notification as read at once
    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    // Update the bio shown in the profile header and settings page
    case "UPDATE_BIO":
      return {
        ...state,
        currentUser: state.currentUser ? { ...state.currentUser, bio: action.payload } : null,
      };

    // Toggle follow/unfollow by updating the current user's `following` array.
    // isFollowing = the state BEFORE the click, so we do the opposite action.
    case "TOGGLE_FOLLOW": {
      if (!state.currentUser) return state;
      const { userId, isFollowing } = action.payload;
      const following = isFollowing
        ? state.currentUser.following.filter(id => id !== userId) // remove
        : [...(state.currentUser.following ?? []), userId];       // add
      return { ...state, currentUser: { ...state.currentUser, following } };
    }

    default:
      return state;
  }
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Fetch the current user from the mock API on first render
  useEffect(() => {
    usersApi.getUser(CURRENT_USER_ID).then(user =>
      dispatch({ type: "SET_USER", payload: user })
    );
  }, []);

  // Apply the theme to the <html> element so CSS :root[data-theme="dark"] rules kick in,
  // and persist the preference to localStorage so it survives page refreshes
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("bb_theme", state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────
// Throws if used outside of <AppProvider> — catches wiring mistakes early
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
