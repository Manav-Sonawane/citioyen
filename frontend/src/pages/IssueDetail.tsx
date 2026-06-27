import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { useAuth } from "../lib/auth";

// ---------- Types ----------

interface MediaRow {
  id: string;
  url: string;
  mediaType: "image" | "video";
  stage: string;
}

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  department: string;
}

interface Issue {
  id: string;
  title: string | null;
  description: string;
  status: string;
  lat: number;
  lng: number;
  addressText: string | null;
  landmark: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; name: string; email: string; phone?: string; avatarUrl?: string } | null;
  category: Category | null;
  media: MediaRow[];
  statusHistory: StatusHistoryEntry[];
  upvoteCount: number;
}

// ---------- Helpers ----------

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
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ---------- Sub-components ----------

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
        backgroundColor: badgeColor(status),
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function PhotoGallery({ media }: { media: MediaRow[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (media.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={headingStyle}>Media</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {media.map((m) =>
          m.mediaType === "image" ? (
            <img
              key={m.id}
              src={m.url}
              alt="Issue media"
              onClick={() => setLightbox(m.url)}
              style={{
                width: "100%",
                height: 130,
                objectFit: "cover",
                borderRadius: 6,
                cursor: "zoom-in",
                border: "1px solid #e2e8f0",
              }}
            />
          ) : (
            <video
              key={m.id}
              src={m.url}
              controls
              style={{
                width: "100%",
                height: 130,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            />
          )
        )}
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightbox}
            alt="Full size"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </section>
  );
}

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  // API returns newest-first; display chronologically
  const chronological = [...history].reverse();

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={headingStyle}>Status Timeline</h2>
      {chronological.length === 0 ? (
        <p style={{ color: "#888", fontSize: 14 }}>No status history recorded.</p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            borderLeft: "2px solid #e2e8f0",
            paddingLeft: 20,
          }}
        >
          {chronological.map((entry, i) => (
            <li
              key={entry.id}
              style={{
                position: "relative",
                marginBottom: i < chronological.length - 1 ? 20 : 0,
              }}
            >
              {/* Timeline dot */}
              <span
                style={{
                  position: "absolute",
                  left: -27,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: badgeColor(entry.toStatus),
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 2px " + badgeColor(entry.toStatus),
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                {entry.fromStatus ? (
                  <>
                    <StatusBadge status={entry.fromStatus} />
                    <span style={{ color: "#888", fontSize: 13 }}>→</span>
                  </>
                ) : null}
                <StatusBadge status={entry.toStatus} />
              </div>

              <div style={{ fontSize: 12, color: "#888", marginBottom: entry.note ? 4 : 0 }}>
                {fmtDate(entry.createdAt)}
              </div>

              {entry.note && (
                <div
                  style={{
                    fontSize: 13,
                    color: entry.note.startsWith("SLA breached") ? "#C62828" : "#444",
                    backgroundColor: entry.note.startsWith("SLA breached") ? "#FFEBEE" : "#F0F4F8",
                    padding: "8px 12px",
                    borderRadius: 6,
                    borderLeft: `4px solid ${entry.note.startsWith("SLA breached") ? "#E53E3E" : "#D0D7E3"}`,
                    fontWeight: entry.note.startsWith("SLA breached") ? 600 : 400,
                  }}
                >
                  {entry.note.startsWith("SLA breached") && <span style={{ marginRight: 6 }}>🚨</span>}
                  {entry.note}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------- Shared style ----------

const headingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 12,
  color: "#1A202C",
  borderBottom: "1px solid #D0D7E3",
  paddingBottom: 6,
};

// ---------- IssueDetail ----------

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewDetails = user && ["admin", "super_admin", "field_agent"].includes(user.role);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voteLoading, setVoteLoading] = useState(false);

  const handleVote = async (voteType: "confirm" | "dispute") => {
    if (!issue) return;
    setVoteLoading(true);
    try {
      const data = await fetchApi(`/issues/${issue.id}/validate`, {
        method: "POST",
        body: JSON.stringify({ voteType }),
      });
      setIssue((prev) => (prev ? { ...prev, upvoteCount: data.upvoteCount } : null));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVoteLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchApi(`/issues/${id}`)
      .then((data) => setIssue(data.issue))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const containerStyle: React.CSSProperties = {
    maxWidth: 680,
    margin: "0 auto",
    padding: "28px 24px 64px",
    fontFamily: "var(--sans, sans-serif)",
    color: "#2D3748",
    background: "#F5F7FA",
    minHeight: "100svh",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#5A6478" }}>Loading issue…</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            color: "#C62828",
            background: "#FFEBEE",
            border: "1px solid #FFCDD2",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error || "Issue not found."}
        </div>
        <button onClick={() => navigate("/")} style={{ cursor: "pointer", color: "#1565C0", background: "none", border: "1px solid #1565C0", borderRadius: 5, padding: "7px 14px", fontWeight: 600 }}>
          ← Back to map
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Back link */}
      <Link
        to="/"
        style={{ fontSize: 13, color: "#1565C0", textDecoration: "none", display: "inline-block", marginBottom: 20, fontWeight: 600 }}
      >
        ← Back to map
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, flex: 1 }}>
            {issue.title ?? "Untitled Issue"}
          </h1>
          <StatusBadge status={issue.status} />
        </div>

        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
          Reported {fmtDate(issue.createdAt)}
          {issue.category && (
            <> · <span style={{ color: "#1565C0" }}>{issue.category.department}</span></>
          )}
        </div>
      </div>

      {/* Location */}
      <section style={{ marginBottom: 28, background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        {issue.addressText && (
          <p style={{ fontSize: 18, color: "#1A202C", margin: "0 0 8px 0", fontWeight: 600 }}>
            📍 {issue.addressText}
          </p>
        )}
        {issue.landmark && (
          <p style={{ fontSize: 15, color: "#4A5568", margin: "0 0 12px 0" }}>
            <strong>Near:</strong> {issue.landmark}
          </p>
        )}
        <div style={{ fontSize: 13, color: "#718096", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>Lat: {issue.lat.toFixed(6)} · Lng: {issue.lng.toFixed(6)}</span>
          <a
            href={`https://maps.google.com/?q=${issue.lat},${issue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1565C0", fontWeight: 600, textDecoration: "none" }}
          >
            Open in Google Maps ↗
          </a>
        </div>
      </section>

      {/* Reporter Section */}
      {issue.reporter && (
        <section style={{ marginBottom: 28, background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 15, color: "#2D3748" }}>Reporter</h3>
          <div style={{ fontSize: 14, color: "#4A5568" }}>
            <strong>Name:</strong> {issue.reporter.name}
            {canViewDetails && (
              <>
                <br />
                <strong>Email:</strong> {issue.reporter.email}
                {issue.reporter.phone && (
                  <>
                    <br />
                    <strong>Phone:</strong> {issue.reporter.phone}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Description */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={headingStyle}>Description</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {issue.description}
        </p>
      </section>

      {/* Validation */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={headingStyle}>Validation</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => handleVote("confirm")}
            disabled={voteLoading}
            style={{
              padding: "8px 16px",
              background: "#E8F5E9",
              color: "#2E7D32",
              border: "1px solid #C8E6C9",
              borderRadius: 6,
              fontWeight: 600,
              cursor: voteLoading ? "not-allowed" : "pointer",
              opacity: voteLoading ? 0.7 : 1,
            }}
          >
            👍 Confirm
          </button>
          <button
            onClick={() => handleVote("dispute")}
            disabled={voteLoading}
            style={{
              padding: "8px 16px",
              background: "#FFEBEE",
              color: "#C62828",
              border: "1px solid #FFCDD2",
              borderRadius: 6,
              fontWeight: 600,
              cursor: voteLoading ? "not-allowed" : "pointer",
              opacity: voteLoading ? 0.7 : 1,
            }}
          >
            👎 Dispute
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#5A6478", marginLeft: 8 }}>
            Community Score: {issue.upvoteCount}
          </span>
        </div>
      </section>

      {/* Media gallery */}
      <PhotoGallery media={issue.media} />

      {/* Status timeline */}
      <StatusTimeline history={issue.statusHistory} />


    </div>
  );
}
