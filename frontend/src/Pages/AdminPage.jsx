// Admin moderation panel — three tabs (all / flagged / users) sharing one shell.
import { useState, useEffect } from "react";
import { apiFetch } from "../api/apiFetch";
import Loading from "../Components/Loading";
import PostCard from "../Components/feed/PostCard";
import { getUserPalette } from "../utils/palette";

// Elapsed-time label for the suspension timer; mirrors backend/src/routes/admin.js timeAgo.
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "now";
  if (s < 3600)  return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export default function AdminPage() {
  const [tab, setTab]               = useState("all");     // "all" | "flagged" | "users"
  const [posts, setPosts]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [postQuery, setPostQuery]   = useState("");
  const [userQuery, setUserQuery]   = useState("");
  const [loading, setLoading]       = useState(true);

  // Load posts (debounced 250ms on postQuery) when a posts tab is selected.
  useEffect(function() {
    if (tab !== "all" && tab !== "flagged") return;
    setUsers([]);
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(function() {
      const params = new URLSearchParams();
      if (tab === "flagged") params.set("flagged", "true");
      const q = postQuery.trim();
      if (q) params.set("q", q);
      const qs = params.toString();
      const url = "/api/admin/posts" + (qs ? "?" + qs : "");
      apiFetch(url).then(function(data) {
        if (cancelled) return;
        setPosts(data || []);
        setLoading(false);
      }).catch(function() { if (!cancelled) setLoading(false); });
    }, 250);
    return function() { cancelled = true; clearTimeout(handle); };
  }, [tab, postQuery]);

  // Load users (debounced 250ms on userQuery) when on the users tab.
  useEffect(function() {
    if (tab !== "users") return;
    setPosts([]);
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(function() {
      const q = userQuery.trim();
      const url = q ? "/api/admin/users?q=" + encodeURIComponent(q) : "/api/admin/users";
      apiFetch(url).then(function(data) {
        if (cancelled) return;
        setUsers(data || []);
        setLoading(false);
      }).catch(function() { if (!cancelled) setLoading(false); });
    }, 250);
    return function() { cancelled = true; clearTimeout(handle); };
  }, [tab, userQuery]);

  async function removePost(postId) {
    if (!confirm("Remove this post?")) return;
    await apiFetch("/api/admin/posts/" + postId, { method: "DELETE" });
    setPosts(function(prev) { return prev.filter(function(p) { return p.id !== postId; }); });
  }

  async function unflagPost(postId) {
    await apiFetch("/api/admin/posts/" + postId + "/unflag", { method: "POST" });
    // On the FLAGGED tab the post no longer matches; on ALL POSTS just clear the badge.
    if (tab === "flagged") {
      setPosts(function(prev) { return prev.filter(function(p) { return p.id !== postId; }); });
    } else {
      setPosts(function(prev) { return prev.map(function(p) { return p.id === postId ? { ...p, isFlagged: false } : p; }); });
    }
  }

  async function suspendUser(userId) {
    if (!confirm("Suspend this user account?")) return;
    await apiFetch("/api/admin/users/" + userId + "/suspend", { method: "PATCH" });
    setUsers(function(prev) {
      return prev.map(function(u) { return u.id === userId ? { ...u, status: "SUSPENDED", suspendedAt: new Date().toISOString() } : u; });
    });
    alert("User suspended.");
  }

  async function unsuspendUser(userId) {
    if (!confirm("Un-suspend this user account?")) return;
    await apiFetch("/api/admin/users/" + userId + "/unsuspend", { method: "PATCH" });
    setUsers(function(prev) {
      return prev.map(function(u) { return u.id === userId ? { ...u, status: "ACTIVE", suspendedAt: null } : u; });
    });
    alert("User un-suspended.");
  }

  async function deleteUser(userId) {
    if (!confirm("Permanently delete this user account?")) return;
    await apiFetch("/api/admin/users/" + userId, { method: "DELETE" });
    setUsers(function(prev) {
      return prev.map(function(u) { return u.id === userId ? { ...u, status: "DELETED" } : u; });
    });
    alert("User deleted.");
  }

  async function promoteUser(userId) {
    if (!confirm("Promote this user to admin?")) return;
    await apiFetch("/api/admin/users/" + userId + "/promote", { method: "PATCH" });
    setUsers(function(prev) {
      return prev.map(function(u) { return u.id === userId ? { ...u, role: "ADMIN" } : u; });
    });
    alert("User promoted to admin.");
  }

  return (
    <div>
      <h2 style={{ fontFamily: "var(--fp)", fontSize: 16, marginBottom: 16 }}>
        ADMIN PANEL
      </h2>

      <div className="bb-tabs" style={{ marginBottom: 16 }}>
        <button className={"bb-tab" + (tab === "all" ? " active" : "")} onClick={function() { setTab("all"); }}>
          ALL POSTS
        </button>
        <button className={"bb-tab" + (tab === "flagged" ? " active" : "")} onClick={function() { setTab("flagged"); }}>
          FLAGGED
        </button>
        <button className={"bb-tab" + (tab === "users" ? " active" : "")} onClick={function() { setTab("users"); }}>
          ALL USERS
        </button>
      </div>

      {tab === "users" ? (
        <UsersPanel
          loading={loading}
          users={users}
          query={userQuery}
          setQuery={setUserQuery}
          suspendUser={suspendUser}
          unsuspendUser={unsuspendUser}
          deleteUser={deleteUser}
          promoteUser={promoteUser}
        />
      ) : (
        <PostsPanel
          loading={loading}
          tab={tab}
          posts={posts}
          query={postQuery}
          setQuery={setPostQuery}
          removePost={removePost}
          unflagPost={unflagPost}
          suspendUser={suspendUser}
          deleteUser={deleteUser}
        />
      )}
    </div>
  );
}

function PostsPanel({ loading, tab, posts, query, setQuery, removePost, unflagPost, suspendUser, deleteUser }) {
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={function(e) { setQuery(e.target.value); }}
        placeholder="Search posts by caption, hashtag, or author…"
        className="bb-input"
        style={{ width: "100%", marginBottom: 12 }}
      />

      {loading ? <Loading height="40vh" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {posts.length === 0 && (
            <div className="bb-feed-empty">{tab === "flagged" ? "No flagged posts" : "No posts"}</div>
          )}

          {posts.map(function(post) {
            return (
              <div key={post.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <PostCard post={post} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 4 }}>
                  <button className="bb-btn" style={{ fontSize: 10, color: "#d33" }}
                    onClick={function() { removePost(post.id); }}>
                    REMOVE POST
                  </button>
                  {post.isFlagged && (
                    <button className="bb-btn" style={{ fontSize: 10 }}
                      onClick={function() { unflagPost(post.id); }}>
                      UNFLAG
                    </button>
                  )}
                  <button className="bb-btn" style={{ fontSize: 10 }}
                    onClick={function() { suspendUser(post.userId); }}>
                    SUSPEND USER
                  </button>
                  <button className="bb-btn" style={{ fontSize: 10 }}
                    onClick={function() { deleteUser(post.userId); }}>
                    DELETE USER
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersPanel({ loading, users, query, setQuery, suspendUser, unsuspendUser, deleteUser, promoteUser }) {
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={function(e) { setQuery(e.target.value); }}
        placeholder="Search users by username or nickname…"
        className="bb-input"
        style={{ width: "100%", marginBottom: 12 }}
      />

      {loading ? <Loading height="30vh" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.length === 0 && (
            <div className="bb-feed-empty">No users found</div>
          )}
          {users.map(function(u) { return (
            <UserRow
              key={u.id}
              user={u}
              suspendUser={suspendUser}
              unsuspendUser={unsuspendUser}
              deleteUser={deleteUser}
              promoteUser={promoteUser}
            />
          ); })}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, suspendUser, unsuspendUser, deleteUser, promoteUser }) {
  const palette = getUserPalette({ id: user.id, avatarColor: user.avatarColor });
  const statusColor = user.status === "SUSPENDED" ? "#d33" : user.status === "DELETED" ? "#888" : undefined;
  const isSuspended = user.status === "SUSPENDED";
  return (
    <div className="bb-card" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="bb-usertag" style={{ background: palette.bg, color: palette.text }}>
          {user.username}
        </span>
        {user.nickname && user.nickname !== user.username && (
          <span style={{ fontSize: 12, opacity: 0.7 }}>{user.nickname}</span>
        )}
        <span style={{ fontFamily: "var(--fp)", fontSize: 9, opacity: 0.7 }}>
          {user.role}
          {" · "}
          <span style={{ color: statusColor }}>{user.status}</span>
          {" · "}
          {user.postCount} posts
          {isSuspended && user.suspendedAt && (
            <span style={{ color: "#d33" }}>{" · suspended " + timeAgo(user.suspendedAt)}</span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="bb-btn" style={{ fontSize: 10 }}
          disabled={user.status === "SUSPENDED" || user.status === "DELETED"}
          onClick={function() { suspendUser(user.id); }}>
          SUSPEND USER
        </button>
        {isSuspended && (
          <button className="bb-btn" style={{ fontSize: 10 }}
            onClick={function() { unsuspendUser(user.id); }}>
            UNSUSPEND USER
          </button>
        )}
        <button className="bb-btn" style={{ fontSize: 10, color: "#d33" }}
          disabled={user.status === "DELETED"}
          onClick={function() { deleteUser(user.id); }}>
          DELETE USER
        </button>
        <button className="bb-btn" style={{ fontSize: 10 }}
          disabled={user.role === "ADMIN"}
          onClick={function() { promoteUser(user.id); }}>
          PROMOTE ADMIN
        </button>
      </div>
    </div>
  );
}
