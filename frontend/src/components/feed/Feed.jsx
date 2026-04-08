// Feed — renders a list of PostCards, or appropriate placeholder states.
//
// Props:
//   posts   — array of post objects to display
//   loading — when true, shows animated skeleton placeholders instead of posts
//
// The Skeleton component mimics the rough shape of a PostCard using grey
// shimmer bars — it gives users a sense of layout while data loads.
import PostCard from "./PostCard";

// A single placeholder card shown while posts are loading
function Skeleton() {
  return (
    <div className="bb-feed-skeleton">
      {/* Simulate the username badge and timestamp row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div className="bb-skel" style={{ width: 80, height: 18 }} />
        <div className="bb-skel" style={{ width: 40, height: 18 }} />
      </div>
      {/* Simulate the pixel art canvas */}
      <div className="bb-skel" style={{ width: "100%", height: 120 }} />
      {/* Simulate the like button */}
      <div className="bb-skel" style={{ width: 60, height: 16, marginTop: 10 }} />
    </div>
  );
}

export default function Feed({ posts, loading }) {
  // Show three skeleton placeholders while the initial data fetch is in progress
  if (loading) {
    return (
      <>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </>
    );
  }

  // Empty state — shown when the feed has no posts to display
  if (!posts || posts.length === 0) {
    return (
      <div className="bb-feed-empty">
        NO POSTS YET<br />
        <span style={{ opacity: 0.6, fontSize: 8 }}>be the first to draw something</span>
      </div>
    );
  }

  // Normal state — one PostCard per post
  return (
    <>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}
