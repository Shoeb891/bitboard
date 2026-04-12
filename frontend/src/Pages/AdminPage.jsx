import { useState, useEffect } from "react";
import { apiFetch } from "../api/apiFetch";
import Loading from "../Components/Loading";

export default function AdminPage() {
  const [tab, setTab]         = useState("all");     // "all" | "flagged" | "users"
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    setLoading(true);
    var url = tab === "flagged" ? "/api/admin/posts?flagged=true" : "/api/admin/posts";
    if (tab === "users") url = "/api/admin/feed"; // re-use feed for now
    apiFetch(url).then(function(data) {
      setPosts(data);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, [tab]);

  async function removePost(postId) {
    if (!confirm("Remove this post?")) return;
    await apiFetch("/api/admin/posts/" + postId, { method: "DELETE" });
    setPosts(function(prev) { return prev.filter(function(p) { return p.id !== postId; }); });
  }

  async function suspendUser(userId) {
    if (!confirm("Suspend this user account?")) return;
    await apiFetch("/api/admin/users/" + userId + "/suspend", { method: "PATCH" });
    alert("User suspended.");
  }

  async function deleteUser(userId) {
    if (!confirm("Permanently delete this user account?")) return;
    await apiFetch("/api/admin/users/" + userId, { method: "DELETE" });
    alert("User deleted.");
  }

  async function promoteUser(userId) {
    if (!confirm("Promote this user to admin?")) return;
    await apiFetch("/api/admin/users/" + userId + "/promote", { method: "PATCH" });
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
      </div>

      {loading ? <Loading height="40vh" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.length === 0 && (
            <div className="bb-feed-empty">{tab === "flagged" ? "No flagged posts" : "No posts"}</div>
          )}

          {posts.map(function(post) {
            return (
              <div key={post.id} className="bb-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--fp)", fontSize: 9 }}>
                    @{post.username}
                    {post.isFlagged && <span style={{ color: "#d33", marginLeft: 8 }}>FLAGGED</span>}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{post.likes} likes</span>
                </div>

                {post.caption && (
                  <div style={{ fontSize: 14, marginBottom: 8, opacity: 0.8 }}>{post.caption}</div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  <button className="bb-btn" style={{ fontSize: 10 }}
                    onClick={function() { promoteUser(post.userId); }}>
                    PROMOTE ADMIN
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
