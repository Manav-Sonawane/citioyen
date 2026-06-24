import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { fetchApi } from "../lib/api";
import { useAuth } from "../lib/auth";

// ---------- Types ----------

interface MediaRow {
  id: string;
  url: string;
  mediaType: "image" | "video";
  stage: string;
}

interface Issue {
  id: string;
  title: string | null;
  description: string;
  status: string;
  lat: number;
  lng: number;
  media: MediaRow[];
  reporter: { id: string; name: string } | null;
}

// ---------- Status helpers ----------

const STATUS_COLOR: Record<string, string> = {
  reported: "#e53e3e",
  verified: "#dd6b20",
  assigned: "#dd6b20",
  in_progress: "#dd6b20",
  resolved: "#38a169",
  closed: "#38a169",
  rejected: "#718096",
};

function markerColor(status: string) {
  return STATUS_COLOR[status] ?? "#3182ce";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- Single marker with InfoWindow ----------

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
        {/* Custom colored dot pin */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: markerColor(issue.status),
            border: "2.5px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            cursor: "pointer",
          }}
        />
      </AdvancedMarker>

      {isSelected && markerEl && (
        <InfoWindow anchor={markerEl} onClose={onClose} shouldFocus={false}>
          <div style={{ maxWidth: 240, fontFamily: "sans-serif", fontSize: 13 }}>
            {/* Status badge */}
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: markerColor(issue.status),
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {statusLabel(issue.status)}
            </span>

            {issue.title && (
              <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: 14 }}>
                {issue.title}
              </p>
            )}

            <p style={{ margin: "0 0 8px", color: "#333" }}>{truncated}</p>

            {/* First photo thumbnail */}
            {firstPhoto && (
              <img
                src={firstPhoto.url}
                alt="Issue photo"
                style={{
                  width: "100%",
                  maxHeight: 130,
                  objectFit: "cover",
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
            )}

            <Link
              to={`/issues/${issue.id}`}
              style={{
                display: "inline-block",
                color: "#3182ce",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View full details →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ---------- MapView ----------

const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

export function MapView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [center, setCenter] = useState(MUMBAI_CENTER);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fall back to Mumbai
      );
    }
  }, []);

  // Fetch issues
  useEffect(() => {
    fetchApi("/issues")
      .then((data) => setIssues(data.issues ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((issue: Issue) => {
    setSelectedIssue(issue);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="citioyen-map"
          style={{ width: "100%", height: "100%" }}
          gestureHandling="greedy"
          disableDefaultUI={false}
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

      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.95)",
          padding: "8px 14px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          fontFamily: "sans-serif",
          fontSize: 13,
          zIndex: 10,
        }}
      >
        <span>
          👋 <strong>{user?.name}</strong>
        </span>
        <span style={{ color: "#ccc" }}>|</span>
        {loading && <span style={{ color: "#888" }}>Loading issues…</span>}
        {!loading && !error && (
          <span style={{ color: "#555" }}>{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
        )}
        {error && <span style={{ color: "red" }}>Error: {error}</span>}
        <span style={{ color: "#ccc" }}>|</span>
        <button
          onClick={logout}
          style={{
            border: "none",
            background: "none",
            color: "#e53e3e",
            cursor: "pointer",
            fontWeight: 600,
            padding: 0,
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>

      {/* Floating "Report an Issue" button */}
      <button
        onClick={() => navigate("/report")}
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 28px",
          backgroundColor: "#3182ce",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(49,130,206,0.5)",
          zIndex: 10,
          fontFamily: "sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        + Report an Issue
      </button>
    </div>
  );
}
