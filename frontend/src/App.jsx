// App shell — provider stack (Auth / App / Feed) and route groups (public, protected, admin).
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
import ForgotPasswordPage from "./Pages/ForgotPasswordPage";
import ResetPasswordPage from "./Pages/ResetPasswordPage";
import AuthCallbackPage from "./Pages/AuthCallbackPage";
import AdminPage from "./Pages/AdminPage";
import Bitboard from "./Pages/Bitboard";
import AnimationRoom from "./Components/animation/AnimationRoom";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <FeedProvider>
          <Routes>
            {/* Public auth pages */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
            <Route path="/auth/confirm"   element={<AuthCallbackPage />} />

            {/* Protected pages — require login */}
            <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
              <Route index element={<Navigate to="/feed" replace />} />
              <Route path="feed"              element={<FeedPage />} />
              <Route path="explore"           element={<ExplorePage />} />
              <Route path="draw"              element={<DrawPage />} />
              <Route path="animate"           element={<AnimationRoom />} />
              <Route path="profile"           element={<ProfilePage />} />
              <Route path="profile/:username" element={<ProfilePage />} />
              <Route path="settings"          element={<SettingsPage />} />
              <Route path="admin"             element={<AuthGuard requireAdmin><AdminPage /></AuthGuard>} />
            </Route>

            {/* Standalone demo */}
            <Route path="/demo" element={<Bitboard />} />

            {/* Catch-all — redirect unknown paths to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </FeedProvider>
      </AppProvider>
    </AuthProvider>
  );
}
