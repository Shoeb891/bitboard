// useWebSocket — simulates real-time notification delivery.
//
// In a real app this hook would open a WebSocket connection to the backend
// and listen for events (new likes, follows, posts). For now it uses
// setInterval to drip in random notifications from the FAKE_INCOMING list,
// so the notification bell and dropdown behave as if the server is sending
// live updates.
//
// This is a "side-effect-only" hook — it returns nothing. Just drop it into
// a component that stays mounted for the app's lifetime (Layout does this).
// The cleanup function in useEffect clears the timer when the component
// unmounts, preventing memory leaks.
import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { FAKE_INCOMING } from "../assets/mockData";

// Module-level counter so notification IDs don't collide with the mock data IDs
let notifCounter = 100;

export function useWebSocket() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    // Schedules itself recursively so the interval is random each time
    // (between 45 and 90 seconds), rather than a fixed interval
    function scheduleNext() {
      const delay = 45_000 + Math.random() * 45_000;
      return setTimeout(() => {
        // Pick a random notification template from the list
        const template = FAKE_INCOMING[Math.floor(Math.random() * FAKE_INCOMING.length)];
        dispatch({
          type: "ADD_NOTIFICATION",
          payload: {
            id: `notif_live_${++notifCounter}`,
            type: template.type,
            fromUsername: template.fromUsername,
            postId: null,
            read: false,       // new arrivals are always unread
            timestamp: "now",
            createdAt: Date.now(),
            message: template.message,
          },
        });
        // Schedule the next one after this one fires
        timerId = scheduleNext();
      }, delay);
    }

    let timerId = scheduleNext();
    // Clear the pending timer if Layout ever unmounts
    return () => clearTimeout(timerId);
  }, [dispatch]);
}
