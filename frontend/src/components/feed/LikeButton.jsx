// LikeButton — heart toggle shown at the bottom of every post card.
//
// Props:
//   postId  — ID of the post to like/unlike
//   liked   — whether the current user has already liked this post
//   count   — total like count to display beside the heart
//
// Calls useFeed().likePost() which updates the mock API and then syncs
// the change into FeedContext so every PostCard re-renders with the new count.
import { useFeed } from "../../hooks/useFeed";

export default function LikeButton({ postId, liked, count }) {
  const { likePost } = useFeed();

  return (
    <button
      className={`bb-like-btn${liked ? " liked" : ""}`} // "liked" class turns the heart red
      onClick={() => likePost(postId)}
    >
      {/* Filled heart when liked, outline heart when not */}
      <span className="bb-like-heart">{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
