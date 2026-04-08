// PostGrid — 3-column thumbnail grid of posts shown on profile pages.
//
// Each cell shows a CanvasPreview thumbnail. On hover, an overlay appears
// showing the like count and (for own posts) a delete button.
//
// The thumbnail bitmap uses scale: 3 — this renders each pixel at 3×3 screen
// pixels, which is small enough to fit in a grid cell but large enough to be
// recognisable. CanvasPreview then constrains it further with CSS.
import { Heart, Trash2 } from "lucide-react";
import CanvasPreview from "../canvas/CanvasPreview";
import { DEFAULT_PALETTE } from "../../utils/palette";
import { useAppContext } from "../../context/AppContext";
import { useFeed } from "../../hooks/useFeed";

export default function PostGrid({ posts }) {
  const { state } = useAppContext();
  const { deletePost } = useFeed();
  const currentUserId = state.currentUser?.id;

  // Show an empty-state message if there are no posts to display
  if (!posts || posts.length === 0) {
    return <div className="bb-feed-empty">NO POSTS YET</div>;
  }

  return (
    <div className="bb-postgrid">
      {posts.map(post => {
        const isOwn = post.userId === currentUserId;
        // Force a small scale so the thumbnail fits neatly in the grid cell
        const thumbBitmap = { ...post.bitmap, scale: 3 };

        return (
          <div key={post.id} className="bb-postgrid-cell">
            {/* Thumbnail image — fills the cell, pixel-perfect scaling */}
            <CanvasPreview
              bitmap={thumbBitmap}
              palette={DEFAULT_PALETTE}
              maxWidth="100%"
              style={{ width: "100%", height: "100%", maxWidth: "none", objectFit: "contain" }}
            />

            {/* Hover overlay — shows likes and an optional delete button */}
            <div className="bb-postgrid-overlay">
              <span>
                <Heart size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                {" "}{post.likes}
              </span>
              {/* Delete only available for posts owned by the current user */}
              {isOwn && (
                <button
                  onClick={() => deletePost(post.id)}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 2 }}
                  title="Delete post"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
