// AppContext — global low-churn state shared across the whole app.
//
// Holds:
//   currentUser   — from AuthContext (synced on auth change)
//   theme         — "light" or "dark"
//   notifications — fetched from backend + real-time via WebSocket
import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuthContext } from "./AuthContext";
import * as usersApi from "../api/usersApi";

const AppContext = createContext(null);

const initialState = {
  currentUser: null,
  theme: localStorage.getItem("bb_theme") || "light",
  notifications: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_USER":
      return { ...state, currentUser: action.payload };

    case "SET_THEME":
      return { ...state, theme: action.payload };

    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload };

    case "ADD_NOTIFICATION":
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case "MARK_READ":
      return {
        ...state,
        notifications: state.notifications.map(function(n) {
          return n.id === action.payload ? { ...n, read: true } : n;
        }),
      };

    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map(function(n) {
          return { ...n, read: true };
        }),
      };

    case "UPDATE_BIO":
      return {
        ...state,
        currentUser: state.currentUser ? { ...state.currentUser, bio: action.payload } : null,
      };

    case "TOGGLE_FOLLOW": {
      if (!state.currentUser) return state;
      const { userId, isFollowing } = action.payload;
      // We track follow state on the profile being viewed, not here
      return state;
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user: authUser } = useAuthContext();

  // Sync current user from AuthContext
  useEffect(function() {
    dispatch({ type: "SET_USER", payload: authUser });
  }, [authUser]);

  // Fetch notifications when logged in
  useEffect(function() {
    if (!authUser) return;
    usersApi.getNotifications().then(function(notifs) {
      dispatch({ type: "SET_NOTIFICATIONS", payload: notifs });
    }).catch(function(err) {
      console.warn("Failed to fetch notifications:", err.message);
    });
  }, [authUser]);

  // Apply theme to <html> and persist
  useEffect(function() {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("bb_theme", state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
