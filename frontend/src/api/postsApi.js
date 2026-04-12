import { apiFetch } from "./apiFetch";

/** All posts, newest first. */
export async function getPosts() {
  return apiFetch("/api/posts");
}

/** Posts from followed users + own posts (requires auth). */
export async function getFeed() {
  return apiFetch("/api/posts/feed");
}

/** Posts by a specific user. */
export async function getPostsByUser(userId) {
  return apiFetch("/api/posts/user/" + userId);
}

/** Posts matching a hashtag, sorted by likes. */
export async function getPostsByTag(tag) {
  return apiFetch("/api/posts/tag/" + encodeURIComponent(tag));
}

/** Posts a user has liked. */
export async function getLikedPosts(userId) {
  return apiFetch("/api/posts/user/" + userId + "/liked");
}

/** Toggle like on a post — returns { liked, likes }. */
export async function likePost(postId) {
  return apiFetch("/api/posts/" + postId + "/like", { method: "POST" });
}

/** Create a new drawing post. */
export async function createPost({ bitmap, caption, tags, format }) {
  return apiFetch("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      width:    bitmap.width,
      height:   bitmap.height,
      pixels:   bitmap.pixels,
      caption:  caption || "",
      hashtags: (tags || []).map(function(t) { return t.startsWith("#") ? t : "#" + t; }),
    }),
  });
}

/** Delete a post (must be the owner). */
export async function deletePost(postId) {
  return apiFetch("/api/posts/" + postId, { method: "DELETE" });
}

/** Flag a post for admin review. */
export async function flagPost(postId) {
  return apiFetch("/api/posts/" + postId + "/flag", { method: "POST" });
}
