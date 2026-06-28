import { useState } from "react";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "../components/ui";

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
      if (data.user.role === "field_agent") {
        navigate("/field-agent");
      } else if (data.user.role === "admin" || data.user.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    setLoading(true);
    try {
      const data = await fetchApi("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      login(data.token, data.user);
      if (data.user.role === "field_agent") {
        navigate("/field-agent");
      } else if (data.user.role === "admin" || data.user.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
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
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            style={{ width: "100%", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
          <span style={{ margin: "0 10px", fontSize: 13, color: "var(--text-muted)" }}>OR</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in failed")}
          />
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 600 }}>Create one</Link>
        </p>

        <div style={{ textAlign: "center", marginTop: 24, padding: "16px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
          <Link to="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            📊 View Public City Dashboard
          </Link>
          <Link to="/leaderboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            🏆 View Citizen Leaderboard
          </Link>
          <Link to="/hotspots" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            🔥 View Issue Hotspots
          </Link>
        </div>
      </div>
    </div>
  );
}
