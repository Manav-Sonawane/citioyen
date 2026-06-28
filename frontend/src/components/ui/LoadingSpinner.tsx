import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  /** Optional text shown below the spinner */
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__ring" />
      {message && <p className="loading-spinner__message">{message}</p>}
    </div>
  );
}
