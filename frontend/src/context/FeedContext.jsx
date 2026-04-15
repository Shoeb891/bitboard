// FeedContext — state for the currently-visible set of posts.
//
// Each page (Feed, Explore, Profile) owns the fetch for its own view and
// writes the result in via SET_POSTS. Mutations (like/delete/ADD_POST from
// WebSockets) then update whichever view is on screen.
import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuthContext } from "./AuthContext";

const FeedContext = createContext(null);

const initialState = {
  posts: [],
  loading: false,
  activeTag: null,
};

function feedReducer(state, action) {
  switch (action.type) {
    case "SET_POSTS":
      return { ...state, posts: action.payload, loading: false };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "ADD_POST":
      return { ...state, posts: [action.payload, ...state.posts] };

    case "DELETE_POST":
      return { ...state, posts: state.posts.filter(function(p) { return p.id !== action.payload; }) };

    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map(function(p) {
          return p.id === action.payload.id ? action.payload : p;
        }),
      };

    case "SET_TAG_FILTER":
      return { ...state, activeTag: action.payload };

    default:
      return state;
  }
}

export function FeedProvider({ children }) {
  const [state, dispatch] = useReducer(feedReducer, initialState);
  const { user } = useAuthContext();

  // Clear the view cache whenever the authenticated user changes so a prior
  // user's posts don't flash for the next one.
  useEffect(function() {
    dispatch({ type: "SET_POSTS", payload: [] });
  }, [user?.id]);

  return (
    <FeedContext.Provider value={{ state, dispatch }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeedContext() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeedContext must be used inside FeedProvider");
  return ctx;
}
