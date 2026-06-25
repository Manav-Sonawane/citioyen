import { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { Link } from "react-router-dom";

interface UserScore {
  id: string;
  name: string;
  reputationScore: number;
}

export function Leaderboard() {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/users/leaderboard")
      .then((data) => setUsers(data.leaderboard || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", fontFamily: "var(--sans)" }}>
      {/* Header */}
      <div style={{ background: "#fff", padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: 18, letterSpacing: "-0.5px" }}>Citioyen</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>Back to App</span>
        </Link>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 32, marginBottom: 8, color: "var(--text-heading)" }}>🏆 Civic Leaderboard</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>Top 20 citizens making a difference in the community.</p>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40 }}>Loading leaderboard...</p>
        ) : (
          <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            {users.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No ranked users yet.</p>
            ) : (
              users.map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: i === users.length - 1 ? "none" : "1px solid var(--border)", background: i < 3 ? "rgba(21, 101, 192, 0.03)" : "transparent" }}>
                  <div style={{ width: 50, fontSize: 20, fontWeight: 800, color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--text-muted)" }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, fontWeight: 600, color: "var(--text-heading)", fontSize: 16 }}>
                    {u.name || "Anonymous Citizen"}
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>⭐</span> {u.reputationScore}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
