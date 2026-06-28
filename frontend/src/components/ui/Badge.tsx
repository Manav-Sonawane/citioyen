import "./Badge.css";

const KNOWN_STATUSES = new Set([
  "reported",
  "verified",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
]);

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  const modifier = KNOWN_STATUSES.has(status) ? status : "unknown";
  const cls = ["badge", `badge--${modifier}`, className].filter(Boolean).join(" ");

  return <span className={cls}>{statusLabel(status)}</span>;
}
