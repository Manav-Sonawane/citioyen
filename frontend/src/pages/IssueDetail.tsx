import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { PageContainer, Card, Badge, Button, LoadingSpinner, EmptyState } from "../components/ui";

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ---------- Sub-components ----------

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
                borderRadius: "var(--radius-sm)",
                cursor: "zoom-in",
                border: "1px solid var(--border)",
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
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
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
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
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
        <EmptyState
          icon="📜"
          title="No status history"
          message="No status changes have been recorded yet."
        />
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            borderLeft: "2px solid var(--border)",
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
                  backgroundColor: `var(--badge-${entry.toStatus}, var(--primary))`,
                  border: "2px solid #fff",
                  boxShadow: `0 0 0 2px var(--badge-${entry.toStatus}, var(--primary))`,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                {entry.fromStatus ? (
                  <>
                    <Badge status={entry.fromStatus} />
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>→</span>
                  </>
                ) : null}
                <Badge status={entry.toStatus} />
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: entry.note ? 4 : 0 }}>
                {fmtDate(entry.createdAt)}
              </div>

              {entry.note && (
                <div
                  style={{
                    fontSize: 13,
                    color: entry.note.startsWith("SLA breached") ? "var(--danger)" : "var(--text)",
                    backgroundColor: entry.note.startsWith("SLA breached") ? "var(--danger-light)" : "var(--bg)",
                    padding: "var(--space-sm) var(--space-md)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: `4px solid ${entry.note.startsWith("SLA breached") ? "var(--danger)" : "var(--border)"}`,
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
  color: "var(--text-heading)",
  borderBottom: "1px solid var(--border)",
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

  if (loading) {
    return (
      <PageContainer narrow>
        <LoadingSpinner message="Loading issue…" />
      </PageContainer>
    );
  }

  if (error || !issue) {
    return (
      <PageContainer narrow>
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error || "Issue not found."}
        </div>
        <Button variant="secondary" onClick={() => navigate("/")}>
          ← Back to Feed
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      {/* Back link */}
      <Link
        to="/"
        style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none", display: "inline-block", marginBottom: 20, fontWeight: 600 }}
      >
        ← Back to Feed
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, flex: 1 }}>
            {issue.title ?? "Untitled Issue"}
          </h1>
          <Badge status={issue.status} />
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Reported {fmtDate(issue.createdAt)}
          {issue.category && (
            <> · <span style={{ color: "var(--primary)" }}>{issue.category.department}</span></>
          )}
        </div>
      </div>

      {/* Location */}
      <Card style={{ marginBottom: 28 }}>
        {issue.addressText && (
          <p style={{ fontSize: 18, color: "var(--text-heading)", margin: "0 0 8px 0", fontWeight: 600 }}>
            📍 {issue.addressText}
          </p>
        )}
        {issue.landmark && (
          <p style={{ fontSize: 15, color: "var(--text)", margin: "0 0 12px 0" }}>
            <strong>Near:</strong> {issue.landmark}
          </p>
        )}
        <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>Lat: {issue.lat.toFixed(6)} · Lng: {issue.lng.toFixed(6)}</span>
          <a
            href={`https://maps.google.com/?q=${issue.lat},${issue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
          >
            Open in Google Maps ↗
          </a>
        </div>
      </Card>

      {/* Reporter Section */}
      {issue.reporter && (
        <Card style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 15, color: "var(--text-heading)" }}>Reporter</h3>
          <div style={{ fontSize: 14, color: "var(--text)" }}>
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
        </Card>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleVote("confirm")}
            disabled={voteLoading}
            style={{
              background: "var(--success-light)",
              color: "var(--success)",
              borderColor: "#C8E6C9",
            }}
          >
            👍 Confirm
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleVote("dispute")}
            disabled={voteLoading}
            style={{
              background: "var(--danger-light)",
              color: "var(--danger)",
              borderColor: "#FFCDD2",
            }}
          >
            👎 Dispute
          </Button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginLeft: 8 }}>
            Community Score: {issue.upvoteCount}
          </span>
        </div>
      </section>

      {/* Media gallery */}
      <PhotoGallery media={issue.media} />

      {/* Status timeline */}
      <StatusTimeline history={issue.statusHistory} />

    </PageContainer>
  );
}
