import type { ReactNode } from "react";
import "./EmptyState.css";

interface EmptyStateProps {
  /** Emoji or React node shown as the large illustration */
  icon?: ReactNode;
  /** Main heading */
  title: string;
  /** Muted supporting text */
  message?: string;
  /** Optional call-to-action (e.g. a Button) */
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
