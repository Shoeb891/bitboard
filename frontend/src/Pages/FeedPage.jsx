// FeedPage — the home feed showing posts from users the logged-in user
// follows (plus their own posts), newest first. Satisfies RTM FS1.0.
//
// The page owns the fetch for its view and writes it into FeedContext so
// LikeButton / delete / WebSocket pushes can mutate a single in-memory store.
import { useEffect } from "react";
import { useFeedContext } from "../context/FeedContext";
import { useAuthContext } from "../context/AuthContext";
import * as postsApi from "../api/postsApi";
import Feed from "../Components/feed/Feed";

export default function FeedPage() {
  const { state, dispatch } = useFeedContext();
  const { user } = useAuthContext();

  useEffect(function() {
    if (!user) return;
    let cancelled = false;
    dispatch({ type: "SET_LOADING", payload: true });
    postsApi.getFeed().then(function(posts) {
      if (cancelled) return;
      dispatch({ type: "SET_POSTS", payload: posts });
    }).catch(function(err) {
      if (cancelled) return;
      console.error("Failed to load feed:", err);
      dispatch({ type: "SET_POSTS", payload: [] });
    });
    return function() { cancelled = true; };
  }, [user?.id, dispatch]);

  return <Feed posts={state.posts} loading={state.loading} />;
}
