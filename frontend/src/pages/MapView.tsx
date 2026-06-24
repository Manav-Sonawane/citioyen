import { useAuth } from "../lib/auth";

export function MapView() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Map View</h1>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
