// ExplorePage — public discovery feed with unified search + hashtag filtering.
//
// Unlike FeedPage (which shows posts from followed users), Explore shows ALL
// posts sorted by like count, so the most popular content surfaces first.
//
// Two discovery affordances sit above the feed:
//   1. A unified search input — type to find accounts (username/nickname) and
//      hashtags in the same dropdown. Prefix the query with `#` to search
//      hashtags only. Clicking a user jumps to their profile; clicking a
//      hashtag applies the tag filter (same effect as clicking a chip).
//   2. A row of hashtag chips populated from every tag in the database,
//      sorted by popularity. The strip collapses to ~2 rows with a
//      SHOW MORE / SHOW LESS toggle when there are more tags than fit.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../hooks/useFeed";
import { useFeedContext } from "../context/FeedContext";
import { useAuthContext } from "../context/AuthContext";
import Feed from "../Components/feed/Feed";
import { getUserPalette } from "../utils/palette";
import * as usersApi from "../api/usersApi";
import * as postsApi from "../api/postsApi";

// Pixel cap that matches the `.bb-explore-tags.collapsed` CSS rule —
// keep these two values in sync.
const CHIP_STRIP_COLLAPSED_MAX = 80;

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

  // Unified search state
  const [query, setQuery]         = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load all hashtags once on mount
  useEffect(function() {
    let cancelled = false;
    postsApi.getHashtags()
      .then(function(rows) { if (!cancelled) setHashtags(rows || []); })
      .catch(function() { if (!cancelled) setHashtags([]); });
    return function() { cancelled = true; };
  }, []);

  const trimmed = query.trim();
  const isHashtagMode = trimmed.startsWith("#");

  // Client-side hashtag match against the in-memory list (no extra API call).
  // Strip leading # from query + tag so "#c" and "c" both match "#cats".
  const matchedHashtags = useMemo(function() {
    if (!trimmed) return [];
    const needle = trimmed.replace(/^#/, "").toLowerCase();
    if (!needle) return hashtags.slice(0, 20);
    return hashtags.filter(function(h) {
      return h.tag.toLowerCase().replace(/^#/, "").includes(needle);
    }).slice(0, 20);
  }, [trimmed, hashtags]);

  // Debounced user search — skipped in hashtag-only mode to save a roundtrip
  useEffect(function() {
    if (!trimmed || isHashtagMode) {
      setUserResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(function() {
      usersApi.searchUsers(trimmed)
        .then(function(rows) { setUserResults(rows || []); })
        .catch(function() { setUserResults([]); })
        .finally(function() { setSearching(false); });
    }, 250);
    return function() { clearTimeout(handle); };
  }, [trimmed, isHashtagMode]);

  function selectHashtag(tag) {
    setTagFilter(tag);
    setQuery("");
  }

  // Filter to the active tag (if any) and sort by likes descending
  const displayed = activeTag
    ? [...posts].filter(p => p.tags?.includes(activeTag)).sort((a, b) => b.likes - a.likes)
    : [...posts].sort((a, b) => b.likes - a.likes);

  const showingSearch = trimmed.length > 0;

  // ── Collapsible chip strip ──
  const chipStripRef = useRef(null);
  const [collapsed, setCollapsed] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  // Measure overflow whenever the chip list or container width changes.
  // scrollHeight reports the natural content height regardless of the
  // max-height cap, so this works in both collapsed and expanded states.
  useEffect(function() {
    const el = chipStripRef.current;
    if (!el) return;
    function measure() {
      const overflow = el.scrollHeight > CHIP_STRIP_COLLAPSED_MAX + 1;
      setHasOverflow(overflow);
      if (overflow) {
        let hidden = 0;
        const chips = el.querySelectorAll(".bb-chip");
        chips.forEach(function(c) {
          if (c.offsetTop >= CHIP_STRIP_COLLAPSED_MAX) hidden++;
        });
        setHiddenCount(hidden);
      } else {
        setHiddenCount(0);
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return function() {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hashtags]);

  // If the active tag lives below the fold while the strip is collapsed,
  // expand automatically so users can see which filter is on.
  useEffect(function() {
    if (!activeTag || !collapsed) return;
    const el = chipStripRef.current;
    if (!el) return;
    const activeChips = el.querySelectorAll(".bb-chip.active");
    activeChips.forEach(function(c) {
      if (c.offsetTop >= CHIP_STRIP_COLLAPSED_MAX) setCollapsed(false);
    });
  }, [activeTag, hashtags, collapsed]);

  const hasMatches = matchedHashtags.length > 0 || userResults.length > 0;
  const showNoMatches = showingSearch && !searching && !hasMatches;

  return (
    <>
      {/* ── Unified search (users + hashtags) ── */}
      <div className="bb-zone" style={{ marginBottom: 12, padding: 10 }}>
        <input
          type="text"
          value={query}
          onChange={function(e) { setQuery(e.target.value); }}
          placeholder="Search users or #hashtags…"
          className="bb-profile-bio-input"
          style={{ width: "100%", fontSize: 13 }}
        />
        {showingSearch && (
          <div style={{ marginTop: 10, maxHeight: 300, overflowY: "auto" }}>
            {matchedHashtags.length > 0 && (
              <>
                <div className="bb-search-section-header">HASHTAGS</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {matchedHashtags.map(function(h) {
                    return (
                      <li
                        key={h.tag}
                        onClick={function() { selectHashtag(h.tag); }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                      >
                        <span className="bb-chip" style={{ pointerEvents: "none" }}>{h.tag}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.55 }}>
                          {h.count} post{h.count === 1 ? "" : "s"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {!isHashtagMode && (
              <>
                <div className="bb-search-section-header">USERS</div>
                {searching ? (
                  <div style={{ fontSize: 13, opacity: 0.6 }}>Searching…</div>
                ) : userResults.length === 0 ? (
                  matchedHashtags.length === 0 ? null : (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>No users match “{trimmed}”.</div>
                  )
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: "4px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                    {userResults.map(function(u) {
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
              </>
            )}

            {showNoMatches && (
              <div style={{ fontSize: 13, opacity: 0.5 }}>No matches for “{trimmed}”.</div>
            )}
          </div>
        )}
      </div>

      {/* ── Hashtag filter bar (hidden while searching) ── */}
      {!showingSearch && (
        <>
          <div
            ref={chipStripRef}
            className={"bb-explore-tags" + (collapsed && hasOverflow ? " collapsed" : "")}
          >
            <button
              className={`bb-chip${!activeTag ? " active" : ""}`}
              onClick={() => setTagFilter(null)}
            >
              ALL
            </button>

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

          {hasOverflow && (
            <div className="bb-chip-toggle-row">
              <button
                className="bb-chip-toggle"
                onClick={function() { setCollapsed(function(c) { return !c; }); }}
              >
                {collapsed
                  ? "SHOW MORE" + (hiddenCount > 0 ? " (+" + hiddenCount + ")" : "")
                  : "SHOW LESS"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Filtered feed (hidden while searching) ── */}
      {!showingSearch && <Feed posts={displayed} loading={loading} />}
    </>
  );
}
