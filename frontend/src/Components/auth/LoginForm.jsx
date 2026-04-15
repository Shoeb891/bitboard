import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as authApi from "../../api/authApi";

export default function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.login({ email, password });
      navigate("/feed");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32 }}>
      <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 24, textAlign: "center" }}>
        Log In
      </h2>

      {error && (
        <div style={{ color: "#d33", marginBottom: 16, textAlign: "center", fontSize: 14 }}>
          {error}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 16 }}>
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

      <label style={{ display: "block", marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={function(e) { setPassword(e.target.value); }}
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
        {loading ? "Logging in..." : "Log In"}
      </button>

      <p style={{ marginTop: 12, textAlign: "center", fontSize: 13 }}>
        <Link to="/forgot-password" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Forgot password?
        </Link>
      </p>

      <p style={{ marginTop: 8, textAlign: "center", fontSize: 13 }}>
        No account?{" "}
        <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Register
        </Link>
      </p>
    </form>
  );
}
