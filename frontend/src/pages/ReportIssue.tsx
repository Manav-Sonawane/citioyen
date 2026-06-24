import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";

const MAX_FILES = 5;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

export function ReportIssue() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ready" | "denied" | "unsupported">("loading");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill coordinates from browser geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("denied");
      }
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} files.`);
      e.target.value = "";
      return;
    }
    setFiles(selected);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (description.length > 2000) {
      setError("Description must be at most 2000 characters.");
      return;
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError("Please provide valid latitude and longitude values.");
      return;
    }

    // Build FormData — browser will set the correct multipart Content-Type boundary
    const formData = new FormData();
    formData.append("description", description);
    formData.append("lat", String(latNum));
    formData.append("lng", String(lngNum));
    if (title.trim()) formData.append("title", title.trim());
    files.forEach((file) => formData.append("media", file));

    setSubmitting(true);
    try {
      const data = await fetchApi("/issues", {
        method: "POST",
        body: formData,
        // No headers needed — api.ts detects FormData and skips Content-Type
      });
      navigate(`/issues/${data.issue.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Styles ---
  const s: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: "560px",
      margin: "40px auto",
      padding: "24px",
      border: "1px solid #ccc",
      borderRadius: "8px",
      fontFamily: "sans-serif",
    },
    group: { marginBottom: "16px" },
    label: { display: "block", marginBottom: "5px", fontWeight: "bold" },
    input: { width: "100%", padding: "8px", boxSizing: "border-box", fontSize: "14px" },
    textarea: { width: "100%", padding: "8px", boxSizing: "border-box", fontSize: "14px", resize: "vertical", minHeight: "100px" },
    row: { display: "flex", gap: "12px" },
    hint: { fontSize: "12px", color: "#555", marginTop: "4px" },
    charCount: { fontSize: "12px", color: description.length > 2000 ? "red" : "#555", textAlign: "right" },
    error: { color: "red", backgroundColor: "#ffe6e6", padding: "10px", marginBottom: "16px", borderRadius: "4px" },
    button: {
      width: "100%",
      padding: "10px",
      backgroundColor: submitting ? "#aaa" : "#007BFF",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: submitting ? "not-allowed" : "pointer",
      fontSize: "16px",
    },
    back: { display: "block", textAlign: "center", marginTop: "12px" },
  };

  const locationHint =
    locationStatus === "loading"
      ? "Detecting your location…"
      : locationStatus === "denied"
      ? "Location access denied — please enter coordinates manually."
      : locationStatus === "unsupported"
      ? "Geolocation not supported — please enter coordinates manually."
      : "Location auto-filled. You may edit if needed.";

  return (
    <div style={s.container}>
      <h1 style={{ marginTop: 0 }}>Report an Issue</h1>

      {error && <div style={s.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div style={s.group}>
          <label style={s.label}>
            Title <span style={{ fontWeight: "normal", color: "#777" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pothole on Main Street"
            style={s.input}
          />
        </div>

        {/* Description */}
        <div style={s.group}>
          <label style={s.label}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail (10–2000 characters)…"
            required
            style={s.textarea}
          />
          <div style={s.charCount}>{description.length} / 2000</div>
        </div>

        {/* Lat / Lng */}
        <div style={s.group}>
          <label style={s.label}>Location *</label>
          <p style={{ ...s.hint, marginBottom: "8px" }}>{locationHint}</p>
          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "13px", color: "#333" }}>Latitude</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 19.0760"
                required
                style={s.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "13px", color: "#333" }}>Longitude</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. 72.8777"
                required
                style={s.input}
              />
            </div>
          </div>
        </div>

        {/* Media Upload */}
        <div style={s.group}>
          <label style={s.label}>
            Photos / Videos <span style={{ fontWeight: "normal", color: "#777" }}>(optional, max {MAX_FILES})</span>
          </label>
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ width: "100%" }}
          />
          {files.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "13px", color: "#333" }}>
              {files.map((f) => (
                <li key={f.name}>{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</li>
              ))}
            </ul>
          )}
          <p style={s.hint}>Accepted: JPEG, PNG, WebP, MP4, MOV — max 25 MB each</p>
        </div>

        <button type="submit" disabled={submitting} style={s.button}>
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </form>

      <Link to="/" style={s.back}>← Back to map</Link>
    </div>
  );
}
