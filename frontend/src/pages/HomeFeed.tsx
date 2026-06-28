import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { fetchApi } from "../lib/api";
import { Card, Badge, Button, LoadingSpinner, EmptyState } from "../components/ui";
import "./HomeFeed.css";

// ---------- Types ----------

interface MediaRow {
  id: string;
  url: string;
  mediaType: "image" | "video";
  stage?: string;
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
  reporter?: { id: string; name: string } | null;
}

interface StatsData {
  totalIssues: number;
  resolvedCount: number;
  averageResolutionHours: number;
}

// ---------- Helpers ----------

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLOR: Record<string, string> = {
  reported: "#E53E3E",
  verified: "#DD6B20",
  assigned: "#DD6B20",
  in_progress: "#DD6B20",
  resolved: "#2E7D32",
  closed: "#2E7D32",
  rejected: "#718096",
};

function markerColor(status: string) {
  return STATUS_COLOR[status] ?? "#3182ce";
}

const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// ---------- IssueMarker (inline map marker) ----------

interface IssueMarkerProps {
  issue: Issue;
  isSelected: boolean;
  onSelect: (issue: Issue) => void;
  onClose: () => void;
}

function IssueMarker({ issue, isSelected, onSelect, onClose }: IssueMarkerProps) {
  const [markerRef, markerEl] = useAdvancedMarkerRef();

  const firstPhoto = issue.media.find((m) => m.mediaType === "image");
  const truncated =
    issue.description.length > 120
      ? issue.description.slice(0, 120) + "…"
      : issue.description;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: issue.lat, lng: issue.lng }}
        onClick={() => onSelect(issue)}
        title={issue.title ?? issue.description.slice(0, 60)}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: markerColor(issue.status),
            border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        />
      </AdvancedMarker>

      {isSelected && markerEl && (
        <InfoWindow anchor={markerEl} onClose={onClose} shouldFocus={false}>
          <div style={{ maxWidth: 220, fontFamily: "var(--sans)", fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}>
              <Badge status={issue.status} />
            </div>
            {issue.title && (
              <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: 14 }}>
                {issue.title}
              </p>
            )}
            <p style={{ margin: "0 0 8px", color: "#333" }}>{truncated}</p>
            {firstPhoto && (
              <img
                src={firstPhoto.url}
                alt="Issue photo"
                style={{
                  width: "100%",
                  maxHeight: 100,
                  objectFit: "cover",
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
            )}
            <Link
              to={`/issues/${issue.id}`}
              style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
            >
              View details →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ---------- HomeFeed ----------

export function HomeFeed() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapCenter, setMapCenter] = useState(MUMBAI_CENTER);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fall back to Mumbai
      );
    }
  }, []);

  // Fetch issues + stats in parallel
  useEffect(() => {
    Promise.all([
      fetchApi("/issues"),
      fetchApi("/stats").catch(() => null),
    ])
      .then(([issuesData, statsData]) => {
        setIssues(issuesData.issues ?? []);
        if (statsData) setStats(statsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((issue: Issue) => {
    setSelectedIssue(issue);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  if (loading) {
    return (
      <div className="home" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner message="Loading feed…" />
      </div>
    );
  }

  return (
    <div className="home">
      {/* ── Stats strip ── */}
      {stats && (
        <div className="home__stats">
          <StatCard icon="🏙️" value={stats.totalIssues} label="Issues Reported" />
          <StatCard icon="✅" value={stats.resolvedCount} label="Resolved" />
          <StatCard
            icon="⏱️"
            value={`${stats.averageResolutionHours.toFixed(1)}h`}
            label="Avg. Resolution"
          />
          <StatCard
            icon="📈"
            value={
              stats.totalIssues > 0
                ? `${Math.round((stats.resolvedCount / stats.totalIssues) * 100)}%`
                : "—"
            }
            label="Resolution Rate"
          />
        </div>
      )}

      {/* ── Two-column split ── */}
      <div className="home__split">
        {/* LEFT — Feed */}
        <div className="home__feed">
          <div className="home__feed-header">
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Recent Issues</h1>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
              {issues.length} total
            </span>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}

          {!error && issues.length === 0 ? (
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
          ) : (
            <div className="home__feed-list">
              {issues.map((issue) => {
                const firstPhoto = issue.media.find((m) => m.mediaType === "image");
                const title =
                  issue.title ||
                  issue.description.substring(0, 80) +
                    (issue.description.length > 80 ? "..." : "");
                const locationText =
                  issue.addressText || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`;

                return (
                  <Link
                    to={`/issues/${issue.id}`}
                    key={issue.id}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card
                      hoverable
                      style={{ display: "flex", gap: 12, padding: "var(--space-sm) var(--space-md)" }}
                    >
                      {firstPhoto && (
                        <img
                          src={firstPhoto.url}
                          alt="Issue"
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: "var(--radius-sm)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--text-heading)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {title}
                          </h3>
                          <Badge status={issue.status} />
                        </div>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: 13,
                            marginBottom: 4,
                            flex: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {issue.description}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: "auto",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 12 }}>📍</span> {locationText}
                          </span>
                          <span>{fmtDate(issue.createdAt)}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Inline map */}
        <div className="home__map">
          <div className="home__map-header">
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-heading)" }}>
              📍 Issue Map
            </span>
            <Link
              to="/map"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
            >
              Full screen →
            </Link>
          </div>
          <div className="home__map-container">
            <APIProvider apiKey={API_KEY}>
              <Map
                defaultCenter={mapCenter}
                defaultZoom={12}
                mapId="citioyen-home-map"
                style={{ width: "100%", height: "100%" }}
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
              >
                {issues.map((issue) => (
                  <IssueMarker
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssue?.id === issue.id}
                    onSelect={handleSelect}
                    onClose={handleClose}
                  />
                ))}
              </Map>
            </APIProvider>
          </div>
        </div>
      </div>

      {/* ── Floating Action Buttons ── */}
      <div className="home__fabs">
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

// ---------- Stat card sub-component ----------

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)" }}>
      <div style={{ fontSize: 22, marginBottom: 4, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-heading)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
    </Card>
  );
}
