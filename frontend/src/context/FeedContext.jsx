// FeedContext — state for all post data.
//
// Posts change frequently (likes, new posts, deletes) so they live
// in their own context to avoid re-rendering unrelated components.
import { createContext, useContext, useReducer, useEffect } from "react";
import { useAuthContext } from "./AuthContext";
import * as postsApi from "../api/postsApi";

const FeedContext = createContext(null);

const initialState = {
  posts: [],
  loading: true,
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

  // Load posts when user is authenticated
  useEffect(function() {
    if (!user) {
      dispatch({ type: "SET_POSTS", payload: [] });
      return;
    }
    dispatch({ type: "SET_LOADING", payload: true });
    postsApi.getPosts().then(function(posts) {
      dispatch({ type: "SET_POSTS", payload: posts });
    }).catch(function(err) {
      console.error("Failed to load posts:", err);
      dispatch({ type: "SET_POSTS", payload: [] });
    });
  }, [user]);

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
