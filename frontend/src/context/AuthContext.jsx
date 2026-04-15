// Owns the Supabase session and the Prisma profile; re-fetches on auth state changes.
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../api/apiFetch";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser]       = useState(null);   // Prisma user profile
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch the Prisma user profile for the current Supabase session
  async function fetchProfile(accessToken) {
    setProfileLoading(true);
    try {
      const profile = await apiFetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + accessToken },
      });
      setUser(profile);
    } catch (err) {
      console.warn("Could not fetch profile:", err.message);
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(function() {
    // 1. Check existing session on mount
    supabase.auth.getSession().then(function({ data: { session: s } }) {
      setSession(s);
      if (s) {
        setProfileLoading(true);
        fetchProfile(s.access_token);
      }
      setLoading(false);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      function(_event, s) {
        setSession(s);
        if (s) {
          setProfileLoading(true);
          fetchProfile(s.access_token);
        } else {
          setUser(null);
        }
      }
    );

    return function() { subscription.unsubscribe(); };
  }, []);

  // Convenience: refresh the user profile (called after profile edits)
  async function refreshUser() {
    if (session) await fetchProfile(session.access_token);
  }

  return (
    <AuthContext.Provider value={{ session, user, setUser, loading, profileLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
