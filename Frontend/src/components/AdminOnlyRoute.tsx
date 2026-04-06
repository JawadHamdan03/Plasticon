import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

type AdminOnlyRouteProps = {
  children: ReactNode;
};

export function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="route-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
