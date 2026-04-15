// Wrappers around /api/users/*, /api/auth/me, and /api/notifications/*.
import { apiFetch } from "./apiFetch";

/** Look up a user by their public @username. */
export async function getUserByUsername(username) {
  return apiFetch("/api/users/" + encodeURIComponent(username));
}

/** Search users by username or nickname (case-insensitive, up to 20 results). */
export async function searchUsers(query) {
  return apiFetch("/api/users/search?q=" + encodeURIComponent(query));
}

/** Get the current user's profile (requires auth). */
export async function getCurrentUser() {
  return apiFetch("/api/auth/me");
}

/** Follow a user. */
export async function followUser(targetId) {
  return apiFetch("/api/users/" + targetId + "/follow", { method: "POST" });
}

/** Unfollow a user. */
export async function unfollowUser(targetId) {
  return apiFetch("/api/users/" + targetId + "/follow", { method: "DELETE" });
}

/** Update current user's profile fields. */
export async function updateProfile(fields) {
  return apiFetch("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

/** Get a user's followers list. */
export async function getFollowers(userId) {
  return apiFetch("/api/users/" + userId + "/followers");
}

/** Get a user's following list. */
export async function getFollowing(userId) {
  return apiFetch("/api/users/" + userId + "/following");
}

/** Fetch notifications for the current user. */
export async function getNotifications() {
  return apiFetch("/api/notifications");
}

/** Mark a single notification as read. */
export async function markNotificationRead(id) {
  return apiFetch("/api/notifications/" + id + "/read", { method: "PATCH" });
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "PATCH" });
}

/** Delete a notification. */
export async function deleteNotification(id) {
  return apiFetch("/api/notifications/" + id, { method: "DELETE" });
}
