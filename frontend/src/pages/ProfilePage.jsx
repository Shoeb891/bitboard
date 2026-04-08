// ProfilePage — displays a user's profile with their posts and liked posts.
//
// URL patterns:
//   /profile          — shows the currently logged-in user's own profile
//   /profile/:username — shows another user's profile
//
// Data fetching:
//   The user object is fetched from the mock API each time the route changes
//   (username param or currentUser changes). Posts are filtered from the
//   global feed in FeedContext rather than fetched separately, so newly
//   created posts appear here without a second API call.
//   Liked posts ARE fetched from the API because they aren't cached in context.
//
// Tabs:
//   POSTS — all posts by this user, newest first (filtered from FeedContext)
//   LIKED — posts this user has liked (fetched from postsApi.getLikedPosts)
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProfileHeader from "../Components/profile/ProfileHeader";
import PostGrid from "../Components/profile/PostGrid";
import * as usersApi from "../api/usersApi";
import * as postsApi from "../api/postsApi";
import { useAppContext } from "../context/AppContext";
import { useFeed } from "../hooks/useFeed";
import Loading from "../Components/Loading";

export default function ProfilePage() {
  const { username } = useParams(); // undefined when at /profile (own profile)
  const { state } = useAppContext();
  const { posts: allPosts } = useFeed();

  const [user, setUser]           = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [tab, setTab]             = useState("posts"); // "posts" or "liked"
  const [loading, setLoading]     = useState(true);

  // Re-fetch user data whenever the username param or the current user changes
  useEffect(() => {
    setLoading(true);

    // If there's no :username param, use the logged-in user directly
    const resolver = username
      ? usersApi.getUserByUsername(username)
      : Promise.resolve(state.currentUser);

    resolver.then(async u => {
      setUser(u);
      // Fetch the posts this user has liked (only if we have their liked IDs)
      if (u?.likedPostIds) {
        const liked = await postsApi.getLikedPosts(u.likedPostIds);
        setLikedPosts(liked);
      }
      setLoading(false);
    });
  }, [username, state.currentUser]);

  if (loading) return <Loading height="60vh" />;
  if (!user) return <div className="bb-feed-empty">USER NOT FOUND</div>;

  // Filter the global post list down to this user's posts
  const userPosts = allPosts.filter(p => p.userId === user.id);

  return (
    <>
      {/* ── Profile info: username, stats, bio, follow button ── */}
      <ProfileHeader user={user} />

      {/* ── Tab switcher: Posts / Liked ── */}
      <div className="bb-tabs">
        <button
          className={`bb-tab${tab === "posts" ? " active" : ""}`}
          onClick={() => setTab("posts")}
        >
          POSTS
        </button>
        <button
          className={`bb-tab${tab === "liked" ? " active" : ""}`}
          onClick={() => setTab("liked")}
        >
          LIKED
        </button>
      </div>

      {/* ── Post grid — switches between own posts and liked posts ── */}
      <PostGrid posts={tab === "posts" ? userPosts : likedPosts} />
    </>
  );
}
