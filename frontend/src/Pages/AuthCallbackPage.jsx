// PKCE auth callback — exchanges token_hash from Supabase email links for a session.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(function () {
    var tokenHash = searchParams.get("token_hash");
    var type = searchParams.get("type");
    var next = searchParams.get("next") || "/reset-password";

    if (!next.startsWith("/")) next = "/reset-password";

    if (!tokenHash || !type) {
      setError("Invalid or expired link.");
      return;
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: type }).then(function (res) {
      if (res.error) {
        setError(res.error.message || "Verification failed.");
      } else {
        navigate(next, { replace: true });
      }
    });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: "var(--fb)" }}>
        <div className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32, textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 16 }}>Link Error</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{error}</p>
          <Link to="/forgot-password" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: "var(--fb)" }}>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Verifying…</p>
    </div>
  );
}
