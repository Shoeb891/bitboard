// ExplorePage — public discovery feed with hashtag filtering.
//
// Unlike FeedPage (which shows posts from followed users), Explore shows ALL
// posts sorted by like count, so the most popular content surfaces first.
//
// A row of hashtag chip buttons at the top lets users filter to a specific tag.
// Clicking an active tag a second time clears the filter and shows everything.
// Clicking a hashtag on a PostCard also navigates here with that tag pre-selected
// (PostCard calls setTagFilter then navigate("/explore")).
import { useFeed } from "../hooks/useFeed";
import Feed from "../Components/feed/Feed";

// The predefined tags shown as filter chips at the top of the page
const ALL_TAGS = ["#pixelart", "#retro", "#abstract", "#wave", "#grid", "#noise", "#pulse", "#diamond", "#animation"];

export default function ExplorePage() {
  const { posts, loading, activeTag, setTagFilter } = useFeed();

  // Filter to the active tag (if any) and sort by likes descending
  const displayed = activeTag
    ? [...posts].filter(p => p.tags?.includes(activeTag)).sort((a, b) => b.likes - a.likes)
    : [...posts].sort((a, b) => b.likes - a.likes);

  return (
    <>
      {/* ── Hashtag filter bar ── */}
      <div className="bb-explore-tags">
        {/* "ALL" chip clears any active tag */}
        <button
          className={`bb-chip${!activeTag ? " active" : ""}`}
          onClick={() => setTagFilter(null)}
        >
          ALL
        </button>

        {/* One chip per tag — clicking an already-active tag clears the filter */}
        {ALL_TAGS.map(tag => (
          <button
            key={tag}
            className={`bb-chip${activeTag === tag ? " active" : ""}`}
            onClick={() => setTagFilter(activeTag === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* ── Filtered feed ── */}
      <Feed posts={displayed} loading={loading} />
    </>
  );
}
