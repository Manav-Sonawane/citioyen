import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapLocationPicker } from "../components/MapLocationPicker";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const MUMBAI = { lat: 19.076, lng: 72.8777 };

type Message = {
  role: "user" | "model";
  text: string;
};

type ExtractedData = {
  description: string;
  lat: number;
  lng: number;
  addressText: string;
  categoryHint: string | null;
};

export function ChatReportInner() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Message[]>([
    { role: "model", text: "Hi! I'm here to help you report an issue. What did you find?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [pendingLocationPick, setPendingLocationPick] = useState<{
    candidates: {lat: number, lng: number, formattedAddress: string}[];
    description: string;
    categoryHint: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

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
          description: res.extracted.description,
          categoryHint: res.extracted.categoryHint
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
      description: pendingLocationPick.description,
      categoryHint: pendingLocationPick.categoryHint,
      lat,
      lng,
      addressText: address
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
    formData.append("description", extractedData.description);
    formData.append("lat", String(extractedData.lat));
    formData.append("lng", String(extractedData.lng));
    if (extractedData.addressText) formData.append("addressText", extractedData.addressText);

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
      <div style={s.container}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: "var(--text-heading)", margin: 0 }}>Your report was submitted successfully</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Thank you for keeping the community safe!</p>
          <button onClick={() => navigate("/")} style={{ ...s.primaryBtn, marginTop: 32 }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
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
            <div style={{ ...s.modelMsg, color: "#888", fontStyle: "italic" }}>Typing...</div>
          </div>
        )}

        {pendingLocationPick && (
          <div style={{ padding: "0 10px" }}>
            <APIProvider apiKey={API_KEY}>
              <MapLocationPicker 
                center={pendingLocationPick.candidates[0] || MUMBAI}
                candidateMarkers={pendingLocationPick.candidates}
                onLocationSelect={handleMapSelection}
              />
            </APIProvider>
          </div>
        )}
        
        {extractedData && (
          <div style={s.summaryCard}>
            <h3 style={{ marginTop: 0, fontSize: "16px", marginBottom: "12px", color: "#1565c0" }}>Ready to submit?</h3>
            <div style={{ fontSize: "14px", lineHeight: "1.5", color: "#333" }}>
              <strong>Description:</strong> {extractedData.description}<br/>
              <strong>Location:</strong> {extractedData.addressText || `${extractedData.lat.toFixed(4)}, ${extractedData.lng.toFixed(4)}`}<br/>
              {extractedData.categoryHint && <><strong style={{ textTransform: "capitalize" }}>Category guess:</strong> {extractedData.categoryHint}<br/></>}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={handleSubmitIssue} disabled={submitting} style={s.primaryBtn}>
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
              <button onClick={handleKeepEditing} disabled={submitting} style={s.secondaryBtn}>
                Keep editing
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={s.inputArea}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the issue..."
          disabled={loading || !!extractedData || submitting}
          style={s.textarea}
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
  container: {
    maxWidth: "600px",
    margin: "40px auto",
    background: "#FFFFFF",
    border: "1px solid #D0D7E3",
    borderRadius: "10px",
    fontFamily: "var(--sans, sans-serif)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 140px)",
    minHeight: "400px"
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chatBox: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "#f9fafc"
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
    padding: "10px 14px",
    borderRadius: "16px 16px 0px 16px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  modelMsg: {
    backgroundColor: "#e2e8f0",
    color: "#1e293b",
    padding: "10px 14px",
    borderRadius: "16px 16px 16px 0px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  summaryCard: {
    backgroundColor: "#fff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  inputArea: {
    padding: "16px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    borderRadius: "0 0 10px 10px"
  },
  textarea: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    resize: "none",
    fontFamily: "inherit",
    fontSize: "14px"
  },
  sendBtn: {
    padding: "10px 20px",
    backgroundColor: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    height: "100%"
  },
  primaryBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  secondaryBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#fff",
    color: "var(--primary)",
    border: "1px solid var(--primary)",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer"
  }
};
