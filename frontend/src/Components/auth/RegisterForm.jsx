import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as authApi from "../../api/authApi";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({ email, password, username: username.trim().toLowerCase(), nickname: nickname.trim() || username.trim() });
      navigate("/feed");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bb-card" style={{ width: "100%", maxWidth: 360, padding: 32 }}>
      <h2 style={{ fontFamily: "var(--fp)", fontSize: 20, marginBottom: 24, textAlign: "center" }}>
        Create Account
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

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Username</span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={32}
          value={username}
          onChange={function(e) { setUsername(e.target.value); }}
          className="bb-input"
          style={{ width: "100%", marginTop: 4 }}
          placeholder="lowercase, no spaces"
        />
      </label>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Display Name</span>
        <input
          type="text"
          value={nickname}
          onChange={function(e) { setNickname(e.target.value); }}
          className="bb-input"
          style={{ width: "100%", marginTop: 4 }}
          placeholder="optional"
        />
      </label>

      <label style={{ display: "block", marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Password</span>
        <input
          type="password"
          required
          minLength={6}
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
        {loading ? "Creating..." : "Register"}
      </button>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Log In
        </Link>
      </p>
    </form>
  );
}
