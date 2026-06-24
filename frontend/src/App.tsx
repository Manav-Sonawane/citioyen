import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { MapView } from "./pages/MapView";
import { IssueDetail } from "./pages/IssueDetail";
import { ReportIssue } from "./pages/ReportIssue";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
        <Route path="/issues/:id" element={<ProtectedRoute><IssueDetail /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
