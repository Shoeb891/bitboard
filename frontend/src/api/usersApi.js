// Users API — mock in-memory implementation.
//
// Same pattern as postsApi: module-level array acts as the database,
// every function is async and returns shallow copies so consumers
// cannot mutate the store directly.
import { MOCK_USERS, CURRENT_USER_ID } from "../assets/mockData";

// Deep-enough copy to keep followers/following arrays independent per user
let users = MOCK_USERS.map(u => ({ ...u, followers: [...u.followers], following: [...u.following] }));

const delay = (ms = 60) => new Promise(r => setTimeout(r, ms));

/** Look up a user by their internal ID. Returns null if not found. */
export async function getUser(userId) {
  await delay();
  return { ...(users.find(u => u.id === userId) ?? null) };
}

/** Look up a user by their public @username. Returns null if not found. */
export async function getUserByUsername(username) {
  await delay();
  const u = users.find(u => u.username === username);
  return u ? { ...u } : null;
}

/** Convenience wrapper — always returns the logged-in user (jeffery_owns). */
export async function getCurrentUser() {
  return getUser(CURRENT_USER_ID);
}

/**
 * Follows a user.
 * Updates both sides of the relationship:
 *  - adds targetId to the current user's `following` list
 *  - adds CURRENT_USER_ID to the target's `followers` list
 * Guards against duplicate entries with `.includes()`.
 */
export async function followUser(targetId) {
  await delay(30);
  users = users.map(u => {
    if (u.id === CURRENT_USER_ID && !u.following.includes(targetId))
      return { ...u, following: [...u.following, targetId] };
    if (u.id === targetId && !u.followers.includes(CURRENT_USER_ID))
      return { ...u, followers: [...u.followers, CURRENT_USER_ID] };
    return u;
  });
}

/**
 * Unfollows a user.
 * Mirrors followUser — removes both sides of the relationship.
 */
export async function unfollowUser(targetId) {
  await delay(30);
  users = users.map(u => {
    if (u.id === CURRENT_USER_ID)
      return { ...u, following: u.following.filter(id => id !== targetId) };
    if (u.id === targetId)
      return { ...u, followers: u.followers.filter(id => id !== CURRENT_USER_ID) };
    return u;
  });
}

/** Updates the bio of the current user and returns the refreshed user object. */
export async function updateBio(bio) {
  await delay(30);
  users = users.map(u => u.id === CURRENT_USER_ID ? { ...u, bio } : u);
  return getUser(CURRENT_USER_ID);
}

/** Returns every user — used by FeedProvider to seed the users list. */
export async function getAllUsers() {
  await delay();
  return users.map(u => ({ ...u }));
}
