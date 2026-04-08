// Root application component — sets up the context providers and route tree.
//
// Provider hierarchy (outer → inner):
//   AppProvider  — holds current user, theme, and notifications
//   FeedProvider — holds all posts, users, and the active tag filter
//
// Route structure:
//   /            → redirects to /feed
//   /feed        → chronological post feed
//   /explore     → discovery feed with hashtag filters
//   /draw        → pixel drawing editor
//   /animate     → frame-by-frame animation builder
//   /profile     → own profile (no :username param)
//   /profile/:u  → another user's profile
//   /settings    → appearance and account settings
//   /demo        → the original Bitboard.jsx standalone demo (kept for reference)
//
// All routes except /demo render inside Layout, which provides the sidebar,
// topbar, and the animated grid background shared across every page.
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { FeedProvider } from "./context/FeedContext";
import Layout from "./Pages/Layout";
import FeedPage from "./Pages/FeedPage";
import ExplorePage from "./Pages/ExplorePage";
import DrawPage from "./Pages/DrawPage";
import ProfilePage from "./Pages/ProfilePage";
import SettingsPage from "./Pages/SettingsPage";
import Bitboard from "./Pages/Bitboard";
import AnimationRoom from "./Components/animation/AnimationRoom";

export default function App() {
  return (
    <AppProvider>
      <FeedProvider>
        <Routes>
          {/* All main pages share the Layout shell (sidebar + topbar) */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/feed" replace />} />
            <Route path="feed"              element={<FeedPage />} />
            <Route path="explore"           element={<ExplorePage />} />
            <Route path="draw"              element={<DrawPage />} />
            <Route path="animate"           element={<AnimationRoom />} />
            <Route path="profile"           element={<ProfilePage />} />
            <Route path="profile/:username" element={<ProfilePage />} />
            <Route path="settings"          element={<SettingsPage />} />
          </Route>

          {/* Standalone demo — the original self-contained Bitboard.jsx mockup */}
          <Route path="/demo" element={<Bitboard />} />
        </Routes>
      </FeedProvider>
    </AppProvider>
  );
}
