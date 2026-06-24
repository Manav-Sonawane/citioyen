import { useState } from "react";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", display: "flex", alignItems: "center" }}>
      <div className="auth-card" style={{ width: "100%" }}>
        {/* Logo / brand mark */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{
            display: "inline-block",
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 22,
            padding: "6px 16px",
            borderRadius: 8,
            letterSpacing: "-0.5px",
          }}>
            Citioyen
          </span>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>
            Sign in to report civic issues
          </p>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "11px", fontSize: 15, marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
