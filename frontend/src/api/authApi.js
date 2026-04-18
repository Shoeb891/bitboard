// Auth flows — Supabase for credentials, /api/auth/register for the Prisma profile.
import { supabase } from "../lib/supabase";
import { apiFetch } from "./apiFetch";

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Supabase doesn't know about SUSPENDED/DELETED status — probe the backend so the
  // login page can surface it. If /auth/me rejects, tear down the half-session first.
  try {
    await apiFetch("/api/auth/me", {
      headers: { Authorization: "Bearer " + data.session.access_token },
    });
  } catch (err) {
    await supabase.auth.signOut();
    throw err;
  }

  return data;
}

export async function register({ email, password, username, nickname }) {
  // Persist username/nickname in Supabase user_metadata so the backend can
  // lazy-create the Prisma profile even when email-confirmation delays the session.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, nickname: nickname || username } },
  });
  if (error) throw error;

  // Fast path: if signUp returned a session (email-confirmation OFF), create the
  // Prisma profile immediately. Otherwise /api/auth/me will lazy-create on first login.
  const token = data.session?.access_token;
  if (token) {
    await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: JSON.stringify({ username, nickname: nickname || username }),
    });
  }

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requestPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password",
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}
