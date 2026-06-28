import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { PageContainer, Card, Badge, Button, LoadingSpinner, EmptyState } from "../components/ui";

// ---------- Types ----------
interface MediaRow {
  id: string;
  url: string;
  mediaType: "image" | "video";
}

interface Issue {
  id: string;
  title: string | null;
  description: string;
  status: string;
  lat: number;
  lng: number;
  addressText: string | null;
  createdAt: string;
  media: MediaRow[];
}

// ---------- Helpers ----------

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- HomeFeed ----------
export function HomeFeed() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi("/issues")
      .then((data) => setIssues(data.issues ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      {/* Main Content */}
      <PageContainer narrow>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Recent Issues</h1>
        
        {loading && <LoadingSpinner message="Loading feed…" />}
        {error && <div className="alert-error">{error}</div>}
        
        {!loading && !error && issues.length === 0 && (
          <EmptyState
            icon="📋"
            title="No issues reported yet"
            message="Be the first to report a civic issue in your community."
            action={
              <Button variant="primary" onClick={() => navigate("/report")}>
                + Report an Issue
              </Button>
            }
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {issues.map(issue => {
            const firstPhoto = issue.media.find(m => m.mediaType === "image");
            const title = issue.title || issue.description.substring(0, 80) + (issue.description.length > 80 ? "..." : "");
            const locationText = issue.addressText || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`;
            
            return (
              <Link 
                to={`/issues/${issue.id}`} 
                key={issue.id}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card hoverable style={{ display: "flex", gap: 16, padding: "var(--space-md)" }}>
                  {firstPhoto && (
                    <img 
                      src={firstPhoto.url} 
                      alt="Issue Thumbnail"
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: "cover",
                        borderRadius: "var(--radius-sm)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {title}
                      </h3>
                      <Badge status={issue.status} />
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 8, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {issue.description}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)", marginTop: "auto" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 14 }}>📍</span> {locationText}
                      </span>
                      <span>{fmtDate(issue.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </PageContainer>

      {/* Floating Action Buttons */}
      <div style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "12px",
        zIndex: 10
      }}>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate("/report")}
          style={{
            borderRadius: "var(--radius-full)",
            boxShadow: "0 4px 16px rgba(21,101,192,0.45)",
          }}
        >
          + Report an Issue
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate("/chat-report")}
          style={{
            borderRadius: "var(--radius-full)",
            boxShadow: "0 4px 16px rgba(21,101,192,0.2)",
          }}
        >
          💬 Report via Chat
        </Button>
      </div>
    </div>
  );
}
