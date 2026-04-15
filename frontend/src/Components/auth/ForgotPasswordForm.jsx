import { useState } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../../api/authApi";

export default function ForgotPasswordForm() {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32, textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 16 }}>Check your email</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          If an account exists for <strong>{email}</strong>, we've sent a reset link.
          Open it to choose a new password.
        </p>
        <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>
          Back to Log In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32 }}>
      <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 16, textAlign: "center" }}>
        Reset Password
      </h2>

      <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 20, textAlign: "center", lineHeight: 1.5 }}>
        Enter your account email and we'll send you a link to set a new password.
      </p>

      {error && (
        <div style={{ color: "#d33", marginBottom: 16, textAlign: "center", fontSize: 14 }}>
          {error}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={function(e) { setEmail(e.target.value); }}
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
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
        <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Back to Log In
        </Link>
      </p>
    </form>
  );
}
