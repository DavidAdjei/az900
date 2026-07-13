import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guards a set of nested routes behind authentication. While the auth state is
 * still being resolved (e.g. a token exists but the stored user hasn't loaded
 * yet) we render nothing rather than flash a redirect. Once resolved, signed-out
 * visitors are sent to /login with the page they wanted attached as ?from=, so
 * Login can send them back after a successful sign-in.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  return <Outlet />;
}
