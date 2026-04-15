// ProfilePage — displays a user's profile with their posts and liked posts.
//
// URL patterns:
//   /profile          — shows the currently logged-in user's own profile
//   /profile/:username — shows another user's profile
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProfileHeader from "../Components/profile/ProfileHeader";
import PostGrid from "../Components/profile/PostGrid";
import * as usersApi from "../api/usersApi";
import * as postsApi from "../api/postsApi";
import { useAppContext } from "../context/AppContext";
import { useFeed } from "../hooks/useFeed";
import { useFeedContext } from "../context/FeedContext";
import { useAuth } from "../hooks/useAuth";
import Loading from "../Components/Loading";

export default function ProfilePage() {
  const { username } = useParams();
  const { state } = useAppContext();
  const { posts: userPosts } = useFeed();
  const { dispatch } = useFeedContext();
  const { user: authUser } = useAuth();

  const [user, setUser]             = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [tab, setTab]               = useState("posts");
  const [loading, setLoading]       = useState(true);

  const isOwnProfile = !username || (authUser && authUser.username === username);

  useEffect(function() {
    setLoading(true);
    dispatch({ type: "SET_POSTS", payload: [] });

    var resolver;
    if (isOwnProfile) {
      // For own profile, use the auth user but also fetch full profile with counts
      resolver = usersApi.getCurrentUser();
    } else {
      resolver = usersApi.getUserByUsername(username);
    }

    resolver.then(function(u) {
      setUser(u);
      if (!u || !u.id) {
        setLoading(false);
        return;
      }
      // Load this user's posts into FeedContext so LikeButton / delete /
      // WebSocket pushes mutate the same shared store the other pages use.
      // Wait for posts before clearing loading so the grid never flashes empty.
      var postsP = postsApi.getPostsByUser(u.id)
        .then(function(rows) { dispatch({ type: "SET_POSTS", payload: rows }); })
        .catch(function() { dispatch({ type: "SET_POSTS", payload: [] }); });
      var likedP = postsApi.getLikedPosts(u.id)
        .then(function(liked) { setLikedPosts(liked); })
        .catch(function() { setLikedPosts([]); });
      Promise.all([postsP, likedP]).then(function() { setLoading(false); });
    }).catch(function() {
      setUser(null);
      setLoading(false);
    });
  }, [username, isOwnProfile, dispatch]);

  // Re-sync bio edits from AppContext
  useEffect(function() {
    if (isOwnProfile && state.currentUser && user) {
      setUser(function(prev) { return prev ? { ...prev, bio: state.currentUser.bio } : prev; });
    }
  }, [state.currentUser?.bio]);

  if (loading) return <Loading height="60vh" />;
  if (!user) return <div className="bb-feed-empty">USER NOT FOUND</div>;

  return (
    <>
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />

      <div className="bb-tabs">
        <button
          className={"bb-tab" + (tab === "posts" ? " active" : "")}
          onClick={function() { setTab("posts"); }}
        >
          POSTS
        </button>
        <button
          className={"bb-tab" + (tab === "liked" ? " active" : "")}
          onClick={function() { setTab("liked"); }}
        >
          LIKED
        </button>
      </div>

      <PostGrid posts={tab === "posts" ? userPosts : likedPosts} />
    </>
  );
}
