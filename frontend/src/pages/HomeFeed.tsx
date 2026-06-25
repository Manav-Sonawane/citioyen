import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { useAuth } from "../lib/auth";

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

// ---------- Status helpers ----------
const STATUS_COLOR: Record<string, string> = {
  reported: "#E53E3E",
  verified: "#DD6B20",
  assigned: "#DD6B20",
  in_progress: "#DD6B20",
  resolved: "#2E7D32",
  closed: "#2E7D32",
  rejected: "#718096",
};

function badgeColor(status: string) {
  return STATUS_COLOR[status] ?? "#3182ce";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- HomeFeed ----------
export function HomeFeed() {
  const { user, logout } = useAuth();
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
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#fff",
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--sans, sans-serif)",
          fontSize: 14,
          color: "var(--text, #2D3748)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: 18, letterSpacing: "-0.5px" }}>Citioyen</span>
        <span style={{ color: "var(--border)" }}>|</span>
        
        {/* Toggle Nav */}
        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          <span style={{ fontWeight: 700, color: "var(--primary)", borderBottom: "2px solid var(--primary)" }}>Feed</span>
          <Link to="/map" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}>Map</Link>
          <Link to="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}>Dashboard</Link>
          <Link to="/leaderboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}>Leaderboard</Link>
          {user && ["admin", "super_admin"].includes(user.role) && (
            <Link to="/admin" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}>Admin</Link>
          )}
          {user && user.role === "field_agent" && (
            <Link to="/field-agent" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}>My Tasks</Link>
          )}
        </div>

        <span style={{ color: "var(--border)" }}>|</span>
        <span>👋 <strong>{user?.name}</strong></span>
        <span style={{ color: "var(--border)" }}>|</span>
        <button
          onClick={logout}
          style={{
            border: "none",
            background: "none",
            color: "#C62828",
            cursor: "pointer",
            fontWeight: 600,
            padding: 0,
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px", width: "100%" }}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Recent Issues</h1>
        
        {loading && <p style={{ color: "var(--text-muted)" }}>Loading feed...</p>}
        {error && <div className="alert-error">{error}</div>}
        
        {!loading && !error && issues.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No issues reported yet.</p>
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
                style={{
                  display: "flex",
                  gap: 16,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 16,
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "var(--shadow-sm)",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {firstPhoto && (
                  <img 
                    src={firstPhoto.url} 
                    alt="Issue Thumbnail"
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {title}
                    </h3>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        backgroundColor: badgeColor(issue.status),
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginLeft: 12,
                      }}
                    >
                      {statusLabel(issue.status)}
                    </span>
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
              </Link>
            )
          })}
        </div>
      </div>

      {/* Floating "Report an Issue" button */}
      <button
        onClick={() => navigate("/report")}
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "13px 30px",
          backgroundColor: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(21,101,192,0.45)",
          zIndex: 10,
          fontFamily: "var(--sans, sans-serif)",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
        }}
      >
        + Report an Issue
      </button>
    </div>
  );
}
