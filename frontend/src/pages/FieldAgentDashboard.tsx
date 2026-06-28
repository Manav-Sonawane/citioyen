import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { Link, Navigate } from "react-router-dom";
import { PageContainer, Card, Badge, LoadingSpinner, EmptyState } from "../components/ui";

interface Issue {
  id: string;
  title: string | null;
  description: string;
  status: string;
  slaDeadline: string | null;
  createdAt: string;
  media: { url: string; mediaType: string; stage: string }[];
}

function ResolveButton({ issueId, onResolved }: { issueId: string; onResolved: () => void }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("afterPhoto", file);

    setLoading(true);
    try {
      const data = await fetchApi(`/issues/${issueId}/resolve`, {
        method: "POST",
        body: formData,
      });
      if (!data.success) {
        alert(`AI could not confirm resolution:\nReasoning: ${data.verification.reasoning}\n\nThe issue remains open for further work or admin review.`);
      } else {
        alert(`AI Verification Result:\nResolved: ${data.verification.looksResolved}\nConfidence: ${data.verification.confidence}\nReasoning: ${data.verification.reasoning}`);
        onResolved();
      }
    } catch (err: any) {
      alert(`Failed to resolve: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        style={{ display: "none" }} 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <button 
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: "var(--success-light)",
          color: "var(--success)",
          border: "1px solid #C8E6C9",
          padding: "8px 16px",
          borderRadius: "var(--radius-sm)",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
          marginTop: 12
        }}
      >
        {loading ? "Verifying..." : "✓ Mark Resolved (AI)"}
      </button>
    </>
  );
}

export function FieldAgentDashboard() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!user || user.role !== "field_agent") {
    return <Navigate to="/" replace />;
  }

  const loadIssues = () => {
    fetchApi("/issues?assignedTo=me")
      .then((data) => setIssues(data.issues || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIssues();
  }, []);

  return (
    <PageContainer>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-heading)" }}>My Assigned Tasks</h1>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <LoadingSpinner message="Loading assigned issues…" />
      ) : issues.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No assigned issues"
          message="You have no assigned issues at the moment. Check back later!"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {issues.map(issue => {
            const image = issue.media?.find(m => m.mediaType === "image")?.url;
            const isBreached = issue.slaDeadline && new Date(issue.slaDeadline) < new Date() && !["resolved", "closed"].includes(issue.status);

            return (
              <Card key={issue.id} style={{ display: "flex", gap: 16, padding: "var(--space-md)" }}>
                {image ? (
                  <img src={image} alt="Issue" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                ) : (
                  <div style={{ width: 120, height: 120, background: "var(--bg)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>No image</div>
                )}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Link to={`/issues/${issue.id}`} style={{ fontWeight: 700, fontSize: 18, color: "var(--text-heading)", textDecoration: "none" }}>
                      {issue.title || "Untitled Issue"}
                    </Link>
                    <Badge status={issue.status} />
                  </div>
                  <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: 14, flex: 1 }}>
                    {issue.description.slice(0, 100)}{issue.description.length > 100 ? "..." : ""}
                  </p>
                  
                  {issue.slaDeadline && (
                    <div style={{ marginTop: 8, fontSize: 13, color: isBreached ? "var(--danger)" : "var(--text-muted)", fontWeight: isBreached ? 600 : 400 }}>
                      {isBreached ? "🚨 SLA Breached!" : "SLA Deadline:"} {new Date(issue.slaDeadline).toLocaleString()}
                    </div>
                  )}

                  {issue.status !== "resolved" && issue.status !== "closed" && (
                    <ResolveButton issueId={issue.id} onResolved={loadIssues} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
