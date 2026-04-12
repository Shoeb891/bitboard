// ProfileHeader — the top section of a profile page.
//
// Shows:
//   - a large username badge in the user's unique colour
//   - a follow/unfollow button (hidden on your own profile)
//   - post/follower/following counts
//   - the bio, which is inline-editable when viewing your own profile
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserPalette } from "../../utils/palette";
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";
import FollowButton from "./FollowButton";

export default function ProfileHeader({ user, isOwnProfile }) {
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue]     = useState(user?.bio ?? "");
  const [openList, setOpenList]     = useState(null); // "followers" | "following" | null
  const [listData, setListData]     = useState([]);
  const [listLoading, setListLoading] = useState(false);

  if (!user) return null;

  const palette = getUserPalette(user.id);

  async function saveBio() {
    setEditingBio(false);
    await usersApi.updateProfile({ bio: bioValue });
    dispatch({ type: "UPDATE_BIO", payload: bioValue });
  }

  async function toggleList(which) {
    if (openList === which) {
      setOpenList(null);
      return;
    }
    setOpenList(which);
    setListLoading(true);
    try {
      const rows = which === "followers"
        ? await usersApi.getFollowers(user.id)
        : await usersApi.getFollowing(user.id);
      setListData(rows);
    } catch (err) {
      setListData([]);
    } finally {
      setListLoading(false);
    }
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
        <div
          className="bb-profile-stat"
          onClick={function() { toggleList("followers"); }}
          style={{ cursor: "pointer" }}
          title="View followers"
        >
          <span className="bb-profile-stat-num">{user.followerCount ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>followers</span>
        </div>
        <div
          className="bb-profile-stat"
          onClick={function() { toggleList("following"); }}
          style={{ cursor: "pointer" }}
          title="View following"
        >
          <span className="bb-profile-stat-num">{user.followingCount ?? 0}</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>following</span>
        </div>
      </div>

      {/* Expandable followers/following list */}
      {openList && (
        <div style={{ marginTop: 10, padding: 10, border: "var(--border)", borderRadius: 6, maxHeight: 240, overflowY: "auto" }}>
          <div style={{ fontFamily: "var(--fp)", fontSize: 8, opacity: 0.6, marginBottom: 8, textTransform: "uppercase" }}>
            {openList}
          </div>
          {listLoading ? (
            <div style={{ fontSize: 13, opacity: 0.6 }}>Loading…</div>
          ) : listData.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.5 }}>No {openList} yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {listData.map(function(u) {
                const p = getUserPalette(u.id);
                return (
                  <li
                    key={u.id}
                    onClick={function() { setOpenList(null); navigate("/profile/" + u.username); }}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="bb-usertag" style={{ background: p.bg, color: p.text }}>
                      {u.username}
                    </span>
                    {u.nickname && u.nickname !== u.username && (
                      <span style={{ fontSize: 12, opacity: 0.6 }}>{u.nickname}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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
