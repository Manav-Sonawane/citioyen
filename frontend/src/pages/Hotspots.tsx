import { useState, useEffect } from "react";
import { fetchApi } from "../lib/api";
import { PageContainer, Card, LoadingSpinner, EmptyState } from "../components/ui";

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
        return <span style={{ color: "var(--danger)", fontWeight: "bold" }}>↑ Rising</span>;
      case "falling":
        return <span style={{ color: "var(--success)", fontWeight: "bold" }}>↓ Falling</span>;
      default:
        return <span style={{ color: "var(--text-muted)", fontWeight: "bold" }}>→ Stable</span>;
    }
  };

  return (
    <PageContainer>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>🔥 Issue Hotspots</h1>
      </div>

      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        Top 10 areas with the most civic issues reported in the last 30 days, compared to the previous 30 days.
      </p>

      {loading ? (
        <LoadingSpinner message="Loading hotspots…" />
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : hotspots.length === 0 ? (
        <EmptyState
          icon="📍"
          title="No hotspots found"
          message="Check back later as more issues are reported across the city."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {hotspots.map((h, i) => (
            <Card
              key={`${h.wardName}-${h.categoryName}`}
              style={{ display: "flex", alignItems: "center", padding: "var(--space-md) var(--space-lg)" }}
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
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
