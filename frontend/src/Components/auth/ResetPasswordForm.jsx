import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import * as authApi from "../../api/authApi";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [ready, setReady]       = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  // Detect the recovery session. The Supabase client auto-consumes the
  // URL hash on mount and fires PASSWORD_RECOVERY; we also check the
  // existing session in case the event fired before this listener attached.
  useEffect(function() {
    let cancelled = false;

    supabase.auth.getSession().then(function(res) {
      if (cancelled) return;
      if (res?.data?.session) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(function(event) {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    return function() {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // After success, clear the recovery session and bounce to /login.
  useEffect(function() {
    if (!done) return;
    supabase.auth.signOut().catch(function() { /* ignore */ });
    const t = setTimeout(function() { navigate("/login"); }, 2000);
    return function() { clearTimeout(t); };
  }, [done, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authApi.updatePassword(newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32, textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 16 }}>Password Updated</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          Redirecting to sign-in…
        </p>
        <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>
          Go to Log In
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32, textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 16 }}>Reset Password</h2>
        <p style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.5, marginBottom: 20 }}>
          Open the reset link from your email to continue. If the link has expired,
          request a new one below.
        </p>
        <Link to="/forgot-password" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32 }}>
      <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 24, textAlign: "center" }}>
        Choose a New Password
      </h2>

      {error && (
        <div style={{ color: "#d33", marginBottom: 16, textAlign: "center", fontSize: 14 }}>
          {error}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>New Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={function(e) { setNewPassword(e.target.value); }}
          className="bb-input"
          style={{ width: "100%", marginTop: 4 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Confirm Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={function(e) { setConfirm(e.target.value); }}
          className="bb-input"
          style={{ width: "100%", marginTop: 4 }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bb-btn"
        style={{ width: "100%", padding: "10px 0", fontFamily: "var(--fp)", fontSize: 14 }}
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
