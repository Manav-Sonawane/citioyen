import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { fetchApi } from "../lib/api";

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

// ---------- Map Picker sub-component ----------

interface MapPickerProps {
  center: LatLng;
  markerPos: LatLng | null;
  onMapClick: (lat: number, lng: number) => void;
}

function MapPicker({ center, markerPos, onMapClick }: MapPickerProps) {
  return (
    <div style={{ height: 260, borderRadius: 8, overflow: "hidden", border: "1px solid #ccc" }}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        mapId="report-picker"
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI
        onClick={(e) => {
          const lat = e.detail.latLng?.lat;
          const lng = e.detail.latLng?.lng;
          if (lat != null && lng != null) onMapClick(lat, lng);
        }}
      >
        {markerPos && (
          <AdvancedMarker position={markerPos}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#e53e3e",
                border: "2.5px solid #fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}

// ---------- Geocoder hook ----------
// Wraps useMapsLibrary("geocoding") and exposes a reverse-geocode function

function useReverseGeocode() {
  const geocodingLib = useMapsLibrary("geocoding");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    if (geocodingLib) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  const reverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string> => {
      return new Promise((resolve) => {
        if (!geocoderRef.current) { resolve(""); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve("");
          }
        });
      });
    },
    []
  );

  return reverseGeocode;
}

// ---------- Inner form (inside APIProvider) ----------

function ReportIssueInner() {
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // UI state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

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

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      await applyLocation(lat, lng);
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
    files.forEach((file) => formData.append("media", file));

    setSubmitting(true);
    try {
      const data = await fetchApi("/issues", {
        method: "POST",
        body: formData,
      });
      navigate(`/issues/${data.issue.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };


  // ---------- Styles ----------

  const s: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: "600px",
      margin: "40px auto",
      padding: "28px 28px 36px",
      background: "#FFFFFF",
      border: "1px solid #D0D7E3",
      borderRadius: "10px",
      fontFamily: "var(--sans, sans-serif)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
    },
    group: { marginBottom: "18px" },
    label: { display: "block", marginBottom: "5px", fontWeight: 600, fontSize: "13px", color: "#5A6478", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
    input: { width: "100%", padding: "9px 11px", boxSizing: "border-box" as const, fontSize: "14px", border: "1px solid #D0D7E3", borderRadius: "5px", color: "#2D3748", background: "#fff" },
    textarea: { width: "100%", padding: "9px 11px", boxSizing: "border-box" as const, fontSize: "14px", resize: "vertical" as const, minHeight: "110px", border: "1px solid #D0D7E3", borderRadius: "5px", color: "#2D3748", background: "#fff" },
    hint: { fontSize: "12px", color: "#5A6478", marginTop: "5px" },
    charCount: { fontSize: "12px", color: description.length > 2000 ? "#C62828" : "#5A6478", textAlign: "right" as const, marginTop: "3px" },
    error: { color: "#C62828", backgroundColor: "#FFEBEE", border: "1px solid #FFCDD2", padding: "10px 14px", marginBottom: "16px", borderRadius: "6px", fontSize: "14px" },
    submitBtn: {
      width: "100%", padding: "11px", fontSize: "15px", fontWeight: 700,
      backgroundColor: submitting ? "#9EB5D8" : "#1565C0",
      color: "white", border: "none", borderRadius: "6px",
      cursor: submitting ? "not-allowed" : "pointer",
      letterSpacing: "0.01em",
    },
    geoBtn: {
      padding: "7px 14px", fontSize: "13px", border: "1px solid #D0D7E3",
      borderRadius: "5px", cursor: geoLoading ? "not-allowed" : "pointer",
      backgroundColor: "#F5F7FA", color: "#1565C0", fontWeight: 600,
    },
    toggleBtn: {
      background: "none", border: "none", cursor: "pointer",
      color: "#1565C0", fontSize: "13px", padding: 0, textDecoration: "underline",
    },
    coordsDisplay: {
      fontSize: "12px", color: "#2E7D32", marginTop: "8px",
      padding: "6px 10px", backgroundColor: "#E8F5E9", borderRadius: "5px",
      border: "1px solid #C8E6C9",
    },
    back: { display: "block", textAlign: "center" as const, marginTop: "16px", fontSize: "13px", color: "#1565C0" },
  };

  const mapCenter = coords ?? MUMBAI;

  return (
    <div style={s.container}>
      <h1 style={{ marginTop: 0, fontSize: "22px" }}>Report an Issue</h1>

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
              <MapPicker
                center={mapCenter}
                markerPos={coords}
                onMapClick={handleMapClick}
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

        {/* Media Upload */}
        <div style={s.group}>
          <label style={s.label}>
            Photos / Videos{" "}
            <span style={{ fontWeight: "normal", color: "#777" }}>(optional, max {MAX_FILES})</span>
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
                <li key={f.name}>
                  {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
                </li>
              ))}
            </ul>
          )}
          <p style={s.hint}>Accepted: JPEG, PNG, WebP, MP4, MOV — max 25 MB each</p>
        </div>

        <button type="submit" disabled={submitting} style={s.submitBtn}>
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </form>

      <Link to="/" style={s.back}>
        ← Back to map
      </Link>
    </div>
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
