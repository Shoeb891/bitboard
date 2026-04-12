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
import { useAuth } from "../hooks/useAuth";
import Loading from "../Components/Loading";

export default function ProfilePage() {
  const { username } = useParams();
  const { state } = useAppContext();
  const { posts: allPosts } = useFeed();
  const { user: authUser } = useAuth();

  const [user, setUser]             = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [tab, setTab]               = useState("posts");
  const [loading, setLoading]       = useState(true);

  const isOwnProfile = !username || (authUser && authUser.username === username);

  useEffect(function() {
    setLoading(true);

    var resolver;
    if (isOwnProfile) {
      // For own profile, use the auth user but also fetch full profile with counts
      resolver = usersApi.getCurrentUser();
    } else {
      resolver = usersApi.getUserByUsername(username);
    }

    resolver.then(function(u) {
      setUser(u);
      // Fetch liked posts
      if (u && u.id) {
        postsApi.getLikedPosts(u.id).then(function(liked) {
          setLikedPosts(liked);
        }).catch(function() { setLikedPosts([]); });
      }
      setLoading(false);
    }).catch(function() {
      setUser(null);
      setLoading(false);
    });
  }, [username, isOwnProfile]);

  // Re-sync bio edits from AppContext
  useEffect(function() {
    if (isOwnProfile && state.currentUser && user) {
      setUser(function(prev) { return prev ? { ...prev, bio: state.currentUser.bio } : prev; });
    }
  }, [state.currentUser?.bio]);

  if (loading) return <Loading height="60vh" />;
  if (!user) return <div className="bb-feed-empty">USER NOT FOUND</div>;

  // Filter the global post list down to this user's posts
  var userPosts = allPosts.filter(function(p) { return p.userId === user.id; });

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
