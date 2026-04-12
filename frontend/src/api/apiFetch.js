import { supabase } from "../lib/supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Wrapper around fetch() that:
 *  - Prepends the API base URL (empty in dev because Vite proxies /api)
 *  - Injects the Supabase Bearer token if a session exists
 *  - Sets Content-Type to JSON by default
 */
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (session?.access_token && !headers.Authorization) {
    headers.Authorization = "Bearer " + session.access_token;
  }

  const res = await fetch(BASE_URL + path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(function() { return {}; });
    const err = new Error(body.error || "Request failed");
    err.status = res.status;
    throw err;
  }

  return res.json();
}
