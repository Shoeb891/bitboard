// ProfileHeader — the top section of a profile page.
//
// Shows:
//   - a large username badge in the user's unique colour
//   - a follow/unfollow button (hidden on your own profile)
//   - post/follower/following counts
//   - the bio, which is inline-editable when viewing your own profile
import { useState } from "react";
import { getUserPalette } from "../../utils/palette";
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";
import FollowButton from "./FollowButton";

export default function ProfileHeader({ user, isOwnProfile }) {
  const { dispatch } = useAppContext();

  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue]     = useState(user?.bio ?? "");

  if (!user) return null;

  const palette = getUserPalette(user.id);

  async function saveBio() {
    setEditingBio(false);
    await usersApi.updateProfile({ bio: bioValue });
    dispatch({ type: "UPDATE_BIO", payload: bioValue });
  }

  return (
    <div className="bb-profile-header">
      {/* Username badge + follow button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span
          className="bb-usertag"
          style={{ background: palette.bg, color: palette.text, fontSize: 10, padding: "6px 16px" }}
        >
          {user.username}
        </span>
        {!isOwnProfile && (
          <FollowButton userId={user.id} isFollowing={user.isFollowing} />
        )}
      </div>

      {/* Stats row */}
      <div className="bb-profile-stats">
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.postCount ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>posts</span>
        </div>
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.followerCount ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>followers</span>
        </div>
        <div className="bb-profile-stat">
          <span className="bb-profile-stat-num">{user.followingCount ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>following</span>
        </div>
      </div>

      {/* Bio */}
      <div className="bb-profile-bio">
        {isOwnProfile && editingBio ? (
          <textarea
            className="bb-profile-bio-input"
            value={bioValue}
            rows={2}
            autoFocus
            onChange={function(e) { setBioValue(e.target.value); }}
            onBlur={saveBio}
            onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); saveBio(); } }}
          />
        ) : (
          <span
            title={isOwnProfile ? "Click to edit bio" : undefined}
            onClick={function() { if (isOwnProfile) setEditingBio(true); }}
            style={{ cursor: isOwnProfile ? "text" : "default" }}
          >
            {bioValue || (isOwnProfile ? <em style={{ opacity: 0.4 }}>Add a bio...</em> : "")}
          </span>
        )}
      </div>
    </div>
  );
}
