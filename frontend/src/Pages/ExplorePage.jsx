// ExplorePage — public discovery feed with user search + hashtag filtering.
//
// Unlike FeedPage (which shows posts from followed users), Explore shows ALL
// posts sorted by like count, so the most popular content surfaces first.
//
// Two discovery affordances sit above the feed:
//   1. A user-search input — type to find accounts by username or nickname,
//      click a result to jump to their profile (where you can follow them).
//   2. A row of hashtag chips populated from every tag in the database,
//      sorted by popularity. Clicking a chip filters the feed to that tag.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../hooks/useFeed";
import { useFeedContext } from "../context/FeedContext";
import { useAuthContext } from "../context/AuthContext";
import Feed from "../Components/feed/Feed";
import { getUserPalette } from "../utils/palette";
import * as usersApi from "../api/usersApi";
import * as postsApi from "../api/postsApi";

export default function ExplorePage() {
  const { posts, loading, activeTag, setTagFilter } = useFeed();
  const { dispatch } = useFeedContext();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Explore owns the "all posts" fetch — FeedContext is only a shared cache
  // so like/delete mutations and WebSocket pushes land in the same place.
  useEffect(function() {
    if (!user) return;
    let cancelled = false;
    dispatch({ type: "SET_LOADING", payload: true });
    postsApi.getPosts().then(function(rows) {
      if (cancelled) return;
      dispatch({ type: "SET_POSTS", payload: rows });
    }).catch(function(err) {
      if (cancelled) return;
      console.error("Failed to load explore feed:", err);
      dispatch({ type: "SET_POSTS", payload: [] });
    });
    return function() { cancelled = true; };
  }, [user?.id, dispatch]);

  // Dynamic hashtag list fetched from the backend, sorted by popularity
  const [hashtags, setHashtags] = useState([]);

  // User search state
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);

  // Load all hashtags once on mount
  useEffect(function() {
    let cancelled = false;
    postsApi.getHashtags()
      .then(function(rows) { if (!cancelled) setHashtags(rows || []); })
      .catch(function() { if (!cancelled) setHashtags([]); });
    return function() { cancelled = true; };
  }, []);

  // Debounced user search — fires 250 ms after the last keystroke
  useEffect(function() {
    const q = query.trim();
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const handle = setTimeout(function() {
      usersApi.searchUsers(q)
        .then(function(rows) { setResults(rows || []); })
        .catch(function() { setResults([]); })
        .finally(function() { setSearching(false); });
    }, 250);
    return function() { clearTimeout(handle); };
  }, [query]);

  // Filter to the active tag (if any) and sort by likes descending
  const displayed = activeTag
    ? [...posts].filter(p => p.tags?.includes(activeTag)).sort((a, b) => b.likes - a.likes)
    : [...posts].sort((a, b) => b.likes - a.likes);

  const showingSearch = query.trim().length > 0;

  return (
    <>
      {/* ── User search ── */}
      <div className="bb-zone" style={{ marginBottom: 12, padding: 10 }}>
        <input
          type="text"
          value={query}
          onChange={function(e) { setQuery(e.target.value); }}
          placeholder="Search users by username or nickname…"
          className="bb-profile-bio-input"
          style={{ width: "100%", fontSize: 13 }}
        />
        {showingSearch && (
          <div style={{ marginTop: 10, maxHeight: 240, overflowY: "auto" }}>
            {searching ? (
              <div style={{ fontSize: 13, opacity: 0.6 }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5 }}>No users match “{query}”.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map(function(u) {
                  const p = getUserPalette(u.id);
                  return (
                    <li
                      key={u.id}
                      onClick={function() { navigate("/profile/" + u.username); }}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span className="bb-usertag" style={{ background: p.bg, color: p.text }}>
                        {u.username}
                      </span>
                      {u.nickname && u.nickname !== u.username && (
                        <span style={{ fontSize: 12, opacity: 0.6 }}>{u.nickname}</span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>
                        {u.followerCount ?? 0} followers
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Hashtag filter bar (hidden while searching users) ── */}
      {!showingSearch && (
        <div className="bb-explore-tags">
          {/* "ALL" chip clears any active tag */}
          <button
            className={`bb-chip${!activeTag ? " active" : ""}`}
            onClick={() => setTagFilter(null)}
          >
            ALL
          </button>

          {/* One chip per tag found in the database */}
          {hashtags.map(function(h) {
            const tag = h.tag;
            return (
              <button
                key={tag}
                className={`bb-chip${activeTag === tag ? " active" : ""}`}
                onClick={() => setTagFilter(activeTag === tag ? null : tag)}
                title={h.count + " post" + (h.count === 1 ? "" : "s")}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filtered feed (hidden while searching users) ── */}
      {!showingSearch && <Feed posts={displayed} loading={loading} />}
    </>
  );
}
