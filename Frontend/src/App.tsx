import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlertToaster } from "./components/AlertToaster";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminOnlyRoute } from "./components/AdminOnlyRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";

// Auth pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { AuthLayout } from "./components/AuthLayout";

// Shared pages
import { DashboardPage } from "./pages/shared/DashboardPage";
import { NotificationsPage } from "./pages/shared/NotificationsPage";
import { ChatPage } from "./pages/shared/ChatPage";
import { MyAttendancePage } from "./pages/shared/MyAttendancePage";
import { MyPayrollPage } from "./pages/shared/MyPayrollPage";
import { ProductionPage } from "./pages/shared/ProductionPage";
import { InventoryStockPage } from "./pages/shared/InventoryStockPage";
import { SuppliersPage } from "./pages/shared/SuppliersPage";
import { SalesPage } from "./pages/shared/SalesPage";
import { ReportsPage } from "./pages/shared/ReportsPage";
import { ProfilePage } from "./pages/shared/ProfilePage";

// Admin pages
import { AdminPage } from "./pages/admin/AdminPage";
import { UsersAdminPage } from "./pages/admin/UsersAdminPage";
import { AttendanceAdminPage } from "./pages/admin/AttendanceAdminPage";
import { PayrollAdminPage } from "./pages/admin/PayrollAdminPage";
import { SettingsAdminPage } from "./pages/admin/SettingsAdminPage";
import { AdminSnapshotsPage } from "./pages/admin/AdminSnapshotsPage";
import { SettingsElectricityPage } from "./pages/admin/SettingsElectricityPage";
import { ShiftsPage } from "./pages/admin/ShiftsPage";
import { MachinesPage } from "./pages/admin/MachinesPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { DashboardAnalyticsPage } from "./pages/admin/DashboardAnalyticsPage";

// Worker pages
import { WorkerSnapshotsPage } from "./pages/worker/WorkerSnapshotsPage";

// Engineer pages
import { EngineerInventoryPage } from "./pages/engineer/EngineerInventoryPage";
import { MaintenancePage } from "./pages/engineer/MaintenancePage";
import { QualityChecksPage } from "./pages/engineer/QualityChecksPage";
import MachineHealthDashboard from "./pages/engineer/MachineHealthDashboard";
import PreventiveMaintenanceSchedule from "./pages/engineer/PreventiveMaintenanceSchedule";
import SparePartsManagement from "./pages/engineer/SparePartsManagement";
import EquipmentLifecycleTracking from "./pages/engineer/EquipmentLifecycleTracking";
import ProductionAnalytics from "./pages/engineer/ProductionAnalytics";
import QualityTrendReports from "./pages/engineer/QualityTrendReports";
import TechnicalDocumentation from "./pages/engineer/TechnicalDocumentation";
import EquipmentCalibration from "./pages/engineer/EquipmentCalibration";
import WorkOrders from "./pages/engineer/WorkOrders";
import EquipmentTransferLog from "./pages/engineer/EquipmentTransferLog";

// Accountant pages
import { AccountantPartsPricingPage } from "./pages/accountant/AccountantPartsPricingPage";
import FinancialDashboard from "./pages/accountant/FinancialDashboard";
import ExpenseTracking from "./pages/accountant/ExpenseTracking";
import InvoiceManagement from "./pages/accountant/InvoiceManagement";
import FinancialReports from "./pages/accountant/FinancialReports";
import SupplierPayables from "./pages/accountant/SupplierPayables";
import CustomerReceivables from "./pages/accountant/CustomerReceivables";
import BudgetPlanning from "./pages/accountant/BudgetPlanning";
import TaxCompliance from "./pages/accountant/TaxCompliance";
import BankReconciliation from "./pages/accountant/BankReconciliation";
import CostAnalysis from "./pages/accountant/CostAnalysis";
import ApprovalWorkflows from "./pages/accountant/ApprovalWorkflows";

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AlertToaster />
          <Routes>
            {/* ── Root ── */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── Auth pages (self-contained layout) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* These still use AuthLayout (less critical) */}
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

            {/* ── Profile ── */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* ── Dashboard ── */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* ── Admin only ── */}
            <Route path="/admin" element={<AdminOnlyRoute><AdminPage /></AdminOnlyRoute>} />
            <Route path="/admin/users" element={<AdminOnlyRoute><UsersAdminPage /></AdminOnlyRoute>} />
            <Route path="/admin/settings" element={<AdminOnlyRoute><SettingsAdminPage /></AdminOnlyRoute>} />
            <Route path="/admin/snapshots" element={<AdminOnlyRoute><AdminSnapshotsPage /></AdminOnlyRoute>} />
            <Route path="/admin/settings/electricity" element={<AdminOnlyRoute><SettingsElectricityPage /></AdminOnlyRoute>} />
            <Route path="/admin/shifts" element={<AdminOnlyRoute><ShiftsPage /></AdminOnlyRoute>} />
            <Route path="/admin/machines" element={<AdminOnlyRoute><MachinesPage /></AdminOnlyRoute>} />
            <Route path="/admin/audit-logs" element={<AdminOnlyRoute><AuditLogsPage /></AdminOnlyRoute>} />
            <Route path="/admin/dashboard-analytics" element={<AdminOnlyRoute><DashboardAnalyticsPage /></AdminOnlyRoute>} />

            {/* ── Admin + Accountant ── */}
            <Route
              path="/admin/attendance"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <AttendanceAdminPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/payroll"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <PayrollAdminPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <InventoryStockPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <SuppliersPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <SalesPage />
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

            {/* ── Accountant: Parts Pricing (new) ── */}
            <Route
              path="/accountant/parts-pricing"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                  <AccountantPartsPricingPage />
                </RoleProtectedRoute>
              }
            />
            {/* ── Accountant Phase 1 Features ── */}
            <Route
              path="/accountant/financial-dashboard"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <FinancialDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/expenses"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <ExpenseTracking />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/invoices"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <InvoiceManagement />
                </RoleProtectedRoute>
              }
            />
            {/* ── Accountant Phase 2 Features ── */}
            <Route
              path="/accountant/financial-reports"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <FinancialReports />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/payables"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <SupplierPayables />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/receivables"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <CustomerReceivables />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/budgets"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <BudgetPlanning />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/tax"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <TaxCompliance />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/reconciliation"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <BankReconciliation />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/cost-analysis"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <CostAnalysis />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accountant/approvals"
              element={
                <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                  <ApprovalWorkflows />
                </RoleProtectedRoute>
              }
            />

            {/* ── Shared routes (all roles) ── */}
            <Route
              path="/production"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}>
                  <ProductionPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}>
                  <NotificationsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}>
                  <MyAttendancePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/my-payroll"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}>
                  <MyPayrollPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}>
                  <ChatPage />
                </RoleProtectedRoute>
              }
            />

            {/* ── Engineer routes ── */}
            <Route
              path="/engineer/inventory"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <EngineerInventoryPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN", "WORKER"]}>
                  <MaintenancePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/quality-checks"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <QualityChecksPage />
                </RoleProtectedRoute>
              }
            />
            {/* ── Engineer Phase 1 Features ── */}
            <Route
              path="/engineer/machines"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <MachineHealthDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/maintenance-schedule"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <PreventiveMaintenanceSchedule />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/spare-parts"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <SparePartsManagement />
                </RoleProtectedRoute>
              }
            />
            {/* ── Engineer Phase 2 Features ── */}
            <Route
              path="/engineer/equipment-lifecycle"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <EquipmentLifecycleTracking />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/production-analytics"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <ProductionAnalytics />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/quality-trends"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <QualityTrendReports />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/documentation"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <TechnicalDocumentation />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/calibration"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <EquipmentCalibration />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/work-orders"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <WorkOrders />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/engineer/equipment-transfer"
              element={
                <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                  <EquipmentTransferLog />
                </RoleProtectedRoute>
              }
            />

            {/* ── Worker only ── */}
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

            {/* ── Redirects ── */}
            <Route path="/suppliers" element={<Navigate to="/purchases" replace />} />
            <Route path="/customers" element={<Navigate to="/sales" replace />} />
            <Route path="/worker/readings" element={<Navigate to="/worker/snapshots" replace />} />
            <Route path="/worker/production" element={<Navigate to="/worker/tools" replace />} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
