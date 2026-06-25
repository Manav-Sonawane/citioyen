import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { Link, Navigate } from "react-router-dom";

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
      alert(`AI Verification Result:\nResolved: ${data.verification.looksResolved}\nConfidence: ${data.verification.confidence}\nReasoning: ${data.verification.reasoning}`);
      onResolved();
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
          background: "#E8F5E9",
          color: "#2E7D32",
          border: "1px solid #C8E6C9",
          padding: "8px 16px",
          borderRadius: 6,
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
    <div style={{ background: "var(--bg)", minHeight: "100svh", padding: 24, fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-heading)" }}>My Assigned Tasks</h1>
          <Link to="/" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>← Back to Feed</Link>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading assigned issues...</p>
        ) : issues.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>You have no assigned issues at the moment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {issues.map(issue => {
              const image = issue.media?.find(m => m.mediaType === "image")?.url;
              const isBreached = issue.slaDeadline && new Date(issue.slaDeadline) < new Date() && !["resolved", "closed"].includes(issue.status);

              return (
                <div key={issue.id} style={{ background: "var(--surface)", padding: 16, borderRadius: 8, boxShadow: "var(--shadow-sm)", display: "flex", gap: 16 }}>
                  {image ? (
                    <img src={image} alt="Issue" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 120, height: 120, background: "#eee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>No image</div>
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Link to={`/issues/${issue.id}`} style={{ fontWeight: 700, fontSize: 18, color: "var(--text-heading)", textDecoration: "none" }}>
                        {issue.title || "Untitled Issue"}
                      </Link>
                      <span style={{ 
                        background: isBreached ? "#FFEBEE" : "#F0F4F8", 
                        color: isBreached ? "#C62828" : "#4A5568", 
                        padding: "2px 8px", 
                        borderRadius: 12, 
                        fontSize: 12, 
                        fontWeight: 600 
                      }}>
                        {issue.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: 14, flex: 1 }}>
                      {issue.description.slice(0, 100)}{issue.description.length > 100 ? "..." : ""}
                    </p>
                    
                    {issue.slaDeadline && (
                      <div style={{ marginTop: 8, fontSize: 13, color: isBreached ? "#E53E3E" : "var(--text-muted)", fontWeight: isBreached ? 600 : 400 }}>
                        {isBreached ? "🚨 SLA Breached!" : "SLA Deadline:"} {new Date(issue.slaDeadline).toLocaleString()}
                      </div>
                    )}

                    {issue.status !== "resolved" && issue.status !== "closed" && (
                      <ResolveButton issueId={issue.id} onResolved={loadIssues} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
