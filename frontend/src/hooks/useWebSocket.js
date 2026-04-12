// useWebSocket — real-time notification delivery via Socket.io.
//
// Connects to the backend Socket.io server and listens for events:
//   notification:new  — new like/follow/post notification
//   post:new          — new post from a followed user
//   post:deleted      — a post was removed
//
// Drop this hook into a component that stays mounted for the app's
// lifetime (Layout does this). Cleanup disconnects the socket.
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAppContext } from "../context/AppContext";
import { useFeedContext } from "../context/FeedContext";
import { useAuthContext } from "../context/AuthContext";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "";

export function useWebSocket() {
  const { dispatch: appDispatch } = useAppContext();
  const { dispatch: feedDispatch } = useFeedContext();
  const { session } = useAuthContext();
  const socketRef = useRef(null);

  useEffect(function() {
    if (!session?.access_token) return;

    const socket = io(SOCKET_URL, {
      auth: { token: session.access_token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("notification:new", function(notif) {
      appDispatch({ type: "ADD_NOTIFICATION", payload: notif });
    });

    socket.on("post:new", function(post) {
      feedDispatch({ type: "ADD_POST", payload: post });
    });

    socket.on("post:deleted", function(data) {
      feedDispatch({ type: "DELETE_POST", payload: data.postId });
    });

    socket.on("connect_error", function(err) {
      console.warn("Socket connection error:", err.message);
    });

    return function() {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.access_token, appDispatch, feedDispatch]);
}
