// ProfileHeader — the top section of a profile page.
//
// Shows:
//   - a large username badge in the user's unique colour
//   - a follow/unfollow button (hidden on your own profile)
//   - post/follower/following counts
//   - the bio, which is inline-editable when viewing your own profile
//
// Inline bio editing:
//   Clicking the bio text on your own profile switches it to a <textarea>.
//   Pressing Enter or clicking away (onBlur) saves the change to the mock API
//   and dispatches UPDATE_BIO to AppContext so other components stay in sync.
import { useState } from "react";
import { getUserPalette } from "../../utils/palette";
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";
import FollowButton from "./FollowButton";

export default function ProfileHeader({ user }) {
  const { state, dispatch } = useAppContext();

  // True when the logged-in user is viewing their own profile
  const isOwnProfile = state.currentUser?.id === user?.id;

  // Local state for the bio editor — starts with the user's current bio
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue]     = useState(user?.bio ?? "");

  // Render nothing if the user hasn't loaded yet
  if (!user) return null;

  const palette = getUserPalette(user.id);

  // Save the bio to the mock API and update AppContext
  async function saveBio() {
    setEditingBio(false);
    await usersApi.updateBio(bioValue);
    dispatch({ type: "UPDATE_BIO", payload: bioValue });
  }

  return (
    <div className="bb-profile-header">
      {/* ── Username badge + follow button ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span
          className="bb-usertag"
          style={{ background: palette.bg, color: palette.text, fontSize: 10, padding: "6px 16px" }}
        >
          {user.username}
        </span>
        {/* FollowButton renders nothing when viewing your own profile */}
        <FollowButton userId={user.id} />
      </div>

      {/* ── Stats row: posts / followers / following ── */}
      <div className="bb-profile-stats">
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.postIds?.length ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>posts</span>
        </div>
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.followers?.length ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>followers</span>
        </div>
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.following?.length ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>following</span>
        </div>
      </div>

      {/* ── Bio — textarea while editing, plain span otherwise ── */}
      <div className="bb-profile-bio">
        {isOwnProfile && editingBio ? (
          // Editing mode: autoFocus so the user can start typing immediately
          <textarea
            className="bb-profile-bio-input"
            value={bioValue}
            rows={2}
            autoFocus
            onChange={e => setBioValue(e.target.value)}
            onBlur={saveBio}  // save when the user clicks away
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveBio(); } }}
          />
        ) : (
          // Display mode: clicking activates edit mode on your own profile
          <span
            title={isOwnProfile ? "Click to edit bio" : undefined}
            onClick={() => isOwnProfile && setEditingBio(true)}
            style={{ cursor: isOwnProfile ? "text" : "default" }}
          >
            {bioValue || (isOwnProfile ? <em style={{ opacity: 0.4 }}>Add a bio...</em> : "")}
          </span>
        )}
      </div>
    </div>
  );
}
