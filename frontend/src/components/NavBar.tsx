import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import "./NavBar.css";

const NAV_LINKS = [
  { to: "/", label: "Feed" },
  { to: "/map", label: "Map" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/hotspots", label: "Hotspots" },
] as const;

export function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      {/* ── Left: brand ── */}
      <Link to="/" className="navbar__brand">
        <span className="navbar__logo">Citioyen</span>
      </Link>

      {/* ── Center: navigation links ── */}
      <div className="navbar__links">
        {NAV_LINKS.map(({ to, label }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`navbar__link${isActive ? " navbar__link--active" : ""}`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── Right: auth actions ── */}
      <div className="navbar__actions">
        {user ? (
          <>
            {/* Profile */}
            <Link to="/profile" className="navbar__user">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="navbar__avatar"
                />
              ) : (
                <span className="navbar__avatar-fallback">
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
              <span>{user.name}</span>
            </Link>

            {/* Role-based links */}
            {["admin", "super_admin"].includes(user.role) && (
              <>
                <span className="navbar__divider" />
                <Link
                  to="/admin"
                  className="navbar__role-link navbar__role-link--admin"
                >
                  Admin
                </Link>
              </>
            )}

            {user.role === "field_agent" && (
              <>
                <span className="navbar__divider" />
                <Link
                  to="/field-agent"
                  className="navbar__role-link navbar__role-link--field"
                >
                  Field Agent
                </Link>
              </>
            )}

            <span className="navbar__divider" />
            <button className="navbar__logout" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar__auth-btn navbar__auth-btn--login">
              Log In
            </Link>
            <Link to="/signup" className="navbar__auth-btn navbar__auth-btn--signup">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
