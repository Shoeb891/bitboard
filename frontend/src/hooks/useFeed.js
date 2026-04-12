// useFeed — the public API for interacting with post data.
//
// Components should use this hook instead of calling useFeedContext() directly.
// It wraps the raw dispatch calls in named functions so callers never need to
// know about action type strings, and it handles the async API calls before
// updating the context so the UI stays in sync with the backend.
import { useFeedContext } from "../context/FeedContext";
import * as postsApi from "../api/postsApi";

export function useFeed() {
  const { state, dispatch } = useFeedContext();

  // Toggle like — the API returns { liked, likes }, so we merge into
  // the existing post object to keep all other fields intact.
  async function likePost(postId) {
    const result = await postsApi.likePost(postId);
    const existing = state.posts.find(function(p) { return p.id === postId; });
    if (existing && result) {
      dispatch({ type: "TOGGLE_LIKE", payload: { ...existing, liked: result.liked, likes: result.likes } });
    }
  }

  // Create a post — the API returns the formatted post object
  async function addPost(postData) {
    const newPost = await postsApi.createPost(postData);
    dispatch({ type: "ADD_POST", payload: newPost });
    return newPost;
  }

  // Delete a post — calls the API then removes it from context by ID
  async function deletePost(postId) {
    await postsApi.deletePost(postId);
    dispatch({ type: "DELETE_POST", payload: postId });
  }

  // Set the active hashtag filter used by ExplorePage (null clears it)
  function setTagFilter(tag) {
    dispatch({ type: "SET_TAG_FILTER", payload: tag });
  }

  return {
    posts: state.posts,
    loading: state.loading,
    activeTag: state.activeTag,
    likePost,
    addPost,
    deletePost,
    setTagFilter,
  };
}
