
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import type { ProtectedRouteProps } from "../types/props";
import Skeleton from "./common/Skeleton";

function getLoginPathForRoles(allowedRoles?: string[]): string {
  if (!allowedRoles?.length) return "/login";
  if (allowedRoles.some((r) => r.toLowerCase() === "admin")) return "/admin-login";
  if (allowedRoles.some((r) => r.toLowerCase() === "doctor")) return "/doctor-login";
  return "/login";
}

/**
 * Route guard component that redirects to login if user is not authenticated
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Skeleton className="h-[80vh] w-full max-w-4xl" />
      </div>
    );
  }

  const loginPath = getLoginPathForRoles(allowedRoles);

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles) {
    if (user?.activeRole) {
      const activeRoleMatch = allowedRoles.some((r) => r.toLowerCase() === user?.activeRole?.toLowerCase());
      if (!activeRoleMatch) {
        return <Navigate to="/" replace />;
      }
    } else {
      const hasAllowedRole = user?.roles?.some((role) =>
        allowedRoles.some(t => role.toLowerCase() === t.toLowerCase())
      );
      
      if (!hasAllowedRole) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
