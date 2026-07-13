import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm px-3 py-1.5 rounded-md transition-colors ${
          isActive ? "bg-raised text-ink" : "text-muted hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="p-1.5 rounded-md text-muted hover:text-ink transition-colors"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal inline-block" />
            <span className="font-display font-semibold tracking-tight">
              Fundamentals <span className="text-muted font-normal">/ AZ-900</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/learn">Learn</NavItem>
            <NavItem to="/quiz">Quiz</NavItem>
            <NavItem to="/exam">Practice Exam</NavItem>
            <NavItem to="/flashcards">Flashcards</NavItem>
            {user && <NavItem to="/progress">Progress</NavItem>}
            {user ? (
              <button
                onClick={logout}
                className="text-sm px-3 py-1.5 rounded-md text-muted hover:text-ink transition-colors"
              >
                Sign out
              </button>
            ) : (
              <NavItem to="/login">Sign in</NavItem>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10 w-full">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-muted font-mono">
          Not affiliated with or endorsed by Microsoft. An independent study aid for Exam AZ-900.
        </div>
      </footer>
    </div>
  );
}
