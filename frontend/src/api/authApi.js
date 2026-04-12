import { supabase } from "../lib/supabase";
import { apiFetch } from "./apiFetch";

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function register({ email, password, username, nickname }) {
  // 1. Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // 2. Create Prisma User profile via backend
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
