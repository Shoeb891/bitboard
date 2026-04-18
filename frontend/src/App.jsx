import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { FeedProvider } from "./context/FeedContext";
import AuthGuard from "./Components/auth/AuthGuard";
import Layout from "./Pages/Layout";
import FeedPage from "./Pages/FeedPage";
import ExplorePage from "./Pages/ExplorePage";
import DrawPage from "./Pages/DrawPage";
import ProfilePage from "./Pages/ProfilePage";
import SettingsPage from "./Pages/SettingsPage";
import LoginPage from "./Pages/LoginPage";
import RegisterPage from "./Pages/RegisterPage";
import AdminPage from "./Pages/AdminPage";
import Bitboard from "./Pages/Bitboard";
import AnimationRoom from "./Components/animation/AnimationRoom";
import GamePage from "./Pages/GamePage";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <FeedProvider>
          <Routes>
            {/* Public auth pages */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected pages — require login */}
            <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
              <Route index element={<Navigate to="/feed" replace />} />
              <Route path="feed"              element={<FeedPage />} />
              <Route path="explore"           element={<ExplorePage />} />
              <Route path="draw"              element={<DrawPage />} />
              <Route path="animate"           element={<AnimationRoom />} />
              <Route path="game"             element={<GamePage />} />
              <Route path="profile"           element={<ProfilePage />} />
              <Route path="profile/:username" element={<ProfilePage />} />
              <Route path="settings"          element={<SettingsPage />} />
              <Route path="admin"             element={<AuthGuard requireAdmin><AdminPage /></AuthGuard>} />
            </Route>

            {/* Standalone demo */}
            <Route path="/demo" element={<Bitboard />} />
          </Routes>
        </FeedProvider>
      </AppProvider>
    </AuthProvider>
  );
}
