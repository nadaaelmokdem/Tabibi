import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import type { ProtectedRouteProps } from "../types/props";

/**
 * Route guard component that redirects to login if user is not authenticated
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

 if (allowedRoles) {
  if (
    !user?.roles ||
    !user.roles.some((role) =>
      allowedRoles.map((t) => t.toLowerCase()).includes(role.toLowerCase())
    )
  ) {
    return <Navigate to="/" replace />;
  }
}

  return <>{children}</>;
}
