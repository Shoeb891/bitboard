// FeedContext — state for all post and user data.
//
// Separated from AppContext because posts change frequently (likes, new posts,
// deletes) and we don't want every theme or notification change to trigger
// a re-render of every PostCard in the feed.
//
// Holds:
//   posts     — master list of all posts, sorted newest first
//   users     — all user objects (used for profile lookups)
//   loading   — true while the initial fetch is in progress
//   activeTag — the hashtag currently selected in Explore (null = show all)
//
// Components use the useFeed() hook (src/hooks/useFeed.js) rather than
// calling useContext(FeedContext) directly — that hook wraps the raw
// dispatch calls in friendlier named functions (likePost, addPost, etc.).
import { createContext, useContext, useReducer, useEffect } from "react";
import * as postsApi from "../api/postsApi";
import * as usersApi from "../api/usersApi";

const FeedContext = createContext(null);

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initialState = {
  posts: [],
  users: [],
  loading: true,  // show skeleton cards until data arrives
  activeTag: null,
};

// ─── REDUCER ─────────────────────────────────────────────────────────────────
function feedReducer(state, action) {
  switch (action.type) {

    // Replaces the entire posts array and clears the loading flag
    case "SET_POSTS":
      return { ...state, posts: action.payload, loading: false };

    // Replaces the entire users array
    case "SET_USERS":
      return { ...state, users: action.payload };

    // Manually set the loading flag (used if we need to show a spinner mid-session)
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    // Prepend a newly created post so it appears at the top of the feed immediately
    case "ADD_POST":
      return { ...state, posts: [action.payload, ...state.posts] };

    // Remove a deleted post by ID
    case "DELETE_POST":
      return { ...state, posts: state.posts.filter(p => p.id !== action.payload) };

    // Replace a single post with its updated version (new like count + liked flag)
    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    // Set the active hashtag filter for the Explore page (null clears it)
    case "SET_TAG_FILTER":
      return { ...state, activeTag: action.payload };

    default:
      return state;
  }
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────
export function FeedProvider({ children }) {
  const [state, dispatch] = useReducer(feedReducer, initialState);

  // Load posts and users in parallel on mount — both are needed before
  // anything meaningful can render, so we fetch them together with Promise.all
  useEffect(() => {
    Promise.all([postsApi.getPosts(), usersApi.getAllUsers()]).then(
      ([posts, users]) => {
        dispatch({ type: "SET_POSTS", payload: posts });
        dispatch({ type: "SET_USERS", payload: users });
      }
    );
  }, []);

  return (
    <FeedContext.Provider value={{ state, dispatch }}>
      {children}
    </FeedContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────
export function useFeedContext() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeedContext must be used inside FeedProvider");
  return ctx;
}
