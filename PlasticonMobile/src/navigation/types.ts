import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp }    from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp }    from '@react-navigation/native';

// ─── Auth stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
};

// ─── Worker tabs (root) ───────────────────────────────────────────────────────
export type WorkerTabParamList = {
  Home:          undefined;
  Work:          undefined;
  AI:            undefined;
  Notifications: undefined;
  Profile:       undefined;
};

// Worker — stack inside Home tab
export type WorkerHomeStackParamList = {
  WorkerHub: undefined;
  Snapshots: undefined;
};

// Worker — stack inside Work tab
export type WorkerWorkStackParamList = {
  WorkMenu:   undefined;
  Production: undefined;
  Attendance: undefined;
  Payroll:    undefined;
  Reports:    undefined;
};

// Worker — stack inside AI tab
export type WorkerAIStackParamList = {
  AIHub:          undefined;
  Assistant:      undefined;
  ShiftHandover:  undefined;
  WorkerCoaching: undefined;
};

// ─── Engineer tabs ────────────────────────────────────────────────────────────
export type EngineerTabParamList = {
  Dashboard:     undefined;
  Maintenance:   undefined;
  Machines:      undefined;
  Quality:       undefined;
  Profile:       undefined;
};

export type EngineerDashStackParamList = {
  EngineerDash:      undefined;
  ProductionAnalytics: undefined;
};

export type EngineerMaintStackParamList = {
  MaintMenu:        undefined;
  MaintenancePage:  undefined;
  MaintSchedule:    undefined;
  WorkOrders:       undefined;
  MaintCosts:       undefined;
};

export type EngineerMachStackParamList = {
  MachMenu:      undefined;
  MachineHealth: undefined;
  SpareParts:    undefined;
  EngInventory:  undefined;
  Calibration:   undefined;
  Lifecycle:     undefined;
  TransferLog:   undefined;
};

export type EngineerQualStackParamList = {
  QualMenu:     undefined;
  QualityChecks: undefined;
  QualityTrends: undefined;
  RawAlerts:    undefined;
  TechDocs:     undefined;
};

// ─── Accountant tabs ──────────────────────────────────────────────────────────
export type AccountantTabParamList = {
  Finance:   undefined;
  Invoices:  undefined;
  Expenses:  undefined;
  More:      undefined;
  Profile:   undefined;
};

export type AccountantFinanceStackParamList = {
  FinanceDash:    undefined;
  FinancialReports: undefined;
  CostAnalysis:   undefined;
  BudgetPlanning: undefined;
};

export type AccountantInvoicesStackParamList = {
  InvoiceMenu:        undefined;
  Invoices:           undefined;
  CustomerReceivables: undefined;
  SupplierPayables:   undefined;
};

export type AccountantExpensesStackParamList = {
  ExpenseMenu:       undefined;
  Expenses:          undefined;
  BankReconciliation: undefined;
  TaxCompliance:     undefined;
};

export type AccountantMoreStackParamList = {
  AcctMore:           undefined;
  Suppliers:          undefined;
  PartsPricing:       undefined;
  ApprovalWorkflows:  undefined;
  EmployeePerformance: undefined;
};

// ─── Admin tabs ───────────────────────────────────────────────────────────────
export type AdminTabParamList = {
  Dashboard:  undefined;
  People:     undefined;
  Operations: undefined;
  Audit:      undefined;
  Profile:    undefined;
};

export type AdminDashStackParamList = {
  AdminDash:    undefined;
  Analytics:    undefined;
};

export type AdminPeopleStackParamList = {
  PeopleMenu:       undefined;
  Users:            undefined;
  AttendanceAdmin:  undefined;
  PayrollAdmin:     undefined;
  WorkerRecords:    undefined;
  EngineerOverview: undefined;
  Registrations:    undefined;
};

export type AdminOpsStackParamList = {
  OpsMenu:     undefined;
  Machines:    undefined;
  Shifts:      undefined;
  Electricity: undefined;
  Settings:    undefined;
};

export type AdminAuditStackParamList = {
  AuditMenu:   undefined;
  AuditLogs:   undefined;
  AdminSnaps:  undefined;
};

// Engineer — stack inside Profile tab (More menu)
export type EngineerProfileStackParamList = {
  EngineerMore:  undefined;
  Profile:       undefined;
  AIHub:         undefined;
  Assistant:     undefined;
  Notifications: undefined;
};

// ─── Navigation prop helpers ──────────────────────────────────────────────────
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

export type WorkerNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<WorkerTabParamList>,
  NativeStackNavigationProp<AuthStackParamList>
>;
