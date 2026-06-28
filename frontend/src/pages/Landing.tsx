import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { Button, Card } from "../components/ui";
import "./Landing.css";

// ---------- Types ----------

interface StatsData {
  totalIssues: number;
  resolvedCount: number;
  averageResolutionHours: number;
}

// ---------- Landing Page ----------

export function Landing() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchApi("/stats")
      .then(setStats)
      .catch(() => {}); // silently fail — stats strip is optional
  }, []);

  return (
    <div className="landing">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="landing__hero">
        <div className="landing__hero-inner">
          <span className="landing__badge">Open-source civic platform</span>
          <h1 className="landing__title">Citioyen</h1>
          <p className="landing__subtitle">
            AI-powered civic issue reporting that actually gets things resolved.
          </p>
          <div className="landing__ctas">
            <Link to="/signup">
              <Button variant="primary" size="lg" style={{ padding: "14px 36px", fontSize: 16, borderRadius: "var(--radius-full)" }}>
                Get Started
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary" size="lg" style={{ padding: "14px 36px", fontSize: 16, borderRadius: "var(--radius-full)" }}>
                View Live Stats
              </Button>
            </Link>
          </div>
        </div>
        {/* Decorative gradient */}
        <div className="landing__hero-glow" />
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="landing__section">
        <div className="landing__container">
          <h2 className="landing__section-title">How It Works</h2>
          <p className="landing__section-desc">Four simple steps from spotting a problem to verified resolution.</p>
          <div className="landing__steps">
            <StepCard
              icon="📸"
              number={1}
              title="Report"
              description="Snap a photo and describe the issue. AI categorizes it instantly and assigns a severity."
            />
            <StepCard
              icon="✅"
              number={2}
              title="Verify"
              description="Other citizens confirm or dispute the report. Community validation builds trust."
            />
            <StepCard
              icon="📊"
              number={3}
              title="Track"
              description="Follow the full status timeline from reported to assigned. SLA deadlines keep things moving."
            />
            <StepCard
              icon="🔍"
              number={4}
              title="Resolve"
              description="Field agents upload proof. AI compares before & after photos to verify resolution."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ LIVE STATS ═══════════════ */}
      {stats && (
        <section className="landing__stats-strip">
          <div className="landing__container">
            <div className="landing__stats-grid">
              <StatCard label="Issues Reported" value={stats.totalIssues} icon="🏙️" />
              <StatCard label="Issues Resolved" value={stats.resolvedCount} icon="✅" />
              <StatCard
                label="Avg. Resolution Time"
                value={`${stats.averageResolutionHours.toFixed(1)}h`}
                icon="⏱️"
              />
              <StatCard
                label="Resolution Rate"
                value={stats.totalIssues > 0
                  ? `${Math.round((stats.resolvedCount / stats.totalIssues) * 100)}%`
                  : "—"}
                icon="📈"
              />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="landing__footer">
        <div className="landing__container">
          <div className="landing__footer-brand">
            <span className="landing__footer-logo">Citioyen</span>
            <p className="landing__footer-tagline">Making cities work for everyone.</p>
          </div>
          <div className="landing__footer-tech">
            <span className="landing__footer-label">Built with</span>
            <div className="landing__footer-chips">
              {["React", "Express", "PostgreSQL", "Gemini API", "Google Maps"].map((tech) => (
                <span key={tech} className="landing__tech-chip">{tech}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------- Sub-components ----------

function StepCard({
  icon,
  number,
  title,
  description,
}: {
  icon: string;
  number: number;
  title: string;
  description: string;
}) {
  return (
    <Card hoverable style={{ textAlign: "center", padding: "var(--space-lg) var(--space-md)", position: "relative" }}>
      <span className="landing__step-number">{number}</span>
      <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--text-heading)" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{description}</p>
    </Card>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card style={{ textAlign: "center", padding: "var(--space-lg) var(--space-md)" }}>
      <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-heading)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, fontWeight: 600 }}>{label}</div>
    </Card>
  );
}
