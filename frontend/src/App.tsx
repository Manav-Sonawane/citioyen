import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NavBar } from "./components/NavBar";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { MapView } from "./pages/MapView";
import { HomeFeed } from "./pages/HomeFeed";
import { IssueDetail } from "./pages/IssueDetail";
import { ReportIssue } from "./pages/ReportIssue";
import { ChatReport } from "./pages/ChatReport";
import { AdminDashboard } from "./pages/AdminDashboard";
import { FieldAgentDashboard } from "./pages/FieldAgentDashboard";
import { PublicDashboard } from "./pages/PublicDashboard";
import { Leaderboard } from "./pages/Leaderboard";
import { Hotspots } from "./pages/Hotspots";
import { Profile } from "./pages/Profile";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PublicDashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/hotspots" element={<Hotspots />} />
        
        <Route path="/" element={<ProtectedRoute><HomeFeed /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
        <Route path="/chat-report" element={<ProtectedRoute><ChatReport /></ProtectedRoute>} />
        <Route path="/issues/:id" element={<ProtectedRoute><IssueDetail /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/field-agent" element={<ProtectedRoute><FieldAgentDashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;

