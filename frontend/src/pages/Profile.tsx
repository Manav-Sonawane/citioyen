import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { PageContainer, Card, Badge, LoadingSpinner, EmptyState } from "../components/ui";

// ---------- Types ----------

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  reputationScore: number;
  avatarUrl: string | null;
  createdAt: string;
}

interface IssueSummary {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
}

interface ValidatedIssue extends IssueSummary {
  voteType: "confirm" | "dispute";
}

// ---------- Helpers ----------

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleLabel(role: string) {
  switch (role) {
    case "citizen": return "Citizen";
    case "field_agent": return "Field Agent";
    case "admin": return "Admin";
    case "super_admin": return "Super Admin";
    default: return role;
  }
}

// ---------- Profile Page ----------

export function Profile() {
  const { user: authUser } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [reported, setReported] = useState<IssueSummary[]>([]);
  const [assigned, setAssigned] = useState<IssueSummary[]>([]);
  const [validated, setValidated] = useState<ValidatedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    fetchApi("/users/me/issues")
      .then((data) => {
        setProfileUser(data.user);
        setReported(data.reported || []);
        setAssigned(data.assigned || []);
        setValidated(data.validated || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageContainer narrow>
        <LoadingSpinner message="Loading profile…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer narrow>
        <div className="alert-error">{error}</div>
      </PageContainer>
    );
  }

  if (!profileUser) return null;

  const resolvedCount = reported.filter((i) => i.status === "resolved" || i.status === "closed").length;

  return (
    <PageContainer narrow>
      {/* ── Profile Header Card ── */}
      <Card style={{ marginBottom: 32, position: "relative", overflow: "visible" }}>
        {/* Decorative accent bar */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)",
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20, paddingTop: 8 }}>
          {/* Avatar */}
          {profileUser.avatarUrl ? (
            <img
              src={profileUser.avatarUrl}
              alt={profileUser.name || "User"}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--primary-light)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              flexShrink: 0,
            }}>
              {profileUser.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-heading)" }}>
              {profileUser.name || "Anonymous Citizen"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
              {profileUser.email}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--primary-light)",
                color: "var(--primary)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {roleLabel(profileUser.role)}
              </span>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--primary)",
              }}>
                <span style={{ fontSize: 16 }}>⭐</span> {profileUser.reputationScore} reputation
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Joined {fmtDate(profileUser.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── My Reports ── */}
      <Section
        title="My Reports"
        summary={
          reported.length > 0
            ? `${resolvedCount} of ${reported.length} report${reported.length !== 1 ? "s" : ""} resolved`
            : undefined
        }
      >
        {reported.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No reports yet"
            message="You haven't reported any issues. Head to the Feed to report one!"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reported.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </Section>

      {/* ── My Assignments (field_agent only) ── */}
      {profileUser.role === "field_agent" && (
        <Section
          title="My Assignments"
          summary={
            assigned.length > 0
              ? `${assigned.filter((i) => i.status === "resolved" || i.status === "closed").length} of ${assigned.length} resolved`
              : undefined
          }
        >
          {assigned.length === 0 ? (
            <EmptyState
              icon="✅"
              title="No assignments"
              message="You currently have no assigned issues."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {assigned.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── My Validations ── */}
      <Section title="My Validations">
        {validated.length === 0 ? (
          <EmptyState
            icon="👍"
            title="No validations yet"
            message="You haven't confirmed or disputed any issues yet."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {validated.map((v) => (
              <Link
                key={v.id}
                to={`/issues/${v.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card hoverable style={{ display: "flex", alignItems: "center", gap: 12, padding: "var(--space-sm) var(--space-md)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-heading)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
                    }}>
                      {v.title || "Untitled Issue"}
                    </span>
                  </div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 12,
                    fontWeight: 700,
                    background: v.voteType === "confirm" ? "var(--success-light)" : "var(--danger-light)",
                    color: v.voteType === "confirm" ? "var(--success)" : "var(--danger)",
                    flexShrink: 0,
                  }}>
                    {v.voteType === "confirm" ? "👍 Confirmed" : "👎 Disputed"}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </PageContainer>
  );
}

// ---------- Sub-components ----------

function Section({ title, summary, children }: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-heading)" }}>{title}</h2>
        {summary && (
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{summary}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function IssueRow({ issue }: { issue: IssueSummary }) {
  return (
    <Link to={`/issues/${issue.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Card hoverable style={{ display: "flex", alignItems: "center", gap: 12, padding: "var(--space-sm) var(--space-md)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: 600,
            fontSize: 14,
            color: "var(--text-heading)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
          }}>
            {issue.title || "Untitled Issue"}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {fmtDate(issue.createdAt)}
          </span>
        </div>
        <Badge status={issue.status} />
      </Card>
    </Link>
  );
}
