import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

type RoleProtectedRouteProps = {
  allowedRoles: Array<string>;
  children: ReactNode;
};

export function RoleProtectedRoute({
  allowedRoles,
  children,
}: RoleProtectedRouteProps) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <div className="route-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.role || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
