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
import { ShiftsPage } from "./pages/ShiftsPage";
import { MachinesPage } from "./pages/MachinesPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardAnalyticsPage } from "./pages/DashboardAnalyticsPage";
import { UsersAdminPage } from "./pages/UsersAdminPage";
import { AttendanceAdminPage } from "./pages/AttendanceAdminPage";
import { PayrollAdminPage } from "./pages/PayrollAdminPage";
import { SettingsAdminPage } from "./pages/SettingsAdminPage";
import { SettingsElectricityPage } from "./pages/SettingsElectricityPage";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { InventoryPage } from "./pages/InventoryPage";
import { ProductionPage } from "./pages/ProductionPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ChatPage } from "./pages/ChatPage";
import { MyAttendancePage } from "./pages/MyAttendancePage";
import { MyPayrollPage } from "./pages/MyPayrollPage";
import { WorkerSnapshotsPage } from "./pages/WorkerSnapshotsPage";
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
            path="/admin/users"
            element={
              <AdminOnlyRoute>
                <UsersAdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <AdminOnlyRoute>
                <AttendanceAdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/payroll"
            element={
              <AdminOnlyRoute>
                <PayrollAdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminOnlyRoute>
                <SettingsAdminPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/settings/electricity"
            element={
              <AdminOnlyRoute>
                <SettingsElectricityPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/shifts"
            element={
              <AdminOnlyRoute>
                <ShiftsPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/machines"
            element={
              <AdminOnlyRoute>
                <MachinesPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <AdminOnlyRoute>
                <AuditLogsPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/admin/dashboard-analytics"
            element={
              <AdminOnlyRoute>
                <DashboardAnalyticsPage />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
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
            path="/attendance"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <MyAttendancePage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/my-payroll"
            element={
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
              >
                <MyPayrollPage />
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
          <Route
            path="/worker/snapshots"
            element={
              <RoleProtectedRoute allowedRoles={["WORKER"]}>
                <WorkerSnapshotsPage mode="snapshots" />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/worker/tools"
            element={
              <RoleProtectedRoute allowedRoles={["WORKER"]}>
                <WorkerSnapshotsPage mode="tools" />
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
