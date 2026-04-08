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
  const normalizedRole = String(user?.role ?? "").toUpperCase();
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase());

  if (loading) {
    return <div className="route-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!normalizedRole || !normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
