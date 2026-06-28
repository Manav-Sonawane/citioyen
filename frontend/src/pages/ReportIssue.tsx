import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  APIProvider,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { fetchApi } from "../lib/api";
import { MapLocationPicker, useReverseGeocode } from "../components/MapLocationPicker";
import { PageContainer, Card, Button } from "../components/ui";

const MAX_FILES = 5;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";
const MUMBAI = { lat: 19.076, lng: 72.8777 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// ---------- Types ----------

interface LatLng { lat: number; lng: number }

// ---------- Places Autocomplete sub-component ----------

interface PlacesAutocompleteInputProps {
  onPlaceSelected: (lat: number, lng: number, address: string) => void;
  value: string;
  onChange: (val: string) => void;
  inputStyle: React.CSSProperties;
}

function PlacesAutocompleteInput({
  onPlaceSelected,
  value,
  onChange,
  inputStyle,
}: PlacesAutocompleteInputProps) {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address"],
    });

    autocompleteRef.current = ac;

    const listener = ac.addListener("place_changed", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const place: any = ac.getPlace();
      const location = place.geometry?.location;
      if (!location) return;
      const lat = location.lat();
      const lng = location.lng();
      const address = place.formatted_address ?? "";
      onChange(address);
      onPlaceSelected(lat, lng, address);
    });

    return () => {
      listener.remove();
    };
  }, [placesLib, onPlaceSelected, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search for a location…"
      style={inputStyle}
      autoComplete="off"
    />
  );
}



// ---------- Inner form (inside APIProvider) ----------

function ReportIssueInner() {
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // UI state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reverseGeocode = useReverseGeocode();

  // ---------- Helpers to set location from any source ----------

  const applyLocation = useCallback(
    async (lat: number, lng: number, address?: string) => {
      setCoords({ lat, lng });
      if (address !== undefined) {
        setAddressText(address);
      } else {
        const resolved = await reverseGeocode(lat, lng);
        setAddressText(resolved);
      }
    },
    [reverseGeocode]
  );

  // ---------- "Use my location" button ----------

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyLocation(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        setError("Location access denied. Please search or pick on the map.");
        setGeoLoading(false);
      }
    );
  };

  // ---------- Map click ----------

  const handleMapLocationSelect = useCallback(
    async (lat: number, lng: number, address: string) => {
      await applyLocation(lat, lng, address);
    },
    [applyLocation]
  );

  // ---------- File input ----------

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

  // ---------- Submit ----------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (description.length > 2000) {
      setError("Description must be at most 2000 characters.");
      return;
    }
    if (!coords) {
      setError("Please set a location using search, your GPS, or the map.");
      return;
    }

    const formData = new FormData();
    formData.append("description", description);
    formData.append("lat", String(coords.lat));
    formData.append("lng", String(coords.lng));
    if (title.trim()) formData.append("title", title.trim());
    if (addressText.trim()) formData.append("addressText", addressText.trim());
    if (landmark.trim()) formData.append("landmark", landmark.trim());
    files.forEach((file) => formData.append("media", file));

    setSubmitting(true);
    try {
      const data = await fetchApi("/issues", {
        method: "POST",
        body: formData,
      });
      setSuccessData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };


  // ---------- Styles ----------

  const s: Record<string, React.CSSProperties> = {
    group: { marginBottom: "18px" },
    label: { display: "block", marginBottom: "5px", fontWeight: 600, fontSize: "13px", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
    input: { width: "100%", padding: "9px 11px", boxSizing: "border-box" as const, fontSize: "14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", background: "var(--surface)" },
    textarea: { width: "100%", padding: "9px 11px", boxSizing: "border-box" as const, fontSize: "14px", resize: "vertical" as const, minHeight: "110px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", background: "var(--surface)" },
    hint: { fontSize: "12px", color: "var(--text-muted)", marginTop: "5px" },
    charCount: { fontSize: "12px", color: description.length > 2000 ? "var(--danger)" : "var(--text-muted)", textAlign: "right" as const, marginTop: "3px" },
    geoBtn: {
      padding: "7px 14px", fontSize: "13px", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", cursor: geoLoading ? "not-allowed" : "pointer",
      backgroundColor: "var(--bg)", color: "var(--primary)", fontWeight: 600,
    },
    toggleBtn: {
      background: "none", border: "none", cursor: "pointer",
      color: "var(--primary)", fontSize: "13px", padding: 0, textDecoration: "underline",
    },
    coordsDisplay: {
      fontSize: "12px", color: "var(--success)", marginTop: "8px",
      padding: "6px 10px", backgroundColor: "var(--success-light)", borderRadius: "var(--radius-sm)",
      border: "1px solid #C8E6C9",
    },
  };

  const mapCenter = coords ?? MUMBAI;

  if (successData) {
    const duplicates = successData.possibleDuplicates || [];
    return (
      <PageContainer narrow>
        <Card>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "var(--text-heading)", margin: 0 }}>Your report was submitted successfully</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Thank you for keeping the community safe!</p>
          </div>

          {duplicates.length > 0 && (
            <Card style={{ marginTop: 32, background: "var(--bg)" }}>
              <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 12, color: "var(--text-heading)" }}>We found {duplicates.length} similar report(s) nearby:</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {duplicates.map((dup: any) => (
                  <Link 
                    key={dup.id} 
                    to={`/issues/${dup.id}`}
                    style={{ display: "block", padding: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textDecoration: "none", color: "inherit" }}
                  >
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {dup.description}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/")}
            style={{ width: "100%", marginTop: 32 }}
          >
            Continue
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <Card>
        <h1 style={{ marginTop: 0, fontSize: "22px" }}>Report an Issue</h1>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={s.group}>
            <label style={s.label}>
              Title <span style={{ fontWeight: "normal", color: "var(--text-muted)" }}>(optional)</span>
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

          {/* Location */}
          <div style={s.group}>
            <label style={s.label}>Location *</label>

            {/* Places Autocomplete search */}
            <PlacesAutocompleteInput
              value={addressText}
              onChange={setAddressText}
              onPlaceSelected={(lat, lng, addr) => applyLocation(lat, lng, addr)}
              inputStyle={s.input}
            />
            <p style={s.hint}>Search for an address, or use the options below.</p>

            {/* "Use my location" + "Pick on map" buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                style={s.geoBtn}
              >
                {geoLoading ? "Detecting…" : "📍 Use my current location"}
              </button>

              <button
                type="button"
                onClick={() => setMapOpen((o) => !o)}
                style={s.toggleBtn}
              >
                {mapOpen ? "▲ Hide map" : "▼ Pick on map"}
              </button>
            </div>

            {/* Collapsible map picker */}
            {mapOpen && (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...s.hint, marginBottom: 6 }}>
                  Click the map to pin a location. The address field will update automatically.
                </p>
                <MapLocationPicker
                  center={mapCenter}
                  markerPos={coords}
                  onLocationSelect={handleMapLocationSelect}
                />
              </div>
            )}

            {/* Show resolved coords */}
            {coords && (
              <div style={s.coordsDisplay}>
                📌 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                {addressText && <> — {addressText}</>}
              </div>
            )}
          </div>

          {/* Landmark */}
          <div style={s.group}>
            <label style={s.label}>
              Landmark <span style={{ fontWeight: "normal", color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near City Station"
              style={s.input}
            />
          </div>

          {/* Media Upload */}
          <div style={s.group}>
            <label style={s.label}>
              Photos / Videos{" "}
              <span style={{ fontWeight: "normal", color: "var(--text-muted)" }}>(optional, max {MAX_FILES})</span>
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
              <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "13px", color: "var(--text)" }}>
                {files.map((f) => (
                  <li key={f.name}>
                    {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
                  </li>
                ))}
              </ul>
            )}
            <p style={s.hint}>Accepted: JPEG, PNG, WebP, MP4, MOV — max 25 MB each</p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            style={{ width: "100%" }}
          >
            {submitting ? "Submitting…" : "Submit Report"}
          </Button>
        </form>

        <Link to="/" style={{ display: "block", textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--primary)" }}>
          ← Back to Feed
        </Link>
      </Card>
    </PageContainer>
  );
}

// ---------- Exported page — wraps inner form with APIProvider ----------

export function ReportIssue() {
  return (
    <APIProvider apiKey={API_KEY}>
      <ReportIssueInner />
    </APIProvider>
  );
}
