// Posts API — mock in-memory implementation.
//
// In a real app these functions would make fetch() calls to the backend.
// For now they operate on a module-level array that acts as the database.
// Every function returns a Promise so the calling code is already written
// in the correct async style and swapping to real API calls later is trivial.
//
// IMPORTANT: every read returns a shallow copy of each post object so that
// consumers cannot accidentally mutate the store directly.
import { MOCK_POSTS, CURRENT_USER_ID, FORMATS } from "../assets/mockData";

// The in-memory store — initialised from mock data on first import
let posts = MOCK_POSTS.map(p => ({ ...p }));

// Simulates network latency so loading states are visible during development
const delay = (ms = 60) => new Promise(r => setTimeout(r, ms));

/** Returns all posts sorted newest first. */
export async function getPosts() {
  await delay();
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns posts from a specific set of users (the users the current user
 * follows) plus the current user's own posts.
 */
export async function getFeed(followingIds = []) {
  await delay();
  // Build a set for O(1) membership checks
  const ids = new Set([...followingIds, CURRENT_USER_ID]);
  return [...posts]
    .filter(p => ids.has(p.userId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Returns all posts by a single user, newest first. */
export async function getPostsByUser(userId) {
  await delay();
  return [...posts]
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns posts that include a specific hashtag, sorted by likes (most
 * liked first) — suitable for the Explore discovery feed.
 */
export async function getPostsByTag(tag) {
  await delay();
  // Normalise — ensure the tag starts with # before comparing
  const t = tag.startsWith("#") ? tag : `#${tag}`;
  return [...posts]
    .filter(p => p.tags?.includes(t))
    .sort((a, b) => b.likes - a.likes);
}

/** Returns the subset of posts whose IDs appear in likedPostIds. */
export async function getLikedPosts(likedPostIds = []) {
  await delay();
  const ids = new Set(likedPostIds);
  return [...posts].filter(p => ids.has(p.id)).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Toggles the like state on a post.
 * Increments or decrements the like count to match.
 * Returns the updated post so the UI can update immediately.
 */
export async function likePost(postId) {
  await delay(30);
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    const liked = !p.liked;
    return { ...p, liked, likes: p.likes + (liked ? 1 : -1) };
  });
  return posts.find(p => p.id === postId);
}

/**
 * Creates a new post for the current user.
 * The bitmap scale is already set by DrawPage before calling this, but we
 * fall back to the FORMATS table in case it is missing.
 */
export async function createPost({ bitmap, caption = "", tags = [], format = "square_sm" }) {
  await delay();
  const newPost = {
    id: `post_${Date.now()}`,   // unique ID based on creation timestamp
    userId: CURRENT_USER_ID,
    username: "jeffery_owns",   // hardcoded until real auth exists
    timestamp: "now",
    createdAt: Date.now(),
    likes: 0,
    liked: false,
    caption,
    tags,
    bitmap: {
      // Merge format defaults (width/height/scale) with the actual bitmap data
      ...(FORMATS[format] ?? FORMATS.square_sm),
      ...bitmap,
    },
  };
  posts = [newPost, ...posts]; // prepend so it appears at the top of the feed
  return newPost;
}

/**
 * Deletes a post — but only if it belongs to the current user.
 * The userId guard prevents accidentally deleting another user's post.
 */
export async function deletePost(postId) {
  await delay(30);
  posts = posts.filter(p => !(p.id === postId && p.userId === CURRENT_USER_ID));
}
