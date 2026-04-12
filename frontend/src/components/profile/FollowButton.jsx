// FollowButton — follow/unfollow toggle for another user's profile.
//
// Props:
//   userId      — the ID of the user to follow or unfollow
//   isFollowing — whether the current user already follows this user (from API)
//   onToggle    — callback after follow/unfollow succeeds
import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";

export default function FollowButton({ userId, isFollowing: initialFollowing, onToggle }) {
  const { state } = useAppContext();
  const currentUser = state.currentUser;
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!currentUser || currentUser.id === userId) return null;

  async function handleClick() {
    setBusy(true);
    try {
      if (following) {
        await usersApi.unfollowUser(userId);
      } else {
        await usersApi.followUser(userId);
      }
      setFollowing(!following);
      if (onToggle) onToggle(!following);
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={"bb-badge" + (following ? " following" : "")}
      onClick={handleClick}
      disabled={busy}
    >
      {following ? "FOLLOWING" : "FOLLOW"}
    </button>
  );
}
