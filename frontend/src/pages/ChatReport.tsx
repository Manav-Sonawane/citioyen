import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapLocationPicker } from "../components/MapLocationPicker";
import { PageContainer, Card, Button } from "../components/ui";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MUMBAI = { lat: 19.076, lng: 72.8777 };

type Message = {
  role: "user" | "model";
  text: string;
};

interface LatLng {
  lat: number;
  lng: number;
}

type ExtractedData = {
  title: string | null;
  description: string;
  lat: number;
  lng: number;
  addressText: string;
  categoryHint: string | null;
  wardId?: string | null;
  landmark?: string | null;
  area?: string | null;
};

export function ChatReportInner() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Message[]>([
    { role: "model", text: "Hi! I'm here to help you report an issue. What did you find?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [pendingLocationPick, setPendingLocationPick] = useState<{
    candidates: {lat: number, lng: number, formattedAddress: string}[];
    title: string | null;
    description: string;
    categoryHint: string | null;
    landmark?: string | null;
    area?: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, extractedData, loading]);

  const handleSend = async () => {
    if (!inputText.trim() || loading || extractedData) return;

    const newMsg: Message = { role: "user", text: inputText.trim() };
    const newHistory = [...history, newMsg];
    setHistory(newHistory);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetchApi("/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: newHistory }),
      });

      if (res.readyToSubmit) {
        setExtractedData(res.extracted);
      } else if (res.needsLocationPick) {
        setHistory([...newHistory, { role: "model", text: res.botMessage }]);
        setPendingLocationPick({
          candidates: res.locationCandidates,
          title: res.extracted.title,
          description: res.extracted.description,
          categoryHint: res.extracted.categoryHint,
          landmark: res.extracted.landmark,
          area: res.extracted.area
        });
      } else {
        setHistory([...newHistory, { role: "model", text: res.botMessage || res.followUpQuestion }]);
      }
    } catch (err: any) {
      setHistory([...newHistory, { role: "model", text: "Sorry, I ran into an error. Could you try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelection = async (lat: number, lng: number, address: string) => {
    if (!pendingLocationPick) return;

    setPendingLocationPick(null);
    setHistory([...history, { role: "model", text: `Got it. Location set to: ${address}` }]);
    setExtractedData({
      title: pendingLocationPick.title,
      description: pendingLocationPick.description,
      categoryHint: pendingLocationPick.categoryHint,
      lat,
      lng,
      addressText: address,
      landmark: pendingLocationPick.landmark,
      area: pendingLocationPick.area
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitIssue = async () => {
    if (!extractedData) return;
    setSubmitting(true);

    const formData = new FormData();
    if (extractedData.title) formData.append("title", extractedData.title);
    formData.append("description", extractedData.description);
    formData.append("lat", String(extractedData.lat));
    formData.append("lng", String(extractedData.lng));
    if (extractedData.addressText) formData.append("addressText", extractedData.addressText);
    if (extractedData.landmark) formData.append("landmark", extractedData.landmark);
    if (extractedData.wardId) formData.append("wardId", extractedData.wardId);
    if (attachedImage) formData.append("media", attachedImage);

    try {
      await fetchApi("/issues", {
        method: "POST",
        body: formData, // fetchApi will omit Content-Type for FormData automatically
      });
      setSuccess(true);
    } catch (err: any) {
      alert("Failed to submit issue: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeepEditing = () => {
    setExtractedData(null);
    setHistory([...history, { role: "model", text: "No problem. What needs to be changed?" }]);
  };

  if (success) {
    return (
      <PageContainer narrow>
        <Card>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "var(--text-heading)", margin: 0 }}>Your report was submitted successfully</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Thank you for keeping the community safe!</p>
            <Button variant="primary" size="lg" onClick={() => navigate("/")} style={{ marginTop: 32 }}>
              Back to Home
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "calc(100vh - var(--navbar-height) - 96px)", minHeight: "400px" }}>
        <div style={s.header}>
          <h1 style={{ margin: 0, fontSize: "20px" }}>Report via Chat</h1>
          <Link to="/" style={{ fontSize: "14px", color: "var(--primary)", textDecoration: "none" }}>Cancel</Link>
        </div>

        <div style={s.chatBox}>
          {history.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? s.userRow : s.modelRow}>
              <div style={msg.role === "user" ? s.userMsg : s.modelMsg}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={s.modelRow}>
              <div style={{ ...s.modelMsg, color: "var(--text-muted)", fontStyle: "italic" }}>Typing...</div>
            </div>
          )}

          {pendingLocationPick && (
            <div style={{ padding: "0 10px" }}>
              <APIProvider apiKey={API_KEY}>
                <MapLocationPicker 
                  center={pendingLocationPick.candidates.length > 0 ? pendingLocationPick.candidates[0] : (userLocation || MUMBAI)}
                  zoom={pendingLocationPick.candidates.length > 0 ? 14 : (userLocation ? 16 : 13)}
                  candidateMarkers={pendingLocationPick.candidates}
                  onLocationSelect={handleMapSelection}
                />
              </APIProvider>
            </div>
          )}
          
          {extractedData && (
            <Card style={{ margin: "8px 0", borderColor: "var(--primary-light)" }}>
              <h3 style={{ marginTop: 0, fontSize: "16px", marginBottom: "12px", color: "var(--primary)" }}>Ready to submit?</h3>
              <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--text)" }}>
                {extractedData.title && <><strong>Title:</strong> {extractedData.title}<br/></>}
                <strong>Description:</strong> {extractedData.description}<br/>
                <strong>Location:</strong> {extractedData.addressText || `${extractedData.lat.toFixed(4)}, ${extractedData.lng.toFixed(4)}`}<br/>
                {extractedData.landmark && <><strong>Landmark:</strong> {extractedData.landmark}<br/></>}
                {extractedData.area && <><strong>Area:</strong> {extractedData.area}<br/></>}
                {extractedData.categoryHint && <><strong style={{ textTransform: "capitalize" }}>Category guess:</strong> {extractedData.categoryHint}<br/></>}
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <Button variant="primary" onClick={handleSubmitIssue} disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? "Submitting..." : "Confirm & Submit"}
                </Button>
                <Button variant="secondary" onClick={handleKeepEditing} disabled={submitting} style={{ flex: 1 }}>
                  Keep editing
                </Button>
              </div>
            </Card>
          )}

          <div ref={bottomRef} />
        </div>

        <div style={s.inputArea}>
          {attachedImage && (
            <div style={{ padding: "8px 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Attached:</div>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={URL.createObjectURL(attachedImage)} alt="Preview" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: 4 }} />
                <button 
                  onClick={() => setAttachedImage(null)}
                  style={{ position: "absolute", top: -6, right: -6, background: "var(--danger)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "10px", padding: "var(--space-md) var(--space-lg)" }}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files?.[0]) setAttachedImage(e.target.files[0]);
                e.target.value = '';
              }}
              style={{ display: "none" }} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !!extractedData || submitting || !!pendingLocationPick}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 20
              }}
              title="Attach image"
            >
              📷
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the issue..."
              disabled={loading || !!extractedData || submitting}
              style={{ ...s.textarea, flex: 1, margin: 0 }}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || loading || !!extractedData || submitting || !!pendingLocationPick}
              style={s.sendBtn}
            >
              Send
            </button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

export function ChatReport() {
  return (
    <APIProvider apiKey={API_KEY}>
      <ChatReportInner />
    </APIProvider>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    padding: "var(--space-md) var(--space-lg)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chatBox: {
    flex: 1,
    padding: "var(--space-lg)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "var(--bg)"
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end"
  },
  modelRow: {
    display: "flex",
    justifyContent: "flex-start"
  },
  userMsg: {
    backgroundColor: "var(--primary)",
    color: "#fff",
    padding: "var(--space-sm) var(--space-md)",
    borderRadius: "var(--radius-lg) var(--radius-lg) 0px var(--radius-lg)",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  modelMsg: {
    backgroundColor: "var(--border)",
    color: "var(--text-heading)",
    padding: "var(--space-sm) var(--space-md)",
    borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 0px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  inputArea: {
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
    borderBottomLeftRadius: "var(--radius-md)",
    borderBottomRightRadius: "var(--radius-md)",
    display: "flex",
    flexDirection: "column",
  },
  textarea: {
    flex: 1,
    padding: "var(--space-sm) var(--space-md)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    resize: "none",
    fontFamily: "inherit",
    fontSize: "14px"
  },
  sendBtn: {
    padding: "var(--space-sm) var(--space-lg)",
    backgroundColor: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontWeight: "bold",
    cursor: "pointer",
    height: "100%"
  },
};
