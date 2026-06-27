import { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { Link } from "react-router-dom";

interface Hotspot {
  wardName: string;
  categoryName: string;
  currentCount: number;
  previousCount: number;
  trend: "rising" | "stable" | "falling";
}

export function Hotspots() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/stats/hotspots")
      .then((data) => setHotspots(data.hotspots))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case "rising":
        return <span style={{ color: "#E53E3E", fontWeight: "bold" }}>↑ Rising</span>;
      case "falling":
        return <span style={{ color: "#38A169", fontWeight: "bold" }}>↓ Falling</span>;
      default:
        return <span style={{ color: "#718096", fontWeight: "bold" }}>→ Stable</span>;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "var(--sans, sans-serif)", color: "var(--text-heading)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>🔥 Issue Hotspots</h1>
        <Link to="/login" style={{ fontSize: 14, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
          ← Back to Login
        </Link>
      </div>

      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        Top 10 areas with the most civic issues reported in the last 30 days, compared to the previous 30 days.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading hotspots...</p>
      ) : error ? (
        <div style={{ color: "#C62828", background: "#FFEBEE", padding: 12, borderRadius: 6, border: "1px solid #FFCDD2" }}>
          {error}
        </div>
      ) : hotspots.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No hotspots found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {hotspots.map((h, i) => (
            <div
              key={`${h.wardName}-${h.categoryName}`}
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: 16,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: "bold", width: 40, color: "var(--text-muted)" }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>{h.wardName}</h3>
                <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 500 }}>
                  {h.categoryName}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-heading)", lineHeight: 1 }}>
                  {h.currentCount}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Issues (30d)
                </div>
              </div>
              <div style={{ width: 80, textAlign: "right", paddingLeft: 16 }}>
                {getTrendIndicator(h.trend)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 16 }}>
        <Link to="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          📊 City Dashboard
        </Link>
        <Link to="/leaderboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          🏆 Leaderboard
        </Link>
      </div>
    </div>
  );
}
