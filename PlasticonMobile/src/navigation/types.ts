import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp }    from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp }    from '@react-navigation/native';

// ─── Auth stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login:          undefined;
  Register:       undefined;
  ForgotPassword: undefined;
  ResetPassword:  { token?: string };
  VerifyEmail:    { email?: string };
  RequestAccess:  undefined;
};

// ─── Worker tabs ─────────────────────────────────────────────────────────────
export type WorkerTabParamList = {
  Overview: undefined;
  Work:     undefined;
  AI:       undefined;
  Personal: undefined;
};

// Worker — Overview tab (dashboard)
export type WorkerOverviewStackParamList = {
  WorkerHub: undefined;
};

// Worker — Work tab (12 features)
export type WorkerWorkStackParamList = {
  WorkMenu:          undefined;
  Production:        undefined;
  Consumption:       undefined;
  Readings:          undefined;
  MachineStops:      undefined;
  DailyChecklist:    undefined;
  MaterialWaste:     undefined;
  DailyTargets:      undefined;
  KaizenIdeas:       undefined;
  QualityIssues:     undefined;
  MicroStops:        undefined;
  ElectricityAlerts: undefined;
  ElectricityRecord: undefined;
  Snapshots:         undefined;
};

// Worker — AI tab
export type WorkerAIStackParamList = {
  AIHub:     undefined;
  Assistant: undefined;
};

// Worker — Personal tab
export type WorkerPersonalStackParamList = {
  PersonalMenu:  undefined;
  Attendance:    undefined;
  Payroll:       undefined;
  Notifications: undefined;
  Chat:          undefined;
  Profile:       undefined;
};

// ─── Engineer tabs ────────────────────────────────────────────────────────────
export type EngineerTabParamList = {
  Overview:    undefined;
  Engineering: undefined;
  AITools:     undefined;
  Personal:    undefined;
};

export type EngineerOverviewStackParamList = {
  EngineerDash: undefined;
};

export type EngineerEngStackParamList = {
  EngMenu:             undefined;
  Production:          undefined;
  Consumption:         undefined;
  Warehouse:           undefined;
  QualityChecks:       undefined;
  MaintenancePage:     undefined;
  MaintSchedule:       undefined;
  EngInventory:        undefined;
  MachineHealth:       undefined;
  WorkOrders:          undefined;
  SpareParts:          undefined;
  Lifecycle:           undefined;
  ProductionAnalytics: undefined;
  QualityTrends:       undefined;
  TechDocs:            undefined;
  Calibration:         undefined;
  TransferLog:         undefined;
  RawAlerts:           undefined;
  MaintCosts:          undefined;
  Electricity:         undefined;
};

export type EngineerAIStackParamList = {
  AIHub:             undefined;
  Assistant:         undefined;
  AnomalyDetection:  undefined;
  MaintenanceReport: undefined;
  ShiftHandover:     undefined;
};

export type EngineerPersonalStackParamList = {
  PersonalMenu:  undefined;
  Attendance:    undefined;
  Payroll:       undefined;
  Notifications: undefined;
  Chat:          undefined;
  Profile:       undefined;
};

// ─── Accountant tabs ──────────────────────────────────────────────────────────
export type AccountantTabParamList = {
  Overview: undefined;
  Finance:  undefined;
  HR:       undefined;
  AITools:  undefined;
  Personal: undefined;
};

export type AccountantOverviewStackParamList = {
  AcctDash:            undefined;
  Reports:             undefined;
  FinanceDash:         undefined;
  Invoices:            undefined;
  Expenses:            undefined;
  CustomerReceivables: undefined;
  SupplierPayables:    undefined;
  ApprovalWorkflows:   undefined;
  AIHub:               undefined;
  FinancialReports:    undefined;
  CostAnalysis:        undefined;
  BudgetPlanning:      undefined;
};

export type AccountantFinanceStackParamList = {
  AcctFinMenu:         undefined;
  FinanceDash:         undefined;
  Invoices:            undefined;
  Expenses:            undefined;
  FinancialReports:    undefined;
  SupplierPayables:    undefined;
  CustomerReceivables: undefined;
  BudgetPlanning:      undefined;
  TaxCompliance:       undefined;
  BankReconciliation:  undefined;
  CostAnalysis:        undefined;
  ApprovalWorkflows:   undefined;
  Warehouse:           undefined;
  Inventory:           undefined;
  Purchases:           undefined;
  Sales:               undefined;
  PartsPricing:        undefined;
  Suppliers:           undefined;
  EmployeePerformance: undefined;
  MaintCosts:          undefined;
  Electricity:         undefined;
};

export type AccountantHRStackParamList = {
  HRMenu:     undefined;
  Attendance: undefined;
  Payroll:    undefined;
};

export type AccountantAIStackParamList = {
  AIHub:             undefined;
  Assistant:         undefined;
  InvoiceExtraction: undefined;
};

export type AccountantPersonalStackParamList = {
  PersonalMenu:  undefined;
  Attendance:    undefined;
  Payroll:       undefined;
  Notifications: undefined;
  Chat:          undefined;
  Profile:       undefined;
};

// ─── Admin tabs (full feature parity) ────────────────────────────────────────
export type AdminTabParamList = {
  Dashboard:   undefined;
  Operations:  undefined;
  Finance:     undefined;
  Engineering: undefined;
  More:        undefined;
};

export type AdminDashStackParamList = {
  AdminDash:     undefined;
  Analytics:     undefined;
  Users:         undefined;
  Machines:      undefined;
  AuditLogs:     undefined;
  Registrations: undefined;
};

export type AdminOpsStackParamList = {
  AdminOpsMenu:    undefined;
  Production:      undefined;
  Consumption:     undefined;
  AttendanceAdmin: undefined;
  PayrollAdmin:    undefined;
  WorkerRecords:   undefined;
  Snapshots:       undefined;
  Electricity:     undefined;
  Machines:        undefined;
  Shifts:          undefined;
  MachineStops:    undefined;
};

export type AdminFinStackParamList = {
  AdminFinMenu:        undefined;
  FinanceDash:         undefined;
  FinancialReports:    undefined;
  CostAnalysis:        undefined;
  BudgetPlanning:      undefined;
  Invoices:            undefined;
  CustomerReceivables: undefined;
  SupplierPayables:    undefined;
  Expenses:            undefined;
  BankReconciliation:  undefined;
  TaxCompliance:       undefined;
  Suppliers:           undefined;
  PartsPricing:        undefined;
  ApprovalWorkflows:   undefined;
  EmployeePerformance: undefined;
  Warehouse:           undefined;
  Inventory:           undefined;
  Purchases:           undefined;
  Sales:               undefined;
  Reports:             undefined;
};

export type AdminEngStackParamList = {
  AdminEngMenu:        undefined;
  Maintenance:         undefined;
  MaintSchedule:       undefined;
  WorkOrders:          undefined;
  MaintCosts:          undefined;
  MachineHealth:       undefined;
  SpareParts:          undefined;
  EngInventory:        undefined;
  Calibration:         undefined;
  Lifecycle:           undefined;
  TransferLog:         undefined;
  QualityChecks:       undefined;
  QualityTrends:       undefined;
  RawAlerts:           undefined;
  TechDocs:            undefined;
  ProductionAnalytics: undefined;
};

export type AdminMoreStackParamList = {
  AdminMoreMenu:     undefined;
  Users:             undefined;
  Registrations:     undefined;
  EngineerOverview:  undefined;
  AuditLogs:         undefined;
  AdminSnaps:        undefined;
  Settings:          undefined;
  Notifications:     undefined;
  Chat:              undefined;
  AIHub:             undefined;
  Assistant:         undefined;
  InvoiceExtraction: undefined;
  AnomalyDetection:  undefined;
  MaintenanceReport: undefined;
  ShiftHandover:     undefined;
  WorkerCoaching:    undefined;
  Profile:           undefined;
  Customers:         undefined;
};

// ─── Navigation prop helpers ──────────────────────────────────────────────────
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

export type WorkerNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<WorkerTabParamList>,
  NativeStackNavigationProp<AuthStackParamList>
>;
