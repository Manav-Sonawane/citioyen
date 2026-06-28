import { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { PageContainer, Card, LoadingSpinner, EmptyState } from "../components/ui";

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
    <PageContainer>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, marginBottom: 8, color: "var(--text-heading)" }}>🏆 Civic Leaderboard</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 16 }}>Top 20 citizens making a difference in the community.</p>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading leaderboard…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon="🏅"
          title="No ranked users yet"
          message="Be the first to report an issue and earn reputation points!"
        />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {users.map((u, i) => (
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
          ))}
        </Card>
      )}
    </PageContainer>
  );
}
