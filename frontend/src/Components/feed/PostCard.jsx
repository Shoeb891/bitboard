// PostCard — renders a single post in the feed.
//
// Each post contains:
//   - a coloured diagonal username badge (UserTag)
//   - the pixel art drawn onto an HTML <canvas> element
//   - a like button showing the current count
//   - an optional caption and clickable hashtags
//   - a delete button (only visible on hover, only shown to the post's author)
//
// Canvas rendering:
//   renderBitmapToCanvas() from bitmap.js is called inside a useEffect so the
//   canvas is drawn after the DOM node exists. The dependency is [post.id]
//   rather than [post.bitmap] because bitmaps are immutable after creation —
//   the ID changing (a different post) is the only time we need to redraw.
import { useRef, useEffect, useState } from "react";
import { Trash2, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { renderBitmapToCanvas } from "../../utils/bitmap";
import { DEFAULT_PALETTE, getUserPalette } from "../../utils/palette";
import { useAppContext } from "../../context/AppContext";
import { useFeed } from "../../hooks/useFeed";
import * as postsApi from "../../api/postsApi";
import LikeButton from "./LikeButton";

// ── UserTag ──────────────────────────────────────────────────────────────────
// Small diagonal badge showing the post author's username in their unique colour.
// The colour is derived deterministically from the userId so it never changes.
function UserTag({ username, userId }) {
  const palette = getUserPalette(userId);
  return (
    <span
      className="bb-usertag"
      style={{ background: palette.bg, color: palette.text }}
    >
      {username}
    </span>
  );
}

// ── PostCard ─────────────────────────────────────────────────────────────────
export default function PostCard({ post }) {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { state } = useAppContext();
  const { deletePost, setTagFilter } = useFeed();

  // True when the logged-in user owns this post — shows the delete button
  const isOwn = state.currentUser?.id === post.userId;
  const [flagged, setFlagged] = useState(Boolean(post.isFlagged));

  async function handleFlag() {
    if (flagged) return;
    try {
      await postsApi.flagPost(post.id);
      setFlagged(true);
    } catch (err) {
      console.warn("Flag failed:", err.message);
    }
  }

  // Draw the bitmap onto the canvas after the component mounts.
  // renderBitmapToCanvas handles both binary (0/1) and full-colour (0-15) pixel arrays.
  useEffect(() => {
    if (canvasRef.current) {
      renderBitmapToCanvas(canvasRef.current, post.bitmap, DEFAULT_PALETTE);
    }
  }, [post.id]); // re-run only if a different post is rendered into this card

  return (
    <div className="bb-post bb-zone">
      {/* ── Header: username badge, timestamp, delete button ── */}
      <div className="bb-post-header">
        <div className="bb-post-meta">
          <UserTag username={post.username} userId={post.userId} />
          <span className="bb-post-time">{post.timestamp}</span>
        </div>

        {/* Delete button — only rendered for the current user's own posts,
            and only becomes visible on hover via CSS (.bb-post:hover .bb-delete-btn) */}
        {isOwn ? (
          <button
            className="bb-delete-btn"
            onClick={() => deletePost(post.id)}
            title="Delete post"
          >
            <Trash2 size={14} />
          </button>
        ) : state.currentUser && (
          <button
            className="bb-delete-btn"
            onClick={handleFlag}
            disabled={flagged}
            title={flagged ? "Flagged for review" : "Flag post"}
            style={{ opacity: flagged ? 0.5 : undefined }}
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {/* ── Pixel art canvas — drawn by renderBitmapToCanvas in the useEffect above ── */}
      <canvas ref={canvasRef} className="bb-post-canvas" />

      {/* ── Footer: like button ── */}
      <div className="bb-post-footer">
        <LikeButton postId={post.id} liked={post.liked} count={post.likes} />
      </div>

      {/* ── Optional caption ── */}
      {post.caption && (
        <div className="bb-post-caption">{post.caption}</div>
      )}

      {/* ── Hashtag chips — clicking one jumps to Explore with that tag active ── */}
      {post.tags?.length > 0 && (
        <div className="bb-post-tags">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="bb-tag"
              onClick={() => {
                setTagFilter(tag);  // set the active tag in FeedContext
                navigate("/explore"); // navigate to the Explore page
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
