import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { fetchApi } from "../lib/api";
import { Link, Navigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Issue {
  id: string;
  title: string | null;
  description: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  reporter: { id: string; name: string } | null;
  possibleDuplicateCount?: number;
  possibleDuplicates?: { id: string; description: string }[];
}

function DuplicateBadge({ duplicates }: { duplicates?: { id: string; description: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "#FFFAF0",
          border: "1px solid #FBD38D",
          color: "#DD6B20",
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4
        }}
      >
        ⚠ {duplicates.length} possible duplicate(s)
      </button>
      {expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {duplicates.map(dup => (
            <div key={dup.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "6px 8px", borderRadius: 4, fontSize: 12 }}>
              <Link to={`/issues/${dup.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>View</Link>
              <span style={{ marginLeft: 6, color: "var(--text-muted)" }}>
                {dup.description.slice(0, 50)}{dup.description.length > 50 ? "..." : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          whiteSpace: "nowrap"
        }}
      >
        {loading ? "Verifying..." : "✓ Mark Resolved (AI)"}
      </button>
    </>
  );
}

const validTransitions: Record<string, string[]> = {
  reported: ["verified", "rejected"],
  verified: ["assigned", "rejected"],
  assigned: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
  closed: [],
  rejected: [],
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fieldAgents, setFieldAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    Promise.all([
      fetchApi("/issues"),
      fetchApi("/users?role=field_agent"),
    ])
      .then(([issuesData, usersData]) => {
        setIssues(issuesData.issues || []);
        setFieldAgents(usersData.users || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (issueId: string, newStatus: string, newAssignedTo: string | null) => {
    try {
      const body: any = { newStatus };
      if (newAssignedTo) {
        body.assignedTo = newAssignedTo;
      }
      await fetchApi(`/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      // Update local state
      setIssues(issues.map((issue) =>
        issue.id === issueId
          ? { ...issue, status: newStatus, assignedTo: newAssignedTo }
          : issue
      ));
    } catch (err: any) {
      alert(`Failed to update issue: ${err.message}`);
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", padding: 24, fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--surface)", padding: 24, borderRadius: 8, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-heading)" }}>Admin Dashboard</h1>
          <Link to="/" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>← Back to Feed</Link>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading data...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "12px 8px" }}>Issue</th>
                <th style={{ padding: "12px 8px" }}>Reporter</th>
                <th style={{ padding: "12px 8px" }}>Date</th>
                <th style={{ padding: "12px 8px" }}>Status</th>
                <th style={{ padding: "12px 8px" }}>Assigned To</th>
                <th style={{ padding: "12px 8px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => {
                const allowedNext = validTransitions[issue.status] || [];
                // Include current status in options so it can be selected/shown as current
                const options = [issue.status, ...allowedNext];

                return (
                  <tr key={issue.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <Link to={`/issues/${issue.id}`} style={{ fontWeight: 600 }}>
                        {issue.title || issue.description.slice(0, 30) + "..."}
                      </Link>
                      <DuplicateBadge duplicates={issue.possibleDuplicates} />
                    </td>
                    <td style={{ padding: "12px 8px" }}>{issue.reporter?.name || "Unknown"}</td>
                    <td style={{ padding: "12px 8px" }}>{fmtDate(issue.createdAt)}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <select
                        value={issue.status}
                        onChange={(e) => handleUpdate(issue.id, e.target.value, issue.assignedTo)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}
                      >
                        {options.map(opt => (
                          <option key={opt} value={opt}>
                            {opt.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <select
                        value={issue.assignedTo || ""}
                        onChange={(e) => handleUpdate(issue.id, issue.status, e.target.value || null)}
                        style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}
                      >
                        <option value="">-- Unassigned --</option>
                        {fieldAgents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {issue.status !== "resolved" && issue.status !== "closed" && (
                        <ResolveButton 
                          issueId={issue.id} 
                          onResolved={() => handleUpdate(issue.id, "resolved", issue.assignedTo)} 
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
