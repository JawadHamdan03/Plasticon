// ─── Core domain types ────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'ENGINEER' | 'ACCOUNTANT' | 'WORKER';

export interface User {
  id: number;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  profileImage?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  token:        string;
  email:        string;
  role:         UserRole;
  name?:        string;
  fullName?:    string;
  userId?:      number;
  username?:    string;
  profileImage?: string;
}

export interface Machine {
  id: number;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BROKEN' | 'OFFLINE';
  location?: string | null;
}

export interface Shift {
  id: number;
  name: string;
  startTime?: string;
  endTime?: string;
}

export interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  shift?: { id: number; name: string } | null;
}

export interface ProductionRecord {
  id: number;
  date: string;
  machineId: number;
  machine?: { id: number; name: string };
  totalPieces: number;
  cartonsCount?: number | null;
  notes?: string | null;
  shift?: { id: number; name: string } | null;
  user?: { id: number; fullName: string };
  createdAt: string;
}

export interface MaintenanceRecord {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  type: 'BREAKDOWN' | 'SCHEDULED' | 'PREVENTIVE';
  description: string;
  startDate: string;
  endDate?: string | null;
  cost?: number | null;
  technician?: string | null;
  status: string;
  downtimeMinutes?: number;
  createdAt: string;
}

export interface QualityCheck {
  id: number;
  machineId: number;
  machine?: { id: number; name: string };
  batchCode: string;
  checkType: string;
  result: 'PASS' | 'FAIL' | 'PARTIAL';
  notes?: string | null;
  date: string;
  createdBy?: { fullName: string };
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE';
  customer?: { name: string; email: string; phone: string };
  createdAt: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  description?: string;
  paymentStatus: 'PENDING' | 'APPROVED';
  submittedAt: string;
  approvedAt?: string | null;
  submittedBy?: { fullName: string };
  approvedBy?: { fullName: string } | null;
}

export interface DailyPayrollRecord {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  leaveType: string | null;
  attendance?: { checkIn: string; checkOut: string | null } | null;
}

export interface MonthlyPayroll {
  id: number;
  month: string;
  totalSalary: number;
  baseSalary?: number;
  overtimeSalary?: number;
  totalHours?: number;
}

export interface MachineHealth {
  id: number;
  machineId: number;
  machine?: { id: number; name: string };
  metric: string;
  value: number;
  notes?: string | null;
  createdAt: string;
}

export interface SparePart {
  id: number;
  name: string;
  partNumber?: string | null;
  quantity: number;
  unit: string;
  minQuantity: number;
  cost?: number | null;
}

export interface RawMaterial {
  id: number;
  name: string;
  type: string;
  currentStock: number;
  unit: string;
  minStock?: number | null;
}

export interface FinancialDashboard {
  revenue: number;
  paidRevenue: number;
  expenses: number;
  approvedExpenses: number;
  profit: number;
  profitMargin: number;
  cashBalance: number;
  salesRevenue: number;
  rawMaterialCost: number;
  electricityCost: number;
  salaryCost: number;
  netProfit: number;
  netProfitMargin: number;
  targets: {
    revenueTarget: number;
    expenseLimit: number;
    profitMarginTarget: number;
  };
}
