import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../lib/api";

interface StatsData {
  totalIssues: number;
  resolvedCount: number;
  averageResolutionHours: number;
  issuesByCategory: Record<string, number>;
  issuesByStatus: Record<string, number>;
  slaBreachedCount: number;
}

export function PublicDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/stats")
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading stats...</div>;
  if (error) return <div style={{ padding: 40, color: "red", textAlign: "center" }}>{error}</div>;
  if (!stats) return null;

  const maxCategory = Math.max(...Object.values(stats.issuesByCategory), 1);
  const maxStatus = Math.max(...Object.values(stats.issuesByStatus), 1);

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

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <h2 style={{ fontSize: 28, marginBottom: 24, color: "var(--text-heading)" }}>City Dashboard</h2>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard title="Total Issues" value={stats.totalIssues} />
          <StatCard title="Resolved Issues" value={stats.resolvedCount} />
          <StatCard title="Avg Resolution (Hrs)" value={stats.averageResolutionHours.toFixed(1)} />
          <StatCard title="SLA Breaches" value={stats.slaBreachedCount} color="#E53E3E" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32 }}>
          {/* Category Bar Chart */}
          <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "var(--text-heading)" }}>Issues by Category</h3>
            {Object.entries(stats.issuesByCategory).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "var(--text-muted)" }}>
                  <span style={{ textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ width: "100%", height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxCategory) * 100}%`, height: "100%", background: "var(--primary)", borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Status Bar Chart */}
          <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "var(--text-heading)" }}>Issues by Status</h3>
            {Object.entries(stats.issuesByStatus).sort((a,b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "var(--text-muted)" }}>
                  <span style={{ textTransform: "capitalize" }}>{status.replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ width: "100%", height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxStatus) * 100}%`, height: "100%", background: "#38A169", borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "var(--text-heading)" }: { title: string, value: string | number, color?: string }) {
  return (
    <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}
