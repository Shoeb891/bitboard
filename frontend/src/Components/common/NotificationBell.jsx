// NotificationBell — bell icon in the NavBar that shows unread count and a dropdown.
//
// Clicking the bell toggles an inline dropdown listing the most recent
// notifications. Clicking any notification marks it as read. A "Mark all read"
// button appears when there are unread items.
//
// Clicking outside the dropdown closes it — this is handled by a
// mousedown listener attached to the document, which is cleaned up on unmount.
import { useState, useRef, useEffect } from "react";
import { Bell, Heart, UserPlus, Image } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import * as usersApi from "../../api/usersApi";

// Maps notification type strings to small icons shown beside each item
const TYPE_ICON = {
  like:   <Heart size={12} />,
  follow: <UserPlus size={12} />,
  post:   <Image size={12} />,
};

export default function NotificationBell() {
  const { state, dispatch } = useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef(null); // ref on the wrapper div so we can detect outside clicks

  // Count how many notifications haven't been read yet — shown on the badge
  const unread = state.notifications.filter(n => !n.read).length;
  // Only show the 6 most recent notifications in the dropdown
  const recent = state.notifications.slice(0, 6);

  // Close the dropdown when the user clicks anywhere outside this component
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--black)", position: "relative",
          display: "flex", alignItems: "center", padding: "4px",
        }}
      >
        <Bell size={16} />

        {/* Red unread count badge — only visible when there are unread notifications */}
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#e63946", color: "#fff", borderRadius: "50%",
            width: 14, height: 14, fontSize: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--fp)", lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="bb-notif-dropdown">
          {/* Header row with title and "mark all" button */}
          <div className="bb-notif-header">
            <span>NOTIFICATIONS</span>
            {unread > 0 && (
              <button
                className="bb-btn"
                style={{ padding: "3px 8px", fontSize: 7 }}
                onClick={() => { usersApi.markAllNotificationsRead(); dispatch({ type: "MARK_ALL_READ" }); }}
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {recent.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", fontSize: 13, opacity: 0.5 }}>
              No notifications yet
            </div>
          )}

          {/* Notification rows — clicking one marks it as read */}
          {recent.map(n => (
            <div
              key={n.id}
              className={`bb-notif-item${n.read ? "" : " unread"}`}
              onClick={() => { if (!n.read) usersApi.markNotificationRead(n.id); dispatch({ type: "MARK_READ", payload: n.id }); }}
              style={{ cursor: "pointer" }}
            >
              {/* Purple dot on the left for unread items */}
              {!n.read && <div className="bb-notif-dot" />}
              <span style={{ opacity: 0.6 }}>{TYPE_ICON[n.type]}</span>
              <div>
                <div>{n.message}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{n.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
