// FeedPage — the home feed showing all posts sorted newest first.
//
// Reads posts and the loading flag from useFeed() and passes them straight
// to the Feed component. All sorting and filtering happens in the API layer
// and context — this page just connects them.
import { useFeed } from "../hooks/useFeed";
import Feed from "../Components/feed/Feed";

export default function FeedPage() {
  const { posts, loading } = useFeed();
  return <Feed posts={posts} loading={loading} />;
}
