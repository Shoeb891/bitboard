// FollowButton — follow/unfollow toggle for another user's profile.
//
// Props:
//   userId — the ID of the user to follow or unfollow
//
// The button renders nothing when:
//   - there is no current user (shouldn't happen, but guards against it)
//   - the userId matches the current user (you can't follow yourself)
//
// On click it calls the API to persist the change, then dispatches TOGGLE_FOLLOW
// to AppContext so the current user's `following` array updates immediately
// without waiting for a full data refetch.
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";

export default function FollowButton({ userId }) {
  const { state, dispatch } = useAppContext();
  const currentUser = state.currentUser;

  // Don't render if there's no logged-in user, or if viewing your own profile
  if (!currentUser || currentUser.id === userId) return null;

  // Check if the current user is already following this user
  const isFollowing = currentUser.following?.includes(userId);

  async function handleClick() {
    // Call the appropriate API function first (updates the mock store)
    if (isFollowing) {
      await usersApi.unfollowUser(userId);
    } else {
      await usersApi.followUser(userId);
    }
    // Then update AppContext so the button label flips immediately
    // isFollowing here is the state BEFORE the click — the reducer does the inverse
    dispatch({ type: "TOGGLE_FOLLOW", payload: { userId, isFollowing } });
  }

  return (
    <button
      className={`bb-badge${isFollowing ? " following" : ""}`}
      onClick={handleClick}
    >
      {isFollowing ? "FOLLOWING" : "FOLLOW"}
    </button>
  );
}
