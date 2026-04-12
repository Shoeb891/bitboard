import { useState, useEffect } from "react";
import { apiFetch } from "../api/apiFetch";
import Loading from "../Components/Loading";
import PostCard from "../Components/feed/PostCard";
import { getUserPalette } from "../utils/palette";

export default function AdminPage() {
  const [tab, setTab]         = useState("all");     // "all" | "flagged" | "users"
  const [posts, setPosts]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(true);

  // Load posts whenever the posts tabs are selected.
  useEffect(function() {
    if (tab !== "all" && tab !== "flagged") return;
    setLoading(true);
    setUsers([]);
    const url = tab === "flagged" ? "/api/admin/posts?flagged=true" : "/api/admin/posts";
    let cancelled = false;
    apiFetch(url).then(function(data) {
      if (cancelled) return;
      setPosts(data || []);
      setLoading(false);
    }).catch(function() { if (!cancelled) setLoading(false); });
    return function() { cancelled = true; };
  }, [tab]);

  // Load users (debounced on query) when on the users tab.
  useEffect(function() {
    if (tab !== "users") return;
    setPosts([]);
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(function() {
      const q = query.trim();
      const url = q ? "/api/admin/users?q=" + encodeURIComponent(q) : "/api/admin/users";
      apiFetch(url).then(function(data) {
        if (cancelled) return;
        setUsers(data || []);
        setLoading(false);
      }).catch(function() { if (!cancelled) setLoading(false); });
    }, 250);
    return function() { cancelled = true; clearTimeout(handle); };
  }, [tab, query]);

  async function removePost(postId) {
    if (!confirm("Remove this post?")) return;
    await apiFetch("/api/admin/posts/" + postId, { method: "DELETE" });
    setPosts(function(prev) { return prev.filter(function(p) { return p.id !== postId; }); });
  }

  async function suspendUser(userId) {
    if (!confirm("Suspend this user account?")) return;
    await apiFetch("/api/admin/users/" + userId + "/suspend", { method: "PATCH" });
    setUsers(function(prev) {
      return prev.map(function(u) { return u.id === userId ? { ...u, status: "SUSPENDED" } : u; });
    });
    alert("User suspended.");
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
          query={query}
          setQuery={setQuery}
          suspendUser={suspendUser}
          deleteUser={deleteUser}
          promoteUser={promoteUser}
        />
      ) : loading ? (
        <Loading height="40vh" />
      ) : (
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

function UsersPanel({ loading, users, query, setQuery, suspendUser, deleteUser, promoteUser }) {
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
              deleteUser={deleteUser}
              promoteUser={promoteUser}
            />
          ); })}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, suspendUser, deleteUser, promoteUser }) {
  const palette = getUserPalette({ id: user.id, avatarColor: user.avatarColor });
  const statusColor = user.status === "SUSPENDED" ? "#d33" : user.status === "DELETED" ? "#888" : undefined;
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
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="bb-btn" style={{ fontSize: 10 }}
          disabled={user.status === "SUSPENDED"}
          onClick={function() { suspendUser(user.id); }}>
          SUSPEND USER
        </button>
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
