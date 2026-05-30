import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Download,
  FileSpreadsheet,
  Truck,
  Users,
  Factory,
  Package,
  UserCheck,
  DollarSign,
  Zap,
  Receipt,
  RefreshCw,
  Wrench,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { toast } from "../../lib/toast";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { TableBase, TableShell } from "../../components/ui/table-shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportBlock = Record<string, unknown>;

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

type PeriodFilters = {
  period: ReportPeriod;
  date: string;
  month: string;
  year: string;
};

type ProductionActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    totalCartons: number;
    totalPieces: number;
    totalDowntimeMinutes: number;
  };
  records: Array<{
    id: number;
    createdAt: string;
    machineName: string;
    machineType: string;
    shiftName: string;
    userName: string;
    username: string;
    cartonsCount: number;
    piecesPerCarton: number;
    totalPieces: number;
    downtimeMinutes: number;
    hourSlot: string;
    notes: string | null;
  }>;
};

type InventoryActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    inCount: number;
    outCount: number;
    totalInQuantity: number;
    totalOutQuantity: number;
  };
  records: Array<{
    id: number;
    createdAt: string;
    materialName: string;
    materialUnit: string;
    type: string;
    quantity: number;
    referenceType: string;
    referenceId: number | null;
    createdByName: string | null;
    createdByUsername: string | null;
  }>;
};

type AttendanceActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    checkedOutCount: number;
    openCount: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
    absentCount: number;
  };
  absentUsers: Array<{
    id: number;
    fullName: string;
    username: string;
    role: string;
  }>;
  records: Array<{
    id: number;
    checkIn: string;
    checkOut: string | null;
    lateMinutes: number;
    overtimeMinutes: number;
    userId: number;
    userName: string;
    username: string;
    role: string;
    shiftName: string | null;
  }>;
};

type PayrollActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    totalBaseSalary: number;
    totalOvertimeSalary: number;
    totalPayout: number;
  };
  records: Array<{
    id: number;
    month: string;
    calculatedAt: string;
    userId: number;
    userName: string;
    username: string;
    role: string;
    totalHours: number;
    overtimeHours: number;
    baseSalary: number;
    overtimeSalary: number;
    totalSalary: number;
  }>;
};

type PurchaseRecord = {
  id: number;
  supplierId: number;
  totalAmount: number;
  date: string;
  supplier?: {
    id: number;
    name: string;
  };
};

type SaleRecord = {
  id: number;
  customerId: number;
  totalAmount: number;
  date: string;
  customer?: {
    id: number;
    name: string;
  };
};

type ElectricityShiftRecord = {
  id: number;
  shift: { id: number; name: string };
  startReading: number;
  endReading: number;
  consumption: number;
  kwhPriceSnap: number;
  shiftCost: number;
  isMeterReset: boolean;
  notes: string | null;
};
type ElectricityDayRow = {
  date: string;
  shifts: ElectricityShiftRecord[];
  totalConsumption: number;
  totalCost: number;
};
type ElectricityReport = {
  range: { fromDate: string; toDate: string };
  currentKwhPrice: number;
  days: ElectricityDayRow[];
  summary: {
    totalConsumption: number;
    totalCost: number;
    totalReadings: number;
    currentKwhPrice: number;
  };
};

type ExpenseRecord = {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  paymentStatus: string;
  submittedAt: string;
  submittedBy?: { fullName: string };
};

type MaintenanceCostRecord = {
  id: number;
  laborHours: number;
  laborCostPerHour: number;
  sparesTotal: number;
  laborTotal: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
  maintenance: {
    id: number;
    machine: { id: number; name: string; type: string };
    engineer: { id: number; fullName: string };
  };
  createdBy: { id: number; fullName: string } | null;
};

type QualityCheckRecord = {
  id: number;
  issueType: string;
  severity: string;
  description: string | null;
  resolvedAt: string | null;
  createdAt: string;
  machine: { id: number; name: string; type: string };
  engineer: { id: number; fullName: string; username: string };
};

type SparePartRequestRecord = {
  id: number;
  partName: string;
  quantity: number;
  unitPrice: number | null;
  status: string;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  engineer: { id: number; fullName: string; username: string };
  machine: { id: number; name: string; type: string } | null;
  pricedBy: { id: number; fullName: string } | null;
};

type TabKey =
  | "suppliers"
  | "customers"
  | "production"
  | "inventory"
  | "attendance"
  | "payroll"
  | "electricity"
  | "expenses"
  | "maintenance"
  | "quality"
  | "spareParts";

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  {
    key: "suppliers" as const,
    labelEn: "Suppliers",
    labelAr: "الموردون",
    icon: Truck,
    color: "#3b82f6",
  },
  {
    key: "customers" as const,
    labelEn: "Customers",
    labelAr: "الزباين",
    icon: Users,
    color: "#10b981",
  },
  {
    key: "production" as const,
    labelEn: "Production",
    labelAr: "الإنتاج",
    icon: Factory,
    color: "#8b5cf6",
  },
  {
    key: "inventory" as const,
    labelEn: "Raw Materials",
    labelAr: "المواد الخام",
    icon: Package,
    color: "#f97316",
  },
  {
    key: "attendance" as const,
    labelEn: "Attendance",
    labelAr: "الحضور",
    icon: UserCheck,
    color: "#06b6d4",
  },
  {
    key: "payroll" as const,
    labelEn: "Payroll",
    labelAr: "الرواتب",
    icon: DollarSign,
    color: "#ec4899",
  },
  {
    key: "electricity" as const,
    labelEn: "Electricity",
    labelAr: "الكهرباء",
    icon: Zap,
    color: "#d97706",
  },
  {
    key: "expenses" as const,
    labelEn: "Expenses",
    labelAr: "المصروفات",
    icon: Receipt,
    color: "#ef4444",
  },
  {
    key: "maintenance" as const,
    labelEn: "Maintenance",
    labelAr: "الصيانة",
    icon: Wrench,
    color: "#0891b2",
  },
  {
    key: "quality" as const,
    labelEn: "Quality",
    labelAr: "الجودة",
    icon: ShieldCheck,
    color: "#16a34a",
  },
  {
    key: "spareParts" as const,
    labelEn: "Spare Parts",
    labelAr: "قطع الغيار",
    icon: Boxes,
    color: "#7c3aed",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authToken(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authToken(),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

// KPI gradient card helper
function KpiCard({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "var(--radius-lg)",
        background: gradient,
        color: "#fff",
      }}
    >
      <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600, opacity: 0.85 }}>
        {label}
      </p>
      <p style={{ margin: ".25rem 0 0", fontSize: "1.5rem", fontWeight: 800 }}>
        {value}
      </p>
    </div>
  );
}

// PeriodFilterBar component
function PeriodFilterBar({
  filters,
  setFilters,
  onLoad,
  isAr,
  copy,
  loading,
  extra,
}: {
  filters: PeriodFilters;
  setFilters: React.Dispatch<React.SetStateAction<PeriodFilters>>;
  onLoad: () => void;
  isAr: boolean;
  copy: (typeof appCopy)["en"];
  loading: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: ".75rem",
        alignItems: "flex-end",
        padding: "1rem 1.25rem",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ".2rem",
          fontSize: ".8rem",
          fontWeight: 600,
        }}
      >
        {copy.reports.period}
        <select
          style={{
            padding: ".35rem .6rem",
            borderRadius: 6,
            border: "1px solid var(--border-default)",
            fontSize: ".85rem",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
          value={filters.period}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              period: e.target.value as ReportPeriod,
            }))
          }
        >
          <option value="daily">{copy.reports.day}</option>
          <option value="weekly">{copy.reports.week}</option>
          <option value="monthly">{copy.reports.month}</option>
          <option value="yearly">{copy.reports.year}</option>
        </select>
      </label>

      {(filters.period === "daily" || filters.period === "weekly") && (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ".2rem",
            fontSize: ".8rem",
            fontWeight: 600,
          }}
        >
          {copy.reports.day}
          <input
            type="date"
            style={{
              padding: ".35rem .6rem",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              fontSize: ".85rem",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
            }}
            value={filters.date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date: e.target.value }))
            }
          />
        </label>
      )}

      {filters.period === "monthly" && (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ".2rem",
            fontSize: ".8rem",
            fontWeight: 600,
          }}
        >
          {copy.reports.month}
          <input
            type="month"
            style={{
              padding: ".35rem .6rem",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              fontSize: ".85rem",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
            }}
            value={filters.month}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, month: e.target.value }))
            }
          />
        </label>
      )}

      {filters.period === "yearly" && (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ".2rem",
            fontSize: ".8rem",
            fontWeight: 600,
          }}
        >
          {copy.reports.year}
          <input
            type="number"
            min={2000}
            max={9999}
            style={{
              padding: ".35rem .6rem",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              fontSize: ".85rem",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              width: 100,
            }}
            value={filters.year}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, year: e.target.value }))
            }
          />
        </label>
      )}

      <button
        type="button"
        className="auth-button"
        disabled={loading}
        onClick={onLoad}
        style={{ alignSelf: "flex-end" }}
      >
        {loading ? (isAr ? "جارٍ..." : "Loading…") : copy.load}
      </button>

      {extra}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const isAr = locale === "ar";

  const t = {
    date: isAr ? "التاريخ" : "Date",
    machine: isAr ? "الماكينة" : "Machine",
    shift: isAr ? "الشفت" : "Shift",
    user: isAr ? "المستخدم" : "User",
    records: isAr ? "السجلات" : "Records",
    cartons: isAr ? "الكرتونات" : "Cartons",
    pieces: isAr ? "القطع" : "Pieces",
    total: isAr ? "الإجمالي" : "Total",
    material: isAr ? "المادة" : "Material",
    type: isAr ? "النوع" : "Type",
    qty: isAr ? "الكمية" : "Qty",
    reference: isAr ? "المرجع" : "Reference",
    checkIn: isAr ? "الدخول" : "Check In",
    checkOut: isAr ? "الخروج" : "Check Out",
    late: isAr ? "التأخير" : "Late",
    overtime: isAr ? "الإضافي" : "OT",
    month: isAr ? "الشهر" : "Month",
    hours: isAr ? "الساعات" : "Hours",
    overtimeHours: isAr ? "ساعات الإضافي" : "OT Hours",
    period: copy.reports.period,
    generatedAt: copy.reports.generatedAt,
  };

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<TabKey>("suppliers");

  // ── Commerce ──
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [supplierFromDate, setSupplierFromDate] = useState("");
  const [supplierToDate, setSupplierToDate] = useState("");
  const [customerFromDate, setCustomerFromDate] = useState("");
  const [customerToDate, setCustomerToDate] = useState("");
  const [loadingCommerce, setLoadingCommerce] = useState(false);

  // ── Activity reports ──
  const [productionActivity, setProductionActivity] =
    useState<ProductionActivityReport | null>(null);
  const [inventoryActivity, setInventoryActivity] =
    useState<InventoryActivityReport | null>(null);
  const [attendanceActivity, setAttendanceActivity] =
    useState<AttendanceActivityReport | null>(null);
  const [payrollActivity, setPayrollActivity] =
    useState<PayrollActivityReport | null>(null);

  // ── Period filters ──
  const [productionFilters, setProductionFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [inventoryFilters, setInventoryFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [attendanceFilters, setAttendanceFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [payrollFilters, setPayrollFilters] = useState<PeriodFilters>({
    period: "monthly",
    date: "",
    month: "",
    year: "",
  });

  // ── Electricity ──
  const [electricityReport, setElectricityReport] =
    useState<ElectricityReport | null>(null);
  const [electricityFromDate, setElectricityFromDate] = useState("");
  const [electricityToDate, setElectricityToDate] = useState("");
  const [electricityMonth, setElectricityMonth] = useState("");
  const [electricityYear, setElectricityYear] = useState("");
  const [loadingElectricity, setLoadingElectricity] = useState(false);

  // ── Inventory snapshot ──
  const [inventorySnapshot, setInventorySnapshot] =
    useState<ReportBlock | null>(null);
  const [inventoryThreshold, setInventoryThreshold] = useState("");

  // ── Payroll scope ──
  const [payrollScopeMode, setPayrollScopeMode] = useState<"ALL" | "PERSON">(
    "ALL"
  );
  const [payrollScopeUser, setPayrollScopeUser] = useState("");

  // ── Expenses ──
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseFromDate, setExpenseFromDate] = useState("");
  const [expenseToDate, setExpenseToDate] = useState("");

  // ── New report tabs state ──
  const [maintenanceCosts, setMaintenanceCosts] = useState<MaintenanceCostRecord[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheckRecord[]>([]);
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequestRecord[]>([]);
  const [maintenanceFromDate, setMaintenanceFromDate] = useState("");
  const [maintenanceToDate, setMaintenanceToDate] = useState("");
  const [qualitySeverityFilter, setQualitySeverityFilter] = useState("ALL");
  const [sparePartsStatusFilter, setSparePartsStatusFilter] = useState("ALL");
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // ── Loading / error ──
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  // ─── Data loaders ────────────────────────────────────────────────────────────

  const loadCommerceReports = useCallback(async () => {
    setLoadingCommerce(true);
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        fetchWithAuth("/purchases/all"),
        fetchWithAuth("/sales/all"),
      ]);
      if (!purchasesRes.ok) throw new Error(await readApiError(purchasesRes));
      if (!salesRes.ok) throw new Error(await readApiError(salesRes));
      setPurchases((await purchasesRes.json()) as PurchaseRecord[]);
      setSales((await salesRes.json()) as SaleRecord[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load commerce reports"
      );
    } finally {
      setLoadingCommerce(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const res = await fetchWithAuth("/expenses");
      if (res.ok) setExpenses((await res.json()) as ExpenseRecord[]);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  const loadMaintenanceCosts = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/maintenance-costs");
      if (res.ok) setMaintenanceCosts((await res.json()) as MaintenanceCostRecord[]);
    } catch { /* silent */ }
  }, []);

  const loadQualityChecks = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/quality-checks/all");
      if (res.ok) setQualityChecks((await res.json()) as QualityCheckRecord[]);
    } catch { /* silent */ }
  }, []);

  const loadSparePartRequests = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/spare-part-requests");
      if (res.ok) setSparePartRequests((await res.json()) as SparePartRequestRecord[]);
    } catch { /* silent */ }
  }, []);

  const loadElectricityReport = useCallback(async () => {
    setLoadingElectricity(true);
    try {
      const params = new URLSearchParams();
      if (electricityFromDate) params.set("fromDate", electricityFromDate);
      if (electricityToDate) params.set("toDate", electricityToDate);
      if (electricityMonth) params.set("month", electricityMonth);
      if (electricityYear) params.set("year", electricityYear);
      const res = await fetchWithAuth(
        `/electricity/report?${params.toString()}`
      );
      if (!res.ok) throw new Error(await readApiError(res));
      setElectricityReport((await res.json()) as ElectricityReport);
    } catch {
      setElectricityReport(null);
    } finally {
      setLoadingElectricity(false);
    }
  }, [electricityFromDate, electricityToDate, electricityMonth, electricityYear]);

  const buildPeriodParams = (filters: PeriodFilters) => {
    const params = new URLSearchParams({ period: filters.period });
    if (filters.period === "daily" || filters.period === "weekly") {
      if (filters.date) params.set("date", filters.date);
    }
    if (filters.period === "monthly" && filters.month) {
      params.set("month", filters.month);
    }
    if (filters.period === "yearly" && filters.year) {
      params.set("year", filters.year);
    }
    return params.toString();
  };

  const loadActivityReport = async <TReport,>(
    path: string,
    setState: (value: TReport | null) => void,
    loadingKey: string,
    filtersValue: PeriodFilters,
    fallbackMessage: string
  ) => {
    setErrorMessage("");
    setLoadingSection(loadingKey);
    try {
      const suffix = buildPeriodParams(filtersValue);
      const response = await fetchWithAuth(suffix ? `${path}?${suffix}` : path);
      if (!response.ok) throw new Error(await readApiError(response));
      setState((await response.json()) as TReport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setLoadingSection("");
    }
  };

  const loadInventorySnapshot = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("inventory");
    try {
      const suffix = inventoryThreshold
        ? `?threshold=${encodeURIComponent(inventoryThreshold)}`
        : "";
      const response = await fetchWithAuth(
        `/reports/inventory/snapshot${suffix}`
      );
      if (!response.ok) throw new Error(await readApiError(response));
      setInventorySnapshot((await response.json()) as ReportBlock);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load inventory snapshot"
      );
    } finally {
      setLoadingSection("");
    }
  };

  useEffect(() => {
    void loadCommerceReports();
    void loadExpenses();
    void loadMaintenanceCosts();
    void loadQualityChecks();
    void loadSparePartRequests();
  }, [loadCommerceReports, loadExpenses, loadMaintenanceCosts, loadQualityChecks, loadSparePartRequests]);

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const filteredPurchases = useMemo(() => {
    const fromTime = supplierFromDate
      ? new Date(`${supplierFromDate}T00:00:00`).getTime()
      : null;
    const toTime = supplierToDate
      ? new Date(`${supplierToDate}T23:59:59.999`).getTime()
      : null;
    return purchases.filter((p) => {
      const t2 = new Date(p.date).getTime();
      if (Number.isNaN(t2)) return false;
      if (fromTime !== null && t2 < fromTime) return false;
      if (toTime !== null && t2 > toTime) return false;
      return true;
    });
  }, [purchases, supplierFromDate, supplierToDate]);

  const filteredSales = useMemo(() => {
    const fromTime = customerFromDate
      ? new Date(`${customerFromDate}T00:00:00`).getTime()
      : null;
    const toTime = customerToDate
      ? new Date(`${customerToDate}T23:59:59.999`).getTime()
      : null;
    return sales.filter((s) => {
      const t2 = new Date(s.date).getTime();
      if (Number.isNaN(t2)) return false;
      if (fromTime !== null && t2 < fromTime) return false;
      if (toTime !== null && t2 > toTime) return false;
      return true;
    });
  }, [customerFromDate, customerToDate, sales]);

  const supplierReportRows = useMemo(() => {
    const map = new Map<
      number,
      {
        supplierId: number;
        supplierName: string;
        purchasesCount: number;
        totalAmount: number;
        lastPurchaseDate: string | null;
      }
    >();
    for (const purchase of filteredPurchases) {
      const supplierId = purchase.supplier?.id ?? purchase.supplierId;
      const current = map.get(supplierId) ?? {
        supplierId,
        supplierName: purchase.supplier?.name ?? `#${supplierId}`,
        purchasesCount: 0,
        totalAmount: 0,
        lastPurchaseDate: null,
      };
      current.purchasesCount += 1;
      current.totalAmount += purchase.totalAmount ?? 0;
      if (
        !current.lastPurchaseDate ||
        new Date(purchase.date).getTime() >
          new Date(current.lastPurchaseDate).getTime()
      ) {
        current.lastPurchaseDate = purchase.date;
      }
      map.set(supplierId, current);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases]);

  const customerReportRows = useMemo(() => {
    const map = new Map<
      number,
      {
        customerId: number;
        customerName: string;
        salesCount: number;
        totalAmount: number;
        lastSaleDate: string | null;
      }
    >();
    for (const sale of filteredSales) {
      const customerId = sale.customer?.id ?? sale.customerId;
      const current = map.get(customerId) ?? {
        customerId,
        customerName: sale.customer?.name ?? `#${customerId}`,
        salesCount: 0,
        totalAmount: 0,
        lastSaleDate: null,
      };
      current.salesCount += 1;
      current.totalAmount += sale.totalAmount ?? 0;
      if (
        !current.lastSaleDate ||
        new Date(sale.date).getTime() > new Date(current.lastSaleDate).getTime()
      ) {
        current.lastSaleDate = sale.date;
      }
      map.set(customerId, current);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredSales]);

  const payrollUsers = useMemo(() => {
    if (!payrollActivity) return [] as Array<{ username: string; name: string }>;
    return Array.from(
      new Map(
        payrollActivity.records.map((row) => [
          row.username,
          { username: row.username, name: row.userName },
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [payrollActivity]);

  useEffect(() => {
    if (!payrollUsers.length) {
      if (payrollScopeUser) setPayrollScopeUser("");
      return;
    }
    if (payrollScopeMode === "PERSON") {
      const exists = payrollUsers.some((u) => u.username === payrollScopeUser);
      if (!exists) setPayrollScopeUser(payrollUsers[0]?.username ?? "");
    }
  }, [payrollScopeMode, payrollScopeUser, payrollUsers]);

  const filteredPayrollRows = useMemo(() => {
    if (!payrollActivity) return [] as PayrollActivityReport["records"];
    if (payrollScopeMode === "ALL") return payrollActivity.records;
    return payrollActivity.records.filter(
      (row) => row.username === payrollScopeUser
    );
  }, [payrollActivity, payrollScopeMode, payrollScopeUser]);

  const payrollScopeLabel = useMemo(() => {
    if (payrollScopeMode === "ALL") return isAr ? "الكل" : "All";
    const selected = payrollUsers.find((u) => u.username === payrollScopeUser);
    return selected?.name ?? payrollScopeUser;
  }, [isAr, payrollScopeMode, payrollScopeUser, payrollUsers]);

  const filteredPayrollTotals = useMemo(() => {
    const peopleCount = new Set(filteredPayrollRows.map((r) => r.username)).size;
    return {
      peopleCount,
      recordsCount: filteredPayrollRows.length,
      totalBaseSalary: filteredPayrollRows.reduce((s, r) => s + r.baseSalary, 0),
      totalOvertimeSalary: filteredPayrollRows.reduce(
        (s, r) => s + r.overtimeSalary,
        0
      ),
      totalPayout: filteredPayrollRows.reduce((s, r) => s + r.totalSalary, 0),
    };
  }, [filteredPayrollRows]);

  // ── Per-user attendance summary ──
  const attendancePerUser = useMemo(() => {
    if (!attendanceActivity) return [] as Array<{ userId: number; name: string; role: string; present: number; fridayOT: number; lateMinutes: number; otMinutes: number }>;
    const map = new Map<number, { userId: number; name: string; role: string; present: number; fridayOT: number; lateMinutes: number; otMinutes: number }>();
    for (const r of attendanceActivity.records) {
      if (!map.has(r.userId)) {
        map.set(r.userId, { userId: r.userId, name: r.userName, role: r.role, present: 0, fridayOT: 0, lateMinutes: 0, otMinutes: 0 });
      }
      const entry = map.get(r.userId)!;
      const isFriday = new Date(r.checkIn).getDay() === 5;
      if (isFriday) { entry.fridayOT++; } else { entry.present++; entry.lateMinutes += r.lateMinutes; }
      entry.otMinutes += r.overtimeMinutes;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceActivity]);

  // ── Per-user payroll summary ──
  const payrollPerUser = useMemo(() => {
    if (!payrollActivity) return [] as Array<{ username: string; name: string; role: string; records: number; totalHours: number; otHours: number; baseSalary: number; otSalary: number; totalSalary: number }>;
    const map = new Map<string, { username: string; name: string; role: string; records: number; totalHours: number; otHours: number; baseSalary: number; otSalary: number; totalSalary: number }>();
    for (const r of filteredPayrollRows) {
      if (!map.has(r.username)) {
        map.set(r.username, { username: r.username, name: r.userName, role: r.role, records: 0, totalHours: 0, otHours: 0, baseSalary: 0, otSalary: 0, totalSalary: 0 });
      }
      const entry = map.get(r.username)!;
      entry.records++;
      entry.totalHours += r.totalHours;
      entry.otHours += r.overtimeHours;
      entry.baseSalary += r.baseSalary;
      entry.otSalary += r.overtimeSalary;
      entry.totalSalary += r.totalSalary;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredPayrollRows, payrollActivity]);

  const filteredExpenses = useMemo(() => {
    const fromTime = expenseFromDate
      ? new Date(`${expenseFromDate}T00:00:00`).getTime()
      : null;
    const toTime = expenseToDate
      ? new Date(`${expenseToDate}T23:59:59.999`).getTime()
      : null;
    return expenses.filter((e) => {
      const t2 = new Date(e.submittedAt).getTime();
      if (Number.isNaN(t2)) return false;
      if (fromTime !== null && t2 < fromTime) return false;
      if (toTime !== null && t2 > toTime) return false;
      return true;
    });
  }, [expenses, expenseFromDate, expenseToDate]);

  const expenseTotals = useMemo(
    () => ({
      total: filteredExpenses.reduce((s, e) => s + e.amount, 0),
      approved: filteredExpenses
        .filter((e) => e.paymentStatus === "APPROVED")
        .reduce((s, e) => s + e.amount, 0),
      pending: filteredExpenses
        .filter((e) => e.paymentStatus === "PENDING")
        .reduce((s, e) => s + e.amount, 0),
      count: filteredExpenses.length,
    }),
    [filteredExpenses]
  );

  // ── Maintenance filtered ──
  const filteredMaintenance = useMemo(() => {
    if (!maintenanceFromDate && !maintenanceToDate) return maintenanceCosts;
    const from = maintenanceFromDate ? new Date(`${maintenanceFromDate}T00:00:00`).getTime() : null;
    const to   = maintenanceToDate   ? new Date(`${maintenanceToDate}T23:59:59.999`).getTime() : null;
    return maintenanceCosts.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      if (from !== null && t < from) return false;
      if (to   !== null && t > to)   return false;
      return true;
    });
  }, [maintenanceCosts, maintenanceFromDate, maintenanceToDate]);

  const maintenanceTotals = useMemo(() => ({
    records: filteredMaintenance.length,
    totalCost: filteredMaintenance.reduce((s, r) => s + r.totalCost, 0),
    totalLaborHours: filteredMaintenance.reduce((s, r) => s + r.laborHours, 0),
    totalSpares: filteredMaintenance.reduce((s, r) => s + r.sparesTotal, 0),
  }), [filteredMaintenance]);

  // ── Quality filtered ──
  const filteredQuality = useMemo(() => {
    if (qualitySeverityFilter === "ALL") return qualityChecks;
    return qualityChecks.filter((r) => r.severity === qualitySeverityFilter);
  }, [qualityChecks, qualitySeverityFilter]);

  const qualityTotals = useMemo(() => ({
    total: filteredQuality.length,
    critical: filteredQuality.filter((r) => r.severity === "CRITICAL").length,
    high:     filteredQuality.filter((r) => r.severity === "HIGH").length,
    resolved: filteredQuality.filter((r) => r.resolvedAt !== null).length,
  }), [filteredQuality]);

  // ── Spare parts filtered ──
  const filteredSpareParts = useMemo(() => {
    if (sparePartsStatusFilter === "ALL") return sparePartRequests;
    return sparePartRequests.filter((r) => r.status === sparePartsStatusFilter);
  }, [sparePartRequests, sparePartsStatusFilter]);

  const sparePartsTotals = useMemo(() => ({
    total: filteredSpareParts.length,
    pending:  filteredSpareParts.filter((r) => r.status === "PENDING").length,
    received: filteredSpareParts.filter((r) => r.status === "RECEIVED").length,
    totalCost: filteredSpareParts.reduce((s, r) => s + (r.unitPrice ?? 0) * r.quantity, 0),
  }), [filteredSpareParts]);

  // ─── Export helpers ───────────────────────────────────────────────────────────

  const exportPdfTable = (
    title: string,
    metaLines: string[],
    headers: string[],
    rows: string[][],
    fileName: string
  ) => {
    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Plasticon", 14, 7);

    doc.setTextColor(23, 37, 84);
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(`${t.generatedAt}: ${new Date().toLocaleString()}`, 14, 30);

    let metaY = 38;
    metaLines.forEach((line) => {
      doc.text(line, 14, metaY);
      metaY += 6;
    });

    autoTable(doc, {
      startY: metaY + 4,
      head: [headers],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      margin: { left: 14, right: 14 },
    });
    doc.save(fileName);
  };

  const exportExcelTable = (
    headers: string[],
    rows: string[][],
    fileName: string
  ) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  };

  // ─── Reusable download button pair ───────────────────────────────────────────

  function DownloadButtons({
    onPdf,
    onExcel,
  }: {
    onPdf: () => void;
    onExcel: () => void;
  }) {
    return (
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button
          type="button"
          className="auth-button auth-button--ghost reports-download-button"
          dir="ltr"
          onClick={onPdf}
        >
          <Download size={14} aria-hidden="true" style={{ marginRight: 4 }} />
          {copy.reports.downloadPdf}
        </button>
        <button
          type="button"
          className="auth-button auth-button--ghost reports-download-button"
          dir="ltr"
          onClick={onExcel}
        >
          <FileSpreadsheet
            size={14}
            aria-hidden="true"
            style={{ marginRight: 4 }}
          />
          {isAr ? "Excel تنزيل" : "Download Excel"}
        </button>
      </div>
    );
  }

  // ─── Section header helper ────────────────────────────────────────────────────

  function SectionHeader({
    icon: Icon,
    color,
    title,
    subtitle,
    actions,
  }: {
    icon: React.ElementType;
    color: string;
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
  }) {
    return (
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: ".5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              {title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: ".78rem",
                color: "var(--text-secondary)",
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
    );
  }

  // ─── KPI grid wrapper ─────────────────────────────────────────────────────────

  function KpiGrid({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: ".75rem",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {children}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <ModulePageShell
      title={copy.reports.title}
      subtitle={copy.reports.subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void loadCommerceReports();
            void loadExpenses();
            void loadInventorySnapshot();
          }}
        >
          <RefreshCw size={14} style={{ marginRight: 4 }} />
          {copy.refreshAll}
        </Button>
      }
    >
      {user?.role === "ADMIN" || user?.role === "ACCOUNTANT" ? null : (
        <div className="auth-alert auth-alert--error">
          {copy.reports.adminNotice}
        </div>
      )}

      {/* ── Tab navigation ── */}
      <div
        style={{
          display: "flex",
          gap: ".5rem",
          overflowX: "auto",
          paddingBottom: ".5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
              padding: ".5rem 1rem",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: ".82rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              background:
                activeTab === tab.key ? tab.color : "var(--bg-subtle)",
              color: activeTab === tab.key ? "#fff" : "var(--text-secondary)",
              transition: "all .15s",
            }}
          >
            <tab.icon size={14} />
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SUPPLIERS TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "suppliers" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Truck}
            color="#3b82f6"
            title={isAr ? "تقارير الموردين" : "Supplier Reports"}
            subtitle={
              isAr ? "ملخص المشتريات حسب المورد" : "Purchase summary by supplier"
            }
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!supplierReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  const rangeText =
                    supplierFromDate || supplierToDate
                      ? `${supplierFromDate || "-"} ${isAr ? "إلى" : "to"} ${supplierToDate || "-"}`
                      : isAr
                      ? "كل الفترات"
                      : "All dates";
                  exportPdfTable(
                    isAr ? "تقرير الموردين" : "Supplier Report",
                    [
                      `${t.period}: ${rangeText}`,
                      `${isAr ? "عدد الموردين" : "Suppliers"}: ${supplierReportRows.length}`,
                      `${isAr ? "عدد عمليات الشراء" : "Purchases"}: ${filteredPurchases.length}`,
                      `${isAr ? "إجمالي الشراء" : "Total spent"}: ₪${supplierReportRows.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`,
                    ],
                    [
                      isAr ? "المورد" : "Supplier",
                      isAr ? "العمليات" : "Purchases",
                      isAr ? "الإجمالي" : "Total",
                      isAr ? "آخر استلام" : "Last Purchase",
                    ],
                    supplierReportRows.map((r) => [
                      r.supplierName,
                      String(r.purchasesCount),
                      `₪${r.totalAmount.toLocaleString()}`,
                      r.lastPurchaseDate ? r.lastPurchaseDate.slice(0, 10) : "-",
                    ]),
                    `supplier-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!supplierReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [
                      isAr ? "المورد" : "Supplier",
                      isAr ? "العمليات" : "Purchases",
                      isAr ? "الإجمالي" : "Total",
                      isAr ? "آخر استلام" : "Last Purchase",
                    ],
                    supplierReportRows.map((r) => [
                      r.supplierName,
                      String(r.purchasesCount),
                      `₪${r.totalAmount.toLocaleString()}`,
                      r.lastPurchaseDate ? r.lastPurchaseDate.slice(0, 10) : "-",
                    ]),
                    `supplier-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".75rem",
              alignItems: "flex-end",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "من تاريخ" : "From date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={supplierFromDate}
                onChange={(e) => setSupplierFromDate(e.target.value)}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={supplierToDate}
                onChange={(e) => setSupplierToDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setSupplierFromDate("");
                setSupplierToDate("");
              }}
            >
              {isAr ? "إعادة تعيين" : "Reset"}
            </button>
          </div>

          {/* KPI cards */}
          <KpiGrid>
            <KpiCard
              label={isAr ? "عدد الموردين" : "Suppliers"}
              value={supplierReportRows.length}
              gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)"
            />
            <KpiCard
              label={isAr ? "عدد عمليات الشراء" : "Purchase Operations"}
              value={filteredPurchases.length}
              gradient="linear-gradient(135deg,#60a5fa,#3b82f6)"
            />
            <KpiCard
              label={isAr ? "إجمالي الشراء" : "Total Spent"}
              value={`₪${supplierReportRows.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`}
              gradient="linear-gradient(135deg,#2563eb,#1e40af)"
            />
          </KpiGrid>

          {loadingCommerce && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </p>
          )}

          <TableShell className="mt-0">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{isAr ? "المورد" : "Supplier"}</th>
                  <th>{isAr ? "العمليات" : "Purchases"}</th>
                  <th>{isAr ? "الإجمالي" : "Total"}</th>
                  <th>{isAr ? "آخر استلام" : "Last Purchase"}</th>
                </tr>
              </thead>
              <tbody>
                {supplierReportRows.map((row) => (
                  <tr key={row.supplierId}>
                    <td>{row.supplierName}</td>
                    <td>{row.purchasesCount}</td>
                    <td>₪{row.totalAmount.toLocaleString()}</td>
                    <td>
                      {row.lastPurchaseDate
                        ? row.lastPurchaseDate.slice(0, 10)
                        : "-"}
                    </td>
                  </tr>
                ))}
                {supplierReportRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1.5rem" }}
                    >
                      {isAr ? "لا توجد بيانات" : "No data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CUSTOMERS TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "customers" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Users}
            color="#10b981"
            title={isAr ? "تقارير الزباين" : "Customer Reports"}
            subtitle={isAr ? "ملخص المبيعات حسب الزبون" : "Sales summary by customer"}
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!customerReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  const rangeText =
                    customerFromDate || customerToDate
                      ? `${customerFromDate || "-"} ${isAr ? "إلى" : "to"} ${customerToDate || "-"}`
                      : isAr
                      ? "كل الفترات"
                      : "All dates";
                  exportPdfTable(
                    isAr ? "تقرير الزباين" : "Customer Report",
                    [
                      `${t.period}: ${rangeText}`,
                      `${isAr ? "عدد الزباين" : "Customers"}: ${customerReportRows.length}`,
                      `${isAr ? "عدد عمليات البيع" : "Sales"}: ${filteredSales.length}`,
                      `${isAr ? "إجمالي المبيعات" : "Total sales"}: ₪${customerReportRows.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`,
                    ],
                    [
                      isAr ? "الزبون" : "Customer",
                      isAr ? "العمليات" : "Sales",
                      isAr ? "الإجمالي" : "Total",
                      isAr ? "آخر بيع" : "Last Sale",
                    ],
                    customerReportRows.map((r) => [
                      r.customerName,
                      String(r.salesCount),
                      `₪${r.totalAmount.toLocaleString()}`,
                      r.lastSaleDate ? r.lastSaleDate.slice(0, 10) : "-",
                    ]),
                    `customer-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!customerReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [
                      isAr ? "الزبون" : "Customer",
                      isAr ? "العمليات" : "Sales",
                      isAr ? "الإجمالي" : "Total",
                      isAr ? "آخر بيع" : "Last Sale",
                    ],
                    customerReportRows.map((r) => [
                      r.customerName,
                      String(r.salesCount),
                      `₪${r.totalAmount.toLocaleString()}`,
                      r.lastSaleDate ? r.lastSaleDate.slice(0, 10) : "-",
                    ]),
                    `customer-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".75rem",
              alignItems: "flex-end",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "من تاريخ" : "From date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={customerFromDate}
                onChange={(e) => setCustomerFromDate(e.target.value)}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={customerToDate}
                onChange={(e) => setCustomerToDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setCustomerFromDate("");
                setCustomerToDate("");
              }}
            >
              {isAr ? "إعادة تعيين" : "Reset"}
            </button>
          </div>

          {/* KPI cards */}
          <KpiGrid>
            <KpiCard
              label={isAr ? "عدد الزباين" : "Customers"}
              value={customerReportRows.length}
              gradient="linear-gradient(135deg,#10b981,#059669)"
            />
            <KpiCard
              label={isAr ? "عدد عمليات البيع" : "Sale Operations"}
              value={filteredSales.length}
              gradient="linear-gradient(135deg,#34d399,#10b981)"
            />
            <KpiCard
              label={isAr ? "إجمالي المبيعات" : "Total Sales"}
              value={`₪${customerReportRows.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`}
              gradient="linear-gradient(135deg,#059669,#047857)"
            />
          </KpiGrid>

          <TableShell className="mt-0">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{isAr ? "الزبون" : "Customer"}</th>
                  <th>{isAr ? "العمليات" : "Sales"}</th>
                  <th>{isAr ? "الإجمالي" : "Total"}</th>
                  <th>{isAr ? "آخر بيع" : "Last Sale"}</th>
                </tr>
              </thead>
              <tbody>
                {customerReportRows.map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerName}</td>
                    <td>{row.salesCount}</td>
                    <td>₪{row.totalAmount.toLocaleString()}</td>
                    <td>
                      {row.lastSaleDate ? row.lastSaleDate.slice(0, 10) : "-"}
                    </td>
                  </tr>
                ))}
                {customerReportRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1.5rem" }}
                    >
                      {isAr ? "لا توجد بيانات" : "No data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PRODUCTION TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "production" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Factory}
            color="#8b5cf6"
            title={copy.reports.dailyProduction}
            subtitle={
              isAr
                ? "سجلات الإنتاج حسب الفترة"
                : "Production records by period"
            }
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!productionActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportPdfTable(
                    copy.reports.dailyProduction,
                    [
                      `${t.period}: ${productionActivity.rangeStart.slice(0, 10)} ${isAr ? "إلى" : "to"} ${productionActivity.rangeEnd.slice(0, 10)} (${productionActivity.period})`,
                      `${t.records}: ${productionActivity.totals.recordsCount}`,
                      `${t.cartons}: ${productionActivity.totals.totalCartons}`,
                      `${t.pieces}: ${productionActivity.totals.totalPieces}`,
                      `${isAr ? "دقائق التوقف" : "Downtime minutes"}: ${productionActivity.totals.totalDowntimeMinutes}`,
                    ],
                    [t.date, t.machine, t.shift, t.user, t.cartons, t.pieces],
                    productionActivity.records.map((r) => [
                      r.createdAt.slice(0, 10),
                      r.machineName,
                      r.shiftName,
                      r.userName,
                      String(r.cartonsCount),
                      String(r.totalPieces),
                    ]),
                    `production-${productionActivity.label}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!productionActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [t.date, t.machine, t.shift, t.user, t.cartons, t.pieces],
                    productionActivity.records.map((r) => [
                      r.createdAt.slice(0, 10),
                      r.machineName,
                      r.shiftName,
                      r.userName,
                      String(r.cartonsCount),
                      String(r.totalPieces),
                    ]),
                    `production-${productionActivity.label}.xlsx`
                  );
                }}
              />
            }
          />

          <PeriodFilterBar
            filters={productionFilters}
            setFilters={setProductionFilters}
            isAr={isAr}
            copy={copy}
            loading={loadingSection === "productionActivity"}
            onLoad={() =>
              void loadActivityReport(
                "/reports/production/activity",
                setProductionActivity,
                "productionActivity",
                productionFilters,
                "Failed to load production activity report"
              )
            }
          />

          {productionActivity && (
            <KpiGrid>
              <KpiCard
                label={t.records}
                value={productionActivity.totals.recordsCount}
                gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)"
              />
              <KpiCard
                label={t.cartons}
                value={productionActivity.totals.totalCartons.toLocaleString()}
                gradient="linear-gradient(135deg,#a78bfa,#8b5cf6)"
              />
              <KpiCard
                label={t.pieces}
                value={productionActivity.totals.totalPieces.toLocaleString()}
                gradient="linear-gradient(135deg,#7c3aed,#6d28d9)"
              />
              <KpiCard
                label={isAr ? "دقائق التوقف" : "Downtime (min)"}
                value={productionActivity.totals.totalDowntimeMinutes}
                gradient="linear-gradient(135deg,#6d28d9,#5b21b6)"
              />
            </KpiGrid>
          )}

          {loadingSection === "productionActivity" && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {copy.reports.loadingDaily}
            </p>
          )}

          {productionActivity && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.machine}</th>
                    <th>{t.shift}</th>
                    <th>{t.user}</th>
                    <th>{t.cartons}</th>
                    <th>{t.pieces}</th>
                  </tr>
                </thead>
                <tbody>
                  {productionActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{row.machineName}</td>
                      <td>{row.shiftName}</td>
                      <td>{row.userName}</td>
                      <td>{row.cartonsCount}</td>
                      <td>{row.totalPieces}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          INVENTORY (RAW MATERIALS) TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Package}
            color="#f97316"
            title={copy.reports.inventoryActivity}
            subtitle={
              isAr
                ? "حركة المواد الخام حسب الفترة"
                : "Raw material movements by period"
            }
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!inventoryActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportPdfTable(
                    copy.reports.inventoryActivity,
                    [
                      `${t.period}: ${inventoryActivity.rangeStart.slice(0, 10)} ${isAr ? "إلى" : "to"} ${inventoryActivity.rangeEnd.slice(0, 10)} (${inventoryActivity.period})`,
                      `${t.records}: ${inventoryActivity.totals.recordsCount}`,
                      `${isAr ? "الوارد" : "IN"}: ${inventoryActivity.totals.inCount} (${inventoryActivity.totals.totalInQuantity})`,
                      `${isAr ? "الصادر" : "OUT"}: ${inventoryActivity.totals.outCount} (${inventoryActivity.totals.totalOutQuantity})`,
                    ],
                    [t.date, t.material, t.type, t.qty, t.reference],
                    inventoryActivity.records.map((r) => [
                      r.createdAt.slice(0, 10),
                      r.materialName,
                      r.type,
                      `${r.quantity} ${r.materialUnit}`,
                      r.referenceType,
                    ]),
                    `inventory-${inventoryActivity.label}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!inventoryActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [t.date, t.material, t.type, t.qty, t.reference],
                    inventoryActivity.records.map((r) => [
                      r.createdAt.slice(0, 10),
                      r.materialName,
                      r.type,
                      `${r.quantity} ${r.materialUnit}`,
                      r.referenceType,
                    ]),
                    `inventory-${inventoryActivity.label}.xlsx`
                  );
                }}
              />
            }
          />

          <PeriodFilterBar
            filters={inventoryFilters}
            setFilters={setInventoryFilters}
            isAr={isAr}
            copy={copy}
            loading={loadingSection === "inventoryActivity"}
            onLoad={() =>
              void loadActivityReport(
                "/reports/inventory/activity",
                setInventoryActivity,
                "inventoryActivity",
                inventoryFilters,
                "Failed to load inventory activity report"
              )
            }
          />

          {inventoryActivity && (
            <KpiGrid>
              <KpiCard
                label={t.records}
                value={inventoryActivity.totals.recordsCount}
                gradient="linear-gradient(135deg,#f97316,#ea580c)"
              />
              <KpiCard
                label={isAr ? "الوارد" : "IN"}
                value={`${inventoryActivity.totals.inCount} (${inventoryActivity.totals.totalInQuantity.toLocaleString()})`}
                gradient="linear-gradient(135deg,#fb923c,#f97316)"
              />
              <KpiCard
                label={isAr ? "الصادر" : "OUT"}
                value={`${inventoryActivity.totals.outCount} (${inventoryActivity.totals.totalOutQuantity.toLocaleString()})`}
                gradient="linear-gradient(135deg,#ea580c,#c2410c)"
              />
            </KpiGrid>
          )}

          {loadingSection === "inventoryActivity" && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {copy.reports.loadingInventoryActivity}
            </p>
          )}

          {inventoryActivity && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.material}</th>
                    <th>{t.type}</th>
                    <th>{t.qty}</th>
                    <th>{t.reference}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{row.materialName}</td>
                      <td>{row.type}</td>
                      <td>{`${row.quantity} ${row.materialUnit}`}</td>
                      <td>{row.referenceType}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}

          {/* Inventory snapshot sub-section */}
          <div
            style={{
              borderTop: "1px solid var(--border-default)",
              padding: "1rem 1.25rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 .75rem",
                fontSize: ".9rem",
                fontWeight: 700,
              }}
            >
              {copy.reports.inventorySnapshot}
            </h3>
            <form
              style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: ".75rem" }}
              onSubmit={loadInventorySnapshot}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".2rem",
                  fontSize: ".8rem",
                  fontWeight: 600,
                }}
              >
                {copy.reports.threshold}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  style={{
                    padding: ".35rem .6rem",
                    borderRadius: 6,
                    border: "1px solid var(--border-default)",
                    fontSize: ".85rem",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    width: 120,
                  }}
                  value={inventoryThreshold}
                  onChange={(e) => setInventoryThreshold(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="auth-button"
                style={{ alignSelf: "flex-end" }}
              >
                {copy.load}
              </button>
            </form>
            {loadingSection === "inventory" && (
              <p style={{ color: "var(--text-muted)" }}>
                {copy.reports.loadingInventory}
              </p>
            )}
            <ReportView data={inventorySnapshot} copy={copy} />
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ATTENDANCE TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={UserCheck}
            color="#06b6d4"
            title={copy.reports.attendanceActivity}
            subtitle={
              isAr ? "سجلات الحضور والغياب" : "Attendance and absence records"
            }
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!attendanceActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportPdfTable(
                    copy.reports.attendanceActivity,
                    [
                      `${t.period}: ${attendanceActivity.rangeStart.slice(0, 10)} ${isAr ? "إلى" : "to"} ${attendanceActivity.rangeEnd.slice(0, 10)} (${attendanceActivity.period})`,
                      `${t.records}: ${attendanceActivity.totals.recordsCount}`,
                      `${isAr ? "الغياب" : "Absent"}: ${attendanceActivity.totals.absentCount}`,
                      `${isAr ? "دقائق التأخير" : "Late minutes"}: ${attendanceActivity.totals.totalLateMinutes}`,
                      `${isAr ? "دقائق الإضافي" : "OT minutes"}: ${attendanceActivity.totals.totalOvertimeMinutes}`,
                    ],
                    [t.user, t.shift, t.checkIn, t.checkOut, t.late, t.overtime],
                    attendanceActivity.records.map((r) => [
                      r.userName,
                      r.shiftName ?? "-",
                      r.checkIn.replace("T", " ").slice(0, 16),
                      r.checkOut ? r.checkOut.replace("T", " ").slice(0, 16) : "-",
                      String(r.lateMinutes),
                      String(r.overtimeMinutes),
                    ]),
                    `attendance-${attendanceActivity.label}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!attendanceActivity) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [t.user, t.shift, t.checkIn, t.checkOut, t.late, t.overtime],
                    attendanceActivity.records.map((r) => [
                      r.userName,
                      r.shiftName ?? "-",
                      r.checkIn.replace("T", " ").slice(0, 16),
                      r.checkOut ? r.checkOut.replace("T", " ").slice(0, 16) : "-",
                      String(r.lateMinutes),
                      String(r.overtimeMinutes),
                    ]),
                    `attendance-${attendanceActivity.label}.xlsx`
                  );
                }}
              />
            }
          />

          <PeriodFilterBar
            filters={attendanceFilters}
            setFilters={setAttendanceFilters}
            isAr={isAr}
            copy={copy}
            loading={loadingSection === "attendanceActivity"}
            onLoad={() =>
              void loadActivityReport(
                "/reports/attendance/activity",
                setAttendanceActivity,
                "attendanceActivity",
                attendanceFilters,
                "Failed to load attendance report"
              )
            }
          />

          {attendanceActivity && (
            <KpiGrid>
              <KpiCard
                label={t.records}
                value={attendanceActivity.totals.recordsCount}
                gradient="linear-gradient(135deg,#06b6d4,#0891b2)"
              />
              <KpiCard
                label={isAr ? "الغياب" : "Absent"}
                value={attendanceActivity.totals.absentCount}
                gradient="linear-gradient(135deg,#22d3ee,#06b6d4)"
              />
              <KpiCard
                label={isAr ? "دقائق التأخير" : "Late (min)"}
                value={attendanceActivity.totals.totalLateMinutes.toLocaleString()}
                gradient="linear-gradient(135deg,#0891b2,#0e7490)"
              />
              <KpiCard
                label={isAr ? "دقائق الإضافي" : "OT (min)"}
                value={attendanceActivity.totals.totalOvertimeMinutes.toLocaleString()}
                gradient="linear-gradient(135deg,#0e7490,#155e75)"
              />
            </KpiGrid>
          )}

          {loadingSection === "attendanceActivity" && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {copy.reports.loadingAttendanceActivity}
            </p>
          )}

          {attendanceActivity && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{t.user}</th>
                    <th>{t.shift}</th>
                    <th>{t.checkIn}</th>
                    <th>{t.checkOut}</th>
                    <th>{t.late}</th>
                    <th>{t.overtime}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.userName}</td>
                      <td>{row.shiftName ?? "-"}</td>
                      <td>{row.checkIn.replace("T", " ").slice(0, 16)}</td>
                      <td>
                        {row.checkOut
                          ? row.checkOut.replace("T", " ").slice(0, 16)
                          : "-"}
                      </td>
                      <td>{row.lateMinutes}</td>
                      <td>{row.overtimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}

          {/* Per-employee attendance summary */}
          {attendancePerUser.length > 0 && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              <p style={{ fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: ".5rem", marginTop: "1rem" }}>
                {isAr ? "ملخص الحضور لكل موظف" : "Per-Employee Attendance Summary"}
              </p>
              <TableShell className="mt-0">
                <TableBase className="admin-table">
                  <thead>
                    <tr>
                      <th>{isAr ? "الموظف" : "Employee"}</th>
                      <th>{isAr ? "الدور" : "Role"}</th>
                      <th>{isAr ? "أيام الحضور" : "Present Days"}</th>
                      <th>{isAr ? "أيام جمعة (إضافي)" : "Friday OT Days"}</th>
                      <th>{isAr ? "دقائق التأخير" : "Late (min)"}</th>
                      <th>{isAr ? "دقائق الإضافي" : "OT (min)"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePerUser.map((row) => (
                      <tr key={row.userId}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.role}</td>
                        <td>{row.present}</td>
                        <td>{row.fridayOT}</td>
                        <td>{row.lateMinutes}</td>
                        <td style={{ color: "#7c3aed", fontWeight: 600 }}>{row.otMinutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableBase>
              </TableShell>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PAYROLL TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "payroll" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={DollarSign}
            color="#ec4899"
            title={copy.reports.payrollActivity}
            subtitle={isAr ? "كشف الرواتب حسب الفترة" : "Payroll records by period"}
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!payrollActivity || !filteredPayrollRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportPdfTable(
                    copy.reports.payrollActivity,
                    [
                      `${t.period}: ${payrollActivity.rangeStart.slice(0, 10)} ${isAr ? "إلى" : "to"} ${payrollActivity.rangeEnd.slice(0, 10)} (${payrollActivity.period})`,
                      `${isAr ? "نطاق التقرير" : "Report scope"}: ${payrollScopeLabel}`,
                      `${isAr ? "عدد الأشخاص" : "People"}: ${filteredPayrollTotals.peopleCount}`,
                      `${t.records}: ${filteredPayrollTotals.recordsCount}`,
                      `${isAr ? "الراتب الأساسي" : "Base salary"}: ₪${filteredPayrollTotals.totalBaseSalary.toLocaleString()}`,
                      `${isAr ? "بدل الإضافي" : "OT salary"}: ₪${filteredPayrollTotals.totalOvertimeSalary.toLocaleString()}`,
                      `${isAr ? "إجمالي المدفوع" : "Total payout"}: ₪${filteredPayrollTotals.totalPayout.toLocaleString()}`,
                    ],
                    [t.user, t.month, t.hours, t.overtimeHours, t.total],
                    filteredPayrollRows.map((r) => [
                      r.userName,
                      r.month,
                      String(r.totalHours),
                      String(r.overtimeHours),
                      `₪${r.totalSalary.toLocaleString()}`,
                    ]),
                    `payroll-${payrollActivity.label}-${payrollScopeMode === "ALL" ? "all" : "person"}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!payrollActivity || !filteredPayrollRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [t.user, t.month, t.hours, t.overtimeHours, t.total],
                    filteredPayrollRows.map((r) => [
                      r.userName,
                      r.month,
                      String(r.totalHours),
                      String(r.overtimeHours),
                      `₪${r.totalSalary.toLocaleString()}`,
                    ]),
                    `payroll-${payrollActivity.label}-${payrollScopeMode === "ALL" ? "all" : "person"}.xlsx`
                  );
                }}
              />
            }
          />

          <PeriodFilterBar
            filters={payrollFilters}
            setFilters={setPayrollFilters}
            isAr={isAr}
            copy={copy}
            loading={loadingSection === "payrollActivity"}
            onLoad={() =>
              void loadActivityReport(
                "/reports/payroll/activity",
                setPayrollActivity,
                "payrollActivity",
                payrollFilters,
                "Failed to load payroll report"
              )
            }
            extra={
              <>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ".2rem",
                    fontSize: ".8rem",
                    fontWeight: 600,
                  }}
                >
                  {isAr ? "نطاق التقرير" : "Report scope"}
                  <select
                    style={{
                      padding: ".35rem .6rem",
                      borderRadius: 6,
                      border: "1px solid var(--border-default)",
                      fontSize: ".85rem",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                    }}
                    value={payrollScopeMode}
                    onChange={(e) =>
                      setPayrollScopeMode(e.target.value as "ALL" | "PERSON")
                    }
                  >
                    <option value="ALL">{isAr ? "الكل" : "All"}</option>
                    <option value="PERSON">
                      {isAr ? "شخص معيّن" : "Specific person"}
                    </option>
                  </select>
                </label>
                {payrollScopeMode === "PERSON" && (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: ".2rem",
                      fontSize: ".8rem",
                      fontWeight: 600,
                    }}
                  >
                    {isAr ? "الموظف" : "Employee"}
                    <select
                      style={{
                        padding: ".35rem .6rem",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        fontSize: ".85rem",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                      }}
                      value={payrollScopeUser}
                      onChange={(e) => setPayrollScopeUser(e.target.value)}
                    >
                      {payrollUsers.map((person) => (
                        <option key={person.username} value={person.username}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            }
          />

          {payrollActivity && (
            <KpiGrid>
              <KpiCard
                label={isAr ? "نطاق التقرير" : "Scope"}
                value={payrollScopeLabel}
                gradient="linear-gradient(135deg,#ec4899,#db2777)"
              />
              <KpiCard
                label={isAr ? "عدد الأشخاص" : "People"}
                value={filteredPayrollTotals.peopleCount}
                gradient="linear-gradient(135deg,#f472b6,#ec4899)"
              />
              <KpiCard
                label={t.records}
                value={filteredPayrollTotals.recordsCount}
                gradient="linear-gradient(135deg,#db2777,#be185d)"
              />
              <KpiCard
                label={isAr ? "إجمالي المدفوع" : "Total Payout"}
                value={`₪${filteredPayrollTotals.totalPayout.toLocaleString()}`}
                gradient="linear-gradient(135deg,#be185d,#9d174d)"
              />
            </KpiGrid>
          )}

          {loadingSection === "payrollActivity" && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {copy.reports.loadingPayrollActivity}
            </p>
          )}

          {payrollActivity && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{t.user}</th>
                    <th>{t.month}</th>
                    <th>{t.hours}</th>
                    <th>{t.overtimeHours}</th>
                    <th>{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrollRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.userName}</td>
                      <td>{row.month}</td>
                      <td>{row.totalHours}</td>
                      <td>{row.overtimeHours}</td>
                      <td>₪{row.totalSalary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}

          {/* Per-employee payroll summary */}
          {payrollPerUser.length > 0 && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>
              <p style={{ fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: ".5rem", marginTop: "1rem" }}>
                {isAr ? "ملخص الراتب لكل موظف" : "Per-Employee Payroll Summary"}
              </p>
              <TableShell className="mt-0">
                <TableBase className="admin-table">
                  <thead>
                    <tr>
                      <th>{isAr ? "الموظف" : "Employee"}</th>
                      <th>{isAr ? "الدور" : "Role"}</th>
                      <th>{isAr ? "ساعات العمل" : "Work Hours"}</th>
                      <th>{isAr ? "ساعات إضافية" : "OT Hours"}</th>
                      <th>{isAr ? "الراتب الأساسي" : "Base Salary"}</th>
                      <th>{isAr ? "بدل الإضافي" : "OT Pay"}</th>
                      <th>{isAr ? "الإجمالي" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollPerUser.map((row) => (
                      <tr key={row.username}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.role}</td>
                        <td>{row.totalHours.toFixed(1)}</td>
                        <td>{row.otHours.toFixed(1)}</td>
                        <td>₪{row.baseSalary.toLocaleString()}</td>
                        <td style={{ color: "#7c3aed" }}>₪{row.otSalary.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: "#059669" }}>₪{row.totalSalary.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableBase>
              </TableShell>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ELECTRICITY TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "electricity" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Zap}
            color="#d97706"
            title={isAr ? "تقرير استهلاك الكهرباء" : "Electricity Consumption Report"}
            subtitle={
              isAr
                ? "استهلاك الكهرباء بالشفت والتكلفة"
                : "Electricity consumption by shift and cost"
            }
          />

          {/* Electricity filters */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".75rem",
              alignItems: "flex-end",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "من تاريخ" : "From date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={electricityFromDate}
                onChange={(e) => setElectricityFromDate(e.target.value)}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={electricityToDate}
                onChange={(e) => setElectricityToDate(e.target.value)}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "الشهر" : "Month"}
              <input
                type="month"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={
                  electricityMonth
                    ? `${electricityYear || new Date().getFullYear()}-${electricityMonth.padStart(2, "0")}`
                    : ""
                }
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  setElectricityYear(y ?? "");
                  setElectricityMonth(String(Number(m ?? "0")));
                  setElectricityFromDate("");
                  setElectricityToDate("");
                }}
              />
            </label>
            <div style={{ display: "flex", gap: ".5rem", alignSelf: "flex-end" }}>
              <button
                type="button"
                className="auth-button"
                disabled={loadingElectricity}
                onClick={() => void loadElectricityReport()}
              >
                {loadingElectricity ? (isAr ? "جارٍ..." : "Loading…") : (isAr ? "تحميل" : "Load")}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setElectricityFromDate("");
                  setElectricityToDate("");
                  setElectricityMonth("");
                  setElectricityYear("");
                  setElectricityReport(null);
                }}
              >
                {isAr ? "مسح" : "Clear"}
              </button>
            </div>
          </div>

          {electricityReport && (
            <KpiGrid>
              <KpiCard
                label={isAr ? "إجمالي الاستهلاك" : "Total Consumption"}
                value={`${electricityReport.summary.totalConsumption.toFixed(2)} kWh`}
                gradient="linear-gradient(135deg,#d97706,#b45309)"
              />
              <KpiCard
                label={isAr ? "إجمالي التكلفة" : "Total Cost"}
                value={`₪${electricityReport.summary.totalCost.toFixed(2)}`}
                gradient="linear-gradient(135deg,#fbbf24,#d97706)"
              />
              <KpiCard
                label={isAr ? "عدد القراءات" : "Total Readings"}
                value={electricityReport.summary.totalReadings}
                gradient="linear-gradient(135deg,#b45309,#92400e)"
              />
              <KpiCard
                label={isAr ? "سعر kWh الحالي" : "Current kWh Price"}
                value={`₪${electricityReport.currentKwhPrice.toFixed(3)}`}
                gradient="linear-gradient(135deg,#92400e,#78350f)"
              />
            </KpiGrid>
          )}

          {loadingElectricity && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {isAr ? "جاري التحميل…" : "Loading…"}
            </p>
          )}

          {electricityReport && electricityReport.days.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-secondary)",
                padding: "2rem",
              }}
            >
              {isAr ? "لا توجد بيانات" : "No data in selected range"}
            </p>
          )}

          {electricityReport && electricityReport.days.length > 0 && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{isAr ? "التاريخ" : "Date"}</th>
                    <th>{isAr ? "الشفت" : "Shift"}</th>
                    <th>{isAr ? "بداية (kWh)" : "Start (kWh)"}</th>
                    <th>{isAr ? "نهاية (kWh)" : "End (kWh)"}</th>
                    <th>{isAr ? "الاستهلاك (kWh)" : "Consumption (kWh)"}</th>
                    <th>{isAr ? "سعر kWh" : "kWh Price"}</th>
                    <th>{isAr ? "تكلفة الشفت" : "Shift Cost"}</th>
                    <th>{isAr ? "تهيئة" : "Reset"}</th>
                    <th>{isAr ? "ملاحظات" : "Notes"}</th>
                  </tr>
                </thead>
                <tbody>
                  {electricityReport.days.map((day) => (
                    <>
                      {day.shifts.map((s, si) => (
                        <tr key={s.id}>
                          {si === 0 && (
                            <td
                              rowSpan={day.shifts.length}
                              style={{
                                fontWeight: 700,
                                verticalAlign: "middle",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {new Date(day.date).toLocaleDateString(
                                isAr ? "ar-SA" : "en-GB"
                              )}
                            </td>
                          )}
                          <td>
                            <span
                              style={{
                                padding: ".15rem .45rem",
                                borderRadius: "999px",
                                background: s.shift.name.includes("A")
                                  ? "#dbeafe"
                                  : s.shift.name.includes("B")
                                  ? "#ffedd5"
                                  : "#ede9fe",
                                color: s.shift.name.includes("A")
                                  ? "#1d4ed8"
                                  : s.shift.name.includes("B")
                                  ? "#c2410c"
                                  : "#6d28d9",
                                fontWeight: 700,
                                fontSize: ".8rem",
                              }}
                            >
                              {s.shift.name}
                            </span>
                          </td>
                          <td>{s.startReading.toFixed(2)}</td>
                          <td>{s.endReading.toFixed(2)}</td>
                          <td>
                            <strong>{s.consumption.toFixed(2)}</strong>
                          </td>
                          <td style={{ fontSize: ".85rem" }}>
                            {s.kwhPriceSnap.toFixed(3)}
                          </td>
                          <td>
                            <strong>₪{s.shiftCost.toFixed(2)}</strong>
                          </td>
                          <td>
                            {s.isMeterReset ? (
                              <span
                                style={{
                                  fontSize: ".75rem",
                                  padding: ".1rem .35rem",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}
                              >
                                {isAr ? "تهيئة" : "Reset"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            style={{
                              fontSize: ".8rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {s.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {/* Daily total row */}
                      <tr
                        style={{
                          background: "var(--bg-subtle)",
                          fontWeight: 700,
                        }}
                      >
                        <td
                          colSpan={3}
                          style={{
                            textAlign: "right",
                            color: "var(--text-secondary)",
                            fontSize: ".85rem",
                          }}
                        >
                          {isAr ? "إجمالي اليوم" : "Day Total"}
                        </td>
                        <td></td>
                        <td style={{ color: "var(--brand-primary)" }}>
                          {day.totalConsumption.toFixed(2)} kWh
                        </td>
                        <td></td>
                        <td style={{ color: "#15803d" }}>
                          ₪{day.totalCost.toFixed(2)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          EXPENSES TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "expenses" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Receipt}
            color="#ef4444"
            title={isAr ? "تقرير المصروفات" : "Expenses Report"}
            subtitle={
              isAr
                ? "ملخص المصروفات حسب الفئة والحالة"
                : "Expense summary by category and status"
            }
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!filteredExpenses.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportPdfTable(
                    isAr ? "تقرير المصروفات" : "Expenses Report",
                    [
                      `${isAr ? "الإجمالي" : "Total"}: ₪${expenseTotals.total.toLocaleString()}`,
                      `${isAr ? "معتمد" : "Approved"}: ₪${expenseTotals.approved.toLocaleString()}`,
                      `${isAr ? "معلق" : "Pending"}: ₪${expenseTotals.pending.toLocaleString()}`,
                    ],
                    [
                      isAr ? "التاريخ" : "Date",
                      isAr ? "الفئة" : "Category",
                      isAr ? "الوصف" : "Description",
                      isAr ? "المبلغ" : "Amount",
                      isAr ? "الحالة" : "Status",
                      isAr ? "مقدم الطلب" : "Submitted By",
                    ],
                    filteredExpenses.map((e) => [
                      e.submittedAt.slice(0, 10),
                      e.category,
                      e.description ?? "-",
                      `₪${e.amount.toLocaleString()}`,
                      e.paymentStatus,
                      e.submittedBy?.fullName ?? "-",
                    ]),
                    `expenses-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!filteredExpenses.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [
                      isAr ? "التاريخ" : "Date",
                      isAr ? "الفئة" : "Category",
                      isAr ? "الوصف" : "Description",
                      isAr ? "المبلغ" : "Amount",
                      isAr ? "الحالة" : "Status",
                      isAr ? "مقدم الطلب" : "Submitted By",
                    ],
                    filteredExpenses.map((e) => [
                      e.submittedAt.slice(0, 10),
                      e.category,
                      e.description ?? "-",
                      `₪${e.amount.toLocaleString()}`,
                      e.paymentStatus,
                      e.submittedBy?.fullName ?? "-",
                    ]),
                    `expenses-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".75rem",
              alignItems: "flex-end",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "من تاريخ" : "From date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={expenseFromDate}
                onChange={(e) => setExpenseFromDate(e.target.value)}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".2rem",
                fontSize: ".8rem",
                fontWeight: 600,
              }}
            >
              {isAr ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                style={{
                  padding: ".35rem .6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: ".85rem",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                value={expenseToDate}
                onChange={(e) => setExpenseToDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setExpenseFromDate("");
                setExpenseToDate("");
              }}
            >
              {isAr ? "إعادة تعيين" : "Reset"}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              style={{ alignSelf: "flex-end" }}
              disabled={loadingExpenses}
              onClick={() => void loadExpenses()}
            >
              <RefreshCw size={13} style={{ marginRight: 4 }} />
              {loadingExpenses ? (isAr ? "جارٍ..." : "Loading…") : (isAr ? "تحديث" : "Refresh")}
            </button>
          </div>

          {/* KPI cards */}
          <KpiGrid>
            <KpiCard
              label={isAr ? "عدد المصروفات" : "Total Expenses"}
              value={expenseTotals.count}
              gradient="linear-gradient(135deg,#ef4444,#dc2626)"
            />
            <KpiCard
              label={isAr ? "الإجمالي" : "Total Amount"}
              value={`₪${expenseTotals.total.toLocaleString()}`}
              gradient="linear-gradient(135deg,#f87171,#ef4444)"
            />
            <KpiCard
              label={isAr ? "المعتمد" : "Approved"}
              value={`₪${expenseTotals.approved.toLocaleString()}`}
              gradient="linear-gradient(135deg,#16a34a,#15803d)"
            />
            <KpiCard
              label={isAr ? "المعلق" : "Pending"}
              value={`₪${expenseTotals.pending.toLocaleString()}`}
              gradient="linear-gradient(135deg,#d97706,#b45309)"
            />
          </KpiGrid>

          {loadingExpenses && (
            <p style={{ padding: "1rem 1.25rem", color: "var(--text-muted)" }}>
              {isAr ? "جارٍ التحميل..." : "Loading..."}
            </p>
          )}

          <TableShell className="mt-0">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{isAr ? "التاريخ" : "Date"}</th>
                  <th>{isAr ? "الفئة" : "Category"}</th>
                  <th>{isAr ? "الوصف" : "Description"}</th>
                  <th>{isAr ? "المبلغ" : "Amount"}</th>
                  <th>{isAr ? "الحالة" : "Status"}</th>
                  <th>{isAr ? "مقدم الطلب" : "Submitted By"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.submittedAt.slice(0, 10)}</td>
                    <td>{expense.category}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>
                      {expense.description ?? "-"}
                    </td>
                    <td>₪{expense.amount.toLocaleString()}</td>
                    <td>
                      <span
                        style={{
                          padding: ".15rem .5rem",
                          borderRadius: 999,
                          fontSize: ".75rem",
                          fontWeight: 700,
                          background:
                            expense.paymentStatus === "APPROVED"
                              ? "#dcfce7"
                              : expense.paymentStatus === "PENDING"
                              ? "#fef3c7"
                              : "#fee2e2",
                          color:
                            expense.paymentStatus === "APPROVED"
                              ? "#166534"
                              : expense.paymentStatus === "PENDING"
                              ? "#92400e"
                              : "#991b1b",
                        }}
                      >
                        {expense.paymentStatus}
                      </span>
                    </td>
                    <td>{expense.submittedBy?.fullName ?? "-"}</td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        padding: "1.5rem",
                      }}
                    >
                      {isAr ? "لا توجد مصروفات" : "No expenses found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MAINTENANCE TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "maintenance" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Wrench}
            color="#0891b2"
            title={isAr ? "تقرير تكاليف الصيانة" : "Maintenance Cost Report"}
            subtitle={isAr ? "سجلات تكاليف الصيانة لكل آلة ومهندس" : "Maintenance cost records by machine and engineer"}
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!filteredMaintenance.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportPdfTable(
                    isAr ? "تقرير الصيانة" : "Maintenance Report",
                    [`${isAr ? "السجلات" : "Records"}: ${maintenanceTotals.records}`, `${isAr ? "إجمالي التكلفة" : "Total cost"}: ₪${maintenanceTotals.totalCost.toLocaleString()}`],
                    [isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "ساعات العمل" : "Labor Hrs", isAr ? "قطع الغيار" : "Spares", isAr ? "الإجمالي" : "Total", isAr ? "التاريخ" : "Date"],
                    filteredMaintenance.map((r) => [r.maintenance.machine.name, r.maintenance.engineer.fullName, r.laborHours.toFixed(1), `₪${r.sparesTotal.toLocaleString()}`, `₪${r.totalCost.toLocaleString()}`, r.createdAt.slice(0, 10)]),
                    `maintenance-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!filteredMaintenance.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportExcelTable(
                    [isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "ساعات العمل" : "Labor Hrs", isAr ? "قطع الغيار" : "Spares", isAr ? "الإجمالي" : "Total", isAr ? "التاريخ" : "Date"],
                    filteredMaintenance.map((r) => [r.maintenance.machine.name, r.maintenance.engineer.fullName, r.laborHours.toFixed(1), `₪${r.sparesTotal.toLocaleString()}`, `₪${r.totalCost.toLocaleString()}`, r.createdAt.slice(0, 10)]),
                    `maintenance-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Date filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".2rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isAr ? "من تاريخ" : "From date"}
              <input type="date" value={maintenanceFromDate} onChange={(e) => setMaintenanceFromDate(e.target.value)} style={{ padding: ".35rem .6rem", borderRadius: 6, border: "1px solid var(--border-default)", fontSize: ".85rem", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".2rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isAr ? "إلى تاريخ" : "To date"}
              <input type="date" value={maintenanceToDate} onChange={(e) => setMaintenanceToDate(e.target.value)} style={{ padding: ".35rem .6rem", borderRadius: 6, border: "1px solid var(--border-default)", fontSize: ".85rem", background: "var(--bg-card)", color: "var(--text-primary)" }} />
            </label>
            <button type="button" onClick={() => void loadMaintenanceCosts()} style={{ padding: ".4rem 1rem", borderRadius: 7, background: "var(--orange-500,#f97316)", color: "#fff", border: "none", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
              <RefreshCw size={13} style={{ display: "inline", marginInlineEnd: 4 }} />{isAr ? "تحديث" : "Refresh"}
            </button>
          </div>

          <KpiGrid>
            <KpiCard label={isAr ? "السجلات" : "Records"}           value={maintenanceTotals.records}                                      gradient="linear-gradient(135deg,#0891b2,#0e7490)" />
            <KpiCard label={isAr ? "إجمالي التكلفة" : "Total Cost"}  value={`₪${maintenanceTotals.totalCost.toLocaleString()}`}             gradient="linear-gradient(135deg,#0e7490,#155e75)" />
            <KpiCard label={isAr ? "ساعات العمل" : "Labor Hours"}    value={maintenanceTotals.totalLaborHours.toFixed(1)}                   gradient="linear-gradient(135deg,#155e75,#164e63)" />
            <KpiCard label={isAr ? "تكلفة قطع الغيار" : "Spares"}   value={`₪${maintenanceTotals.totalSpares.toLocaleString()}`}           gradient="linear-gradient(135deg,#06b6d4,#0891b2)" />
          </KpiGrid>

          {filteredMaintenance.length > 0 && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{isAr ? "الآلة" : "Machine"}</th>
                    <th>{isAr ? "النوع" : "Type"}</th>
                    <th>{isAr ? "المهندس" : "Engineer"}</th>
                    <th>{isAr ? "ساعات العمل" : "Labor Hrs"}</th>
                    <th>{isAr ? "تكلفة العمل" : "Labor Cost"}</th>
                    <th>{isAr ? "قطع الغيار" : "Spares"}</th>
                    <th>{isAr ? "الإجمالي" : "Total"}</th>
                    <th>{isAr ? "ملاحظات" : "Notes"}</th>
                    <th>{isAr ? "التاريخ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.maintenance.machine.name}</td>
                      <td>{r.maintenance.machine.type}</td>
                      <td>{r.maintenance.engineer.fullName}</td>
                      <td>{r.laborHours.toFixed(1)}</td>
                      <td>₪{r.laborTotal.toLocaleString()}</td>
                      <td>₪{r.sparesTotal.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: "#0891b2" }}>₪{r.totalCost.toLocaleString()}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: ".78rem" }}>{r.notes ?? "—"}</td>
                      <td>{r.createdAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          QUALITY TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "quality" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={ShieldCheck}
            color="#16a34a"
            title={isAr ? "تقرير فحص الجودة" : "Quality Checks Report"}
            subtitle={isAr ? "سجلات فحص الجودة حسب الآلة والمهندس والخطورة" : "Quality check records by machine, engineer and severity"}
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!filteredQuality.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportPdfTable(
                    isAr ? "تقرير الجودة" : "Quality Report",
                    [`${isAr ? "السجلات" : "Records"}: ${qualityTotals.total}`, `${isAr ? "حرجة" : "Critical"}: ${qualityTotals.critical}`, `${isAr ? "عالية" : "High"}: ${qualityTotals.high}`],
                    [isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "نوع المشكلة" : "Issue Type", isAr ? "الخطورة" : "Severity", isAr ? "التاريخ" : "Date"],
                    filteredQuality.map((r) => [r.machine.name, r.engineer.fullName, r.issueType, r.severity, r.createdAt.slice(0, 10)]),
                    `quality-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!filteredQuality.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportExcelTable(
                    [isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "نوع المشكلة" : "Issue Type", isAr ? "الخطورة" : "Severity", isAr ? "التاريخ" : "Date"],
                    filteredQuality.map((r) => [r.machine.name, r.engineer.fullName, r.issueType, r.severity, r.createdAt.slice(0, 10)]),
                    `quality-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Severity filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".2rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isAr ? "تصفية الخطورة" : "Severity filter"}
              <select value={qualitySeverityFilter} onChange={(e) => setQualitySeverityFilter(e.target.value)} style={{ padding: ".35rem .6rem", borderRadius: 6, border: "1px solid var(--border-default)", fontSize: ".85rem", background: "var(--bg-card)", color: "var(--text-primary)" }}>
                <option value="ALL">{isAr ? "الكل" : "All"}</option>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadQualityChecks()} style={{ padding: ".4rem 1rem", borderRadius: 7, background: "var(--orange-500,#f97316)", color: "#fff", border: "none", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
              <RefreshCw size={13} style={{ display: "inline", marginInlineEnd: 4 }} />{isAr ? "تحديث" : "Refresh"}
            </button>
          </div>

          <KpiGrid>
            <KpiCard label={isAr ? "إجمالي الفحوصات" : "Total Checks"}  value={qualityTotals.total}    gradient="linear-gradient(135deg,#16a34a,#15803d)" />
            <KpiCard label={isAr ? "حرجة" : "Critical"}                 value={qualityTotals.critical}  gradient="linear-gradient(135deg,#dc2626,#b91c1c)" />
            <KpiCard label={isAr ? "عالية" : "High"}                    value={qualityTotals.high}      gradient="linear-gradient(135deg,#d97706,#b45309)" />
            <KpiCard label={isAr ? "تم الحل" : "Resolved"}              value={qualityTotals.resolved}  gradient="linear-gradient(135deg,#0891b2,#0e7490)" />
          </KpiGrid>

          {filteredQuality.length > 0 && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{isAr ? "الآلة" : "Machine"}</th>
                    <th>{isAr ? "النوع" : "Type"}</th>
                    <th>{isAr ? "المهندس" : "Engineer"}</th>
                    <th>{isAr ? "نوع المشكلة" : "Issue Type"}</th>
                    <th>{isAr ? "الخطورة" : "Severity"}</th>
                    <th>{isAr ? "الوصف" : "Description"}</th>
                    <th>{isAr ? "تاريخ الحل" : "Resolved"}</th>
                    <th>{isAr ? "التاريخ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuality.map((r) => {
                    const sevColor = r.severity === "CRITICAL" ? "#dc2626" : r.severity === "HIGH" ? "#d97706" : r.severity === "MEDIUM" ? "#2563eb" : "#16a34a";
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.machine.name}</td>
                        <td>{r.machine.type}</td>
                        <td>{r.engineer.fullName}</td>
                        <td>{r.issueType}</td>
                        <td><span style={{ padding: "2px 8px", borderRadius: 99, fontSize: ".72rem", fontWeight: 700, background: `${sevColor}18`, color: sevColor }}>{r.severity}</span></td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: ".78rem" }}>{r.description ?? "—"}</td>
                        <td>{r.resolvedAt ? r.resolvedAt.slice(0, 10) : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        <td>{r.createdAt.slice(0, 10)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableBase>
            </TableShell>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SPARE PARTS TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "spareParts" && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={Boxes}
            color="#7c3aed"
            title={isAr ? "تقرير طلبات قطع الغيار" : "Spare Parts Requests Report"}
            subtitle={isAr ? "طلبات قطع الغيار حسب المهندس والآلة والحالة" : "Spare part requests by engineer, machine and status"}
            actions={
              <DownloadButtons
                onPdf={() => {
                  if (!filteredSpareParts.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportPdfTable(
                    isAr ? "تقرير قطع الغيار" : "Spare Parts Report",
                    [`${isAr ? "الطلبات" : "Requests"}: ${sparePartsTotals.total}`, `${isAr ? "المعلّقة" : "Pending"}: ${sparePartsTotals.pending}`, `${isAr ? "المستلمة" : "Received"}: ${sparePartsTotals.received}`],
                    [isAr ? "القطعة" : "Part", isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "الكمية" : "Qty", isAr ? "سعر الوحدة" : "Unit Price", isAr ? "الحالة" : "Status", isAr ? "التاريخ" : "Date"],
                    filteredSpareParts.map((r) => [r.partName, r.machine?.name ?? "—", r.engineer.fullName, String(r.quantity), r.unitPrice != null ? `₪${r.unitPrice}` : "—", r.status, r.createdAt.slice(0, 10)]),
                    `spare-parts-report-${new Date().toISOString().slice(0, 10)}.pdf`
                  );
                }}
                onExcel={() => {
                  if (!filteredSpareParts.length) { toast.info(copy.reports.pdfNoData); return; }
                  exportExcelTable(
                    [isAr ? "القطعة" : "Part", isAr ? "الآلة" : "Machine", isAr ? "المهندس" : "Engineer", isAr ? "الكمية" : "Qty", isAr ? "سعر الوحدة" : "Unit Price", isAr ? "الحالة" : "Status", isAr ? "التاريخ" : "Date"],
                    filteredSpareParts.map((r) => [r.partName, r.machine?.name ?? "—", r.engineer.fullName, String(r.quantity), r.unitPrice != null ? `₪${r.unitPrice}` : "—", r.status, r.createdAt.slice(0, 10)]),
                    `spare-parts-report-${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
              />
            }
          />

          {/* Status filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".2rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isAr ? "تصفية الحالة" : "Status filter"}
              <select value={sparePartsStatusFilter} onChange={(e) => setSparePartsStatusFilter(e.target.value)} style={{ padding: ".35rem .6rem", borderRadius: 6, border: "1px solid var(--border-default)", fontSize: ".85rem", background: "var(--bg-card)", color: "var(--text-primary)" }}>
                <option value="ALL">{isAr ? "الكل" : "All"}</option>
                <option value="PENDING">{isAr ? "معلّق" : "Pending"}</option>
                <option value="RECEIVED">{isAr ? "مستلم" : "Received"}</option>
              </select>
            </label>
            <button type="button" onClick={() => void loadSparePartRequests()} style={{ padding: ".4rem 1rem", borderRadius: 7, background: "var(--orange-500,#f97316)", color: "#fff", border: "none", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
              <RefreshCw size={13} style={{ display: "inline", marginInlineEnd: 4 }} />{isAr ? "تحديث" : "Refresh"}
            </button>
          </div>

          <KpiGrid>
            <KpiCard label={isAr ? "إجمالي الطلبات" : "Total Requests"} value={sparePartsTotals.total}                                  gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
            <KpiCard label={isAr ? "معلّقة" : "Pending"}                value={sparePartsTotals.pending}                                 gradient="linear-gradient(135deg,#d97706,#b45309)" />
            <KpiCard label={isAr ? "مستلمة" : "Received"}               value={sparePartsTotals.received}                                gradient="linear-gradient(135deg,#16a34a,#15803d)" />
            <KpiCard label={isAr ? "التكلفة الإجمالية" : "Total Cost"}  value={`₪${sparePartsTotals.totalCost.toLocaleString()}`}        gradient="linear-gradient(135deg,#6d28d9,#5b21b6)" />
          </KpiGrid>

          {filteredSpareParts.length > 0 && (
            <TableShell className="mt-0">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{isAr ? "القطعة" : "Part"}</th>
                    <th>{isAr ? "الآلة" : "Machine"}</th>
                    <th>{isAr ? "المهندس" : "Engineer"}</th>
                    <th>{isAr ? "الكمية" : "Qty"}</th>
                    <th>{isAr ? "سعر الوحدة" : "Unit Price"}</th>
                    <th>{isAr ? "الإجمالي" : "Total"}</th>
                    <th>{isAr ? "الحالة" : "Status"}</th>
                    <th>{isAr ? "سعّره" : "Priced by"}</th>
                    <th>{isAr ? "التاريخ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpareParts.map((r) => {
                    const isPending = r.status === "PENDING";
                    const total = r.unitPrice != null ? r.unitPrice * r.quantity : null;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.partName}</td>
                        <td>{r.machine?.name ?? "—"}</td>
                        <td>{r.engineer.fullName}</td>
                        <td>{r.quantity}</td>
                        <td>{r.unitPrice != null ? `₪${r.unitPrice.toLocaleString()}` : "—"}</td>
                        <td style={{ fontWeight: 700, color: "#7c3aed" }}>{total != null ? `₪${total.toLocaleString()}` : "—"}</td>
                        <td><span style={{ padding: "2px 8px", borderRadius: 99, fontSize: ".72rem", fontWeight: 700, background: isPending ? "rgba(217,119,6,.12)" : "rgba(22,163,74,.12)", color: isPending ? "#b45309" : "#16a34a" }}>{r.status}</span></td>
                        <td style={{ color: "var(--text-secondary)", fontSize: ".78rem" }}>{r.pricedBy?.fullName ?? "—"}</td>
                        <td>{r.createdAt.slice(0, 10)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableBase>
            </TableShell>
          )}
        </Card>
      )}

      {errorMessage && (
        <div className="auth-alert auth-alert--error" style={{ marginTop: "1rem" }}>
          {errorMessage}
        </div>
      )}
    </ModulePageShell>
  );
}

// ─── Helpers (bottom of file) ─────────────────────────────────────────────────

function ReportView({
  data,
  copy,
}: {
  data: ReportBlock | null;
  copy: (typeof appCopy)["en"];
}) {
  if (!data) {
    return <EmptyState title={copy.reports.noReport} />;
  }

  const entries = Object.entries(data);

  return (
    <div className="module-report-grid">
      {entries.map(([key, value]) => (
        <div className="module-report-card" key={key}>
          <span>{key}</span>
          <strong>{prettyValueLocalized(value, copy)}</strong>
        </div>
      ))}
    </div>
  );
}

function prettyValueLocalized(value: unknown, copy: (typeof appCopy)["en"]) {
  if (Array.isArray(value)) {
    return `${value.length} ${copy.reports.items}`;
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? copy.reports.yes : copy.reports.no;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value ?? "-");
}

