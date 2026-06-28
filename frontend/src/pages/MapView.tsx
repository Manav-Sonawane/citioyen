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
import { Badge, Button } from "../components/ui";

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
          <div style={{ maxWidth: 240, fontFamily: "var(--sans)", fontSize: 13 }}>
            {/* Status badge */}
            <div style={{ marginBottom: 6 }}>
              <Badge status={issue.status} />
            </div>

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
                color: "var(--primary)",
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
    <div style={{ position: "relative", width: "100vw", height: "calc(100vh - var(--navbar-height))" }}>
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

      {/* Status overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--surface)",
          padding: "var(--space-sm) var(--space-md)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          fontFamily: "var(--sans)",
          fontSize: 13,
          color: "var(--text)",
          zIndex: 10,
          borderLeft: "4px solid var(--primary)",
        }}
      >
        {loading && <span style={{ color: "var(--text-muted)" }}>Loading issues…</span>}
        {!loading && !error && (
          <span style={{ color: "var(--text-muted)" }}>{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
        )}
        {error && <span style={{ color: "var(--danger)" }}>Error: {error}</span>}
      </div>

      {/* Floating Action Buttons */}
      <div style={{
        position: "absolute",
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
