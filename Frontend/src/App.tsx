import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminOnlyRoute } from "./components/AdminOnlyRoute";
import { AuthLayout } from "./components/AuthLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { AdminPage } from "./pages/AdminPage";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { InventoryPage } from "./pages/InventoryPage";
import { ProductionPage } from "./pages/ProductionPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ChatPage } from "./pages/ChatPage";
import "./App.css";

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={
              <AuthLayout>
                {(locale) => <LoginPage locale={locale} />}
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                {(locale) => <RegisterPage locale={locale} />}
              </AuthLayout>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthLayout>
                {(locale) => <ForgotPasswordPage locale={locale} />}
              </AuthLayout>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthLayout>
                {(locale) => <ResetPasswordPage locale={locale} />}
              </AuthLayout>
            }
          />
          <Route
            path="/verify-email"
            element={
              <AuthLayout>
                {(locale) => <VerifyEmailPage locale={locale} />}
              </AuthLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminOnlyRoute>
                <AdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <InventoryPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/production"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <ProductionPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                <ReportsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <NotificationsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <ChatPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </LocaleProvider>
  );
}

export default App;
