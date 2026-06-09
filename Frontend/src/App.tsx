import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlertToaster } from "./components/AlertToaster";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminOnlyRoute } from "./components/AdminOnlyRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { AuthLayout } from "./components/AuthLayout";

// ── Lazy page imports ──────────────────────────────────────────
// Named exports need .then(m => ({ default: m.X })) to satisfy React.lazy()

// Auth pages
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./pages/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const RequestAccessPage = lazy(() =>
  import("./pages/auth/RequestAccessPage").then((m) => ({
    default: m.RequestAccessPage,
  })),
);

// Shared pages
const DashboardPage = lazy(() =>
  import("./pages/shared/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const ElectricityPage = lazy(() =>
  import("./pages/shared/ElectricityPage").then((m) => ({
    default: m.ElectricityPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("./pages/shared/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ChatPage = lazy(() =>
  import("./pages/shared/ChatPage").then((m) => ({ default: m.ChatPage })),
);
const MyAttendancePage = lazy(() =>
  import("./pages/shared/MyAttendancePage").then((m) => ({
    default: m.MyAttendancePage,
  })),
);
const MyPayrollPage = lazy(() =>
  import("./pages/shared/MyPayrollPage").then((m) => ({
    default: m.MyPayrollPage,
  })),
);
const ProductionPage = lazy(() =>
  import("./pages/shared/ProductionPage").then((m) => ({
    default: m.ProductionPage,
  })),
);
const ConsumptionPage = lazy(() =>
  import("./pages/shared/ConsumptionPage").then((m) => ({
    default: m.ConsumptionPage,
  })),
);
const InventoryStockPage = lazy(() =>
  import("./pages/shared/InventoryStockPage").then((m) => ({
    default: m.InventoryStockPage,
  })),
);
const SuppliersPage = lazy(() =>
  import("./pages/shared/SuppliersPage").then((m) => ({
    default: m.SuppliersPage,
  })),
);
const SalesPage = lazy(() =>
  import("./pages/shared/SalesPage").then((m) => ({ default: m.SalesPage })),
);
const ReportsPage = lazy(() =>
  import("./pages/shared/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/shared/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);

// Admin pages
const AdminPage = lazy(() =>
  import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const RegistrationRequestsPage = lazy(() =>
  import("./pages/admin/RegistrationRequestsPage").then((m) => ({
    default: m.RegistrationRequestsPage,
  })),
);
const UsersAdminPage = lazy(() =>
  import("./pages/admin/UsersAdminPage").then((m) => ({
    default: m.UsersAdminPage,
  })),
);
const AttendanceAdminPage = lazy(() =>
  import("./pages/admin/AttendanceAdminPage").then((m) => ({
    default: m.AttendanceAdminPage,
  })),
);
const PayrollAdminPage = lazy(() =>
  import("./pages/admin/PayrollAdminPage").then((m) => ({
    default: m.PayrollAdminPage,
  })),
);
const SettingsAdminPage = lazy(() =>
  import("./pages/admin/SettingsAdminPage").then((m) => ({
    default: m.SettingsAdminPage,
  })),
);
const AdminSnapshotsPage = lazy(() =>
  import("./pages/admin/AdminSnapshotsPage").then((m) => ({
    default: m.AdminSnapshotsPage,
  })),
);
const AdminWorkerRecordsPage = lazy(() =>
  import("./pages/admin/AdminWorkerRecordsPage").then((m) => ({
    default: m.AdminWorkerRecordsPage,
  })),
);
const SettingsElectricityPage = lazy(() =>
  import("./pages/admin/SettingsElectricityPage").then((m) => ({
    default: m.SettingsElectricityPage,
  })),
);
const ShiftsPage = lazy(() =>
  import("./pages/admin/ShiftsPage").then((m) => ({ default: m.ShiftsPage })),
);
const MachinesPage = lazy(() =>
  import("./pages/admin/MachinesPage").then((m) => ({
    default: m.MachinesPage,
  })),
);
const AuditLogsPage = lazy(() =>
  import("./pages/admin/AuditLogsPage").then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const DashboardAnalyticsPage = lazy(() =>
  import("./pages/admin/DashboardAnalyticsPage").then((m) => ({
    default: m.DashboardAnalyticsPage,
  })),
);
const EngineerOverviewPage = lazy(
  () => import("./pages/admin/EngineerOverviewPage"),
);
const AdminMachineStopsPage = lazy(() =>
  import("./pages/admin/AdminMachineStopsPage").then((m) => ({
    default: m.AdminMachineStopsPage,
  })),
);

// Support machine readings pages
const SupportMachineReadingsPage = lazy(() =>
  import("./pages/engineer/SupportMachineReadingsPage").then((m) => ({
    default: m.SupportMachineReadingsPage,
  })),
);
const AdminSupportMachinesPage = lazy(() =>
  import("./pages/admin/AdminSupportMachinesPage").then((m) => ({
    default: m.AdminSupportMachinesPage,
  })),
);

// Worker pages
const WorkerSnapshotsPage = lazy(() =>
  import("./pages/worker/WorkerSnapshotsPage").then((m) => ({
    default: m.WorkerSnapshotsPage,
  })),
);
const WorkerHubPage = lazy(() =>
  import("./pages/worker/WorkerHubPage").then((m) => ({
    default: m.WorkerHubPage,
  })),
);

// Engineer pages
const EngineerInventoryPage = lazy(() =>
  import("./pages/engineer/EngineerInventoryPage").then((m) => ({
    default: m.EngineerInventoryPage,
  })),
);
const MaintenancePage = lazy(() =>
  import("./pages/engineer/MaintenancePage").then((m) => ({
    default: m.MaintenancePage,
  })),
);
const QualityChecksPage = lazy(() =>
  import("./pages/engineer/QualityChecksPage").then((m) => ({
    default: m.QualityChecksPage,
  })),
);
const MachineHealthDashboard = lazy(
  () => import("./pages/engineer/MachineHealthDashboard"),
);
const PreventiveMaintenanceSchedule = lazy(
  () => import("./pages/engineer/PreventiveMaintenanceSchedule"),
);
const SparePartsManagement = lazy(
  () => import("./pages/engineer/SparePartsManagement"),
);
const EquipmentLifecycleTracking = lazy(
  () => import("./pages/engineer/EquipmentLifecycleTracking"),
);
const ProductionAnalytics = lazy(
  () => import("./pages/engineer/ProductionAnalytics"),
);
const QualityTrendReports = lazy(
  () => import("./pages/engineer/QualityTrendReports"),
);
const TechnicalDocumentation = lazy(
  () => import("./pages/engineer/TechnicalDocumentation"),
);
const EquipmentCalibration = lazy(
  () => import("./pages/engineer/EquipmentCalibration"),
);
const WorkOrders = lazy(() => import("./pages/engineer/WorkOrders"));
const EquipmentTransferLog = lazy(
  () => import("./pages/engineer/EquipmentTransferLog"),
);
const RawMaterialAlerts = lazy(
  () => import("./pages/engineer/RawMaterialAlerts"),
);
const MaintenanceCosts = lazy(
  () => import("./pages/engineer/MaintenanceCosts"),
);

// Accountant pages
const AccountantPartsPricingPage = lazy(() =>
  import("./pages/accountant/AccountantPartsPricingPage").then((m) => ({
    default: m.AccountantPartsPricingPage,
  })),
);
const FinancialDashboard = lazy(
  () => import("./pages/accountant/FinancialDashboard"),
);
const ExpenseTracking = lazy(
  () => import("./pages/accountant/ExpenseTracking"),
);
const InvoiceManagement = lazy(
  () => import("./pages/accountant/InvoiceManagement"),
);
const FinancialReports = lazy(
  () => import("./pages/accountant/FinancialReports"),
);
const SupplierPayables = lazy(
  () => import("./pages/accountant/SupplierPayables"),
);
const CustomerReceivables = lazy(
  () => import("./pages/accountant/CustomerReceivables"),
);
const BudgetPlanning = lazy(() => import("./pages/accountant/BudgetPlanning"));
const TaxCompliance = lazy(() => import("./pages/accountant/TaxCompliance"));
const BankReconciliation = lazy(
  () => import("./pages/accountant/BankReconciliation"),
);
const CostAnalysis = lazy(() => import("./pages/accountant/CostAnalysis"));
const ApprovalWorkflows = lazy(
  () => import("./pages/accountant/ApprovalWorkflows"),
);
const SupplierManagement = lazy(
  () => import("./pages/accountant/SupplierManagement"),
);
const EmployeePerformance = lazy(
  () => import("./pages/accountant/EmployeePerformance"),
);
const CustomerReturnsPage = lazy(
  () => import("./pages/accountant/CustomerReturnsPage"),
);

// AI pages
const AIHubPage = lazy(() =>
  import("./pages/ai/AIHubPage").then((m) => ({ default: m.AIHubPage })),
);
const InvoiceExtractionPage = lazy(() =>
  import("./pages/ai/InvoiceExtractionPage").then((m) => ({
    default: m.InvoiceExtractionPage,
  })),
);
const RAGAssistantPage = lazy(() =>
  import("./pages/ai/RAGAssistantPage").then((m) => ({
    default: m.RAGAssistantPage,
  })),
);
const AnomalyDetectionPage = lazy(() =>
  import("./pages/ai/AnomalyDetectionPage").then((m) => ({
    default: m.AnomalyDetectionPage,
  })),
);
const MaintenanceReportPage = lazy(() =>
  import("./pages/ai/MaintenanceReportPage").then((m) => ({
    default: m.MaintenanceReportPage,
  })),
);
const ShiftHandoverPage = lazy(() =>
  import("./pages/ai/ShiftHandoverPage").then((m) => ({
    default: m.ShiftHandoverPage,
  })),
);
const WorkerCoachingPage = lazy(() =>
  import("./pages/ai/WorkerCoachingPage").then((m) => ({
    default: m.WorkerCoachingPage,
  })),
);

// Sales Rep pages
const SalesRepDashboardPage = lazy(() =>
  import("./pages/sales-rep/SalesRepDashboardPage").then((m) => ({ default: m.SalesRepDashboardPage })),
);
const MyCustomersPage = lazy(() =>
  import("./pages/sales-rep/MyCustomersPage").then((m) => ({ default: m.MyCustomersPage })),
);
const QuotationBuilderPage = lazy(() =>
  import("./pages/sales-rep/QuotationBuilderPage").then((m) => ({ default: m.QuotationBuilderPage })),
);
const CustomerVisitsPage = lazy(() =>
  import("./pages/sales-rep/CustomerVisitsPage").then((m) => ({ default: m.CustomerVisitsPage })),
);
const SalesTargetsPage = lazy(() =>
  import("./pages/sales-rep/SalesTargetsPage").then((m) => ({ default: m.SalesTargetsPage })),
);
const SalesRepReviewPage = lazy(() =>
  import("./pages/accountant/SalesRepReviewPage").then((m) => ({ default: m.SalesRepReviewPage })),
);

// ── Catch-all: unknown URLs → login (or dashboard if already logged in) ──
function CatchAll() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

// ── Redirect SALES_REP away from factory dashboard ────────────
function DashboardGate() {
  const { user } = useAuth();
  if (user?.role === "SALES_REP") return <Navigate to="/sales-rep" replace />;
  return <DashboardPage />;
}

// ── /sales-rep root: dashboard for SALES_REP, redirect admin/accountant to customers ──
function SalesRepIndexGate() {
  const { user } = useAuth();
  if (user?.role === "ADMIN" || user?.role === "ACCOUNTANT") return <Navigate to="/sales-rep/customers" replace />;
  return <SalesRepDashboardPage />;
}

// ── Page loading fallback ─────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
      }}
    >
      <div
        className="spinner"
        style={{ width: 28, height: 28, borderWidth: 3 }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AlertToaster />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Root ── */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* ── Auth pages (self-contained layout) ── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/forgot-password"
                element={
                  <AuthLayout>{() => <ForgotPasswordPage />}</AuthLayout>
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
                path="/request-access"
                element={<AuthLayout>{() => <RequestAccessPage />}</AuthLayout>}
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
                    <DashboardGate />
                  </ProtectedRoute>
                }
              />

              {/* ── Electricity recording (WORKER + ENGINEER only) ── */}
              <Route
                path="/electricity"
                element={
                  <RoleProtectedRoute allowedRoles={["WORKER", "ENGINEER"]}>
                    <ElectricityPage />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Admin only ── */}
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
                path="/admin/settings"
                element={
                  <AdminOnlyRoute>
                    <SettingsAdminPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/snapshots"
                element={
                  <AdminOnlyRoute>
                    <AdminSnapshotsPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/worker-records"
                element={
                  <AdminOnlyRoute>
                    <AdminWorkerRecordsPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/settings/electricity"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ENGINEER", "ACCOUNTANT"]}
                  >
                    <SettingsElectricityPage />
                  </RoleProtectedRoute>
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
                path="/admin/machine-stops"
                element={
                  <AdminOnlyRoute>
                    <AdminMachineStopsPage />
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
                path="/admin/engineer"
                element={
                  <AdminOnlyRoute>
                    <EngineerOverviewPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/registration-requests"
                element={
                  <AdminOnlyRoute>
                    <RegistrationRequestsPage />
                  </AdminOnlyRoute>
                }
              />

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
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "SALES_REP"]}>
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

              {/* ── Accountant ── */}
              <Route
                path="/accountant/parts-pricing"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                    <AccountantPartsPricingPage />
                  </RoleProtectedRoute>
                }
              />
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
              <Route
                path="/accountant/financial-reports"
                element={
                  <RoleProtectedRoute allowedRoles={["ACCOUNTANT"]}>
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
              <Route
                path="/accountant/suppliers"
                element={
                  <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                    <SupplierManagement />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/accountant/performance"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                    <EmployeePerformance />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/accountant/customer-returns"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT"]}>
                    <CustomerReturnsPage />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Shared routes (all roles) ── */}
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
                path="/consumption"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER"]}
                  >
                    <ConsumptionPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER", "SALES_REP"]}
                  >
                    <NotificationsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER", "SALES_REP"]}
                  >
                    <MyAttendancePage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/my-payroll"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER", "SALES_REP"]}
                  >
                    <MyPayrollPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ADMIN", "ACCOUNTANT", "ENGINEER", "WORKER", "SALES_REP"]}
                  >
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
                  <RoleProtectedRoute
                    allowedRoles={["ENGINEER", "ADMIN", "WORKER"]}
                  >
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
              <Route
                path="/engineer/raw-material-alerts"
                element={
                  <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                    <RawMaterialAlerts />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/engineer/maintenance-costs"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["ENGINEER", "ADMIN", "ACCOUNTANT"]}
                  >
                    <MaintenanceCosts />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Worker only ── */}
              <Route
                path="/worker/hub"
                element={
                  <RoleProtectedRoute allowedRoles={["WORKER"]}>
                    <WorkerHubPage />
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

              {/* ── Engineer snapshots ── */}
              <Route
                path="/engineer/snapshots"
                element={
                  <RoleProtectedRoute allowedRoles={["ENGINEER"]}>
                    <WorkerSnapshotsPage mode="snapshots" />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Support machine readings ── */}
              <Route
                path="/engineer/support-machines"
                element={
                  <RoleProtectedRoute allowedRoles={["ENGINEER", "WORKER"]}>
                    <SupportMachineReadingsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/admin/support-machines"
                element={
                  <AdminOnlyRoute>
                    <AdminSupportMachinesPage />
                  </AdminOnlyRoute>
                }
              />

              {/* ── AI Tools ── */}
              <Route
                path="/ai"
                element={
                  <ProtectedRoute>
                    <AIHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai/invoice-extract"
                element={
                  <ProtectedRoute>
                    <InvoiceExtractionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai/assistant"
                element={
                  <ProtectedRoute>
                    <RAGAssistantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai/anomaly-detection"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ENGINEER"]}>
                    <AnomalyDetectionPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/ai/maintenance-report"
                element={
                  <RoleProtectedRoute allowedRoles={["ENGINEER", "ADMIN"]}>
                    <MaintenanceReportPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/ai/shift-handover"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                    <ShiftHandoverPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/ai/worker-coaching"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                    <WorkerCoachingPage />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Sales Rep ── */}
              <Route
                path="/sales-rep"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "ACCOUNTANT", "SALES_REP"]}>
                    <SalesRepIndexGate />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/sales-rep/customers"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "SALES_REP", "ACCOUNTANT"]}>
                    <MyCustomersPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/sales-rep/quotations"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "SALES_REP", "ACCOUNTANT"]}>
                    <QuotationBuilderPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/sales-rep/visits"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "SALES_REP", "ACCOUNTANT"]}>
                    <CustomerVisitsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/sales-rep/targets"
                element={
                  <RoleProtectedRoute allowedRoles={["ADMIN", "SALES_REP", "ACCOUNTANT"]}>
                    <SalesTargetsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/sales-rep/review"
                element={
                  <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
                    <SalesRepReviewPage />
                  </RoleProtectedRoute>
                }
              />

              {/* ── Redirects ── */}
              <Route
                path="/suppliers"
                element={<Navigate to="/accountant/suppliers" replace />}
              />
              <Route
                path="/customers"
                element={<Navigate to="/sales" replace />}
              />
              <Route
                path="/worker/readings"
                element={<Navigate to="/worker/snapshots" replace />}
              />
              <Route
                path="/worker/production"
                element={<Navigate to="/worker/tools" replace />}
              />

              {/* ── Fallback ── */}
              <Route path="*" element={<CatchAll />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
