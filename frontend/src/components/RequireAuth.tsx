import { ReactComponentElement, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  const location = useLocation();

  return auth.user !== null ? (
    children
  ) : (
    <Navigate to="/login" state={{ locationBeforeLoggingIn: location }} replace />
  );
}

function requireAuth(children: JSX.Element) {
  return <RequireAuth>{children}</RequireAuth>;
}

export default RequireAuth;
export { requireAuth };
