import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { PageHeader } from "../../components/ui/page-header";
import { TableBase, TableShell } from "../../components/ui/table-shell";

type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  isActive: boolean;
  deletedAt?: string | null;
};

type ProductionSetting = {
  id: number;
  productType: "CAPS" | "PREFORM";
  piecesPerCarton: number;
  updatedAt?: string;
  updatedBy?: {
    id: number;
    fullName: string;
    username: string;
    role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  } | null;
};

type SystemSetting = {
  id: number;
  qualityCheckIntervalMinutes: number;
  qualityCheckReminderMinutes: number;
  inventoryAuditFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  shiftEndReminderMinutes: number;
  weeklyReportDayOfWeek: number;
  weeklyReportTime: string;
  monthlyReportDayOfMonth: number;
  monthlyReportTime: string;
  updatedAt?: string;
  updatedBy?: {
    id: number;
    fullName: string;
    username: string;
    role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  } | null;
};

type SettingsAdminOverview = {
  productionSettingsCount: number;
  hasSystemSetting: boolean;
  productionSettings: ProductionSetting[];
  latestSystemSetting: SystemSetting | null;
  summary: {
    missingProductTypes: Array<"CAPS" | "PREFORM">;
  };
};

type AttendanceRecord = {
  id: number;
  userId: number;
  checkIn: string;
  checkOut?: string | null;
  lateMinutes?: number;
  overtimeMinutes?: number;
  user?: {
    id: number;
    fullName: string;
    username: string;
    role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  };
  shift?: {
    id: number;
    name: string;
  } | null;
};

type PayrollRecord = {
  id: number;
  userId: number;
  month: string;
  totalHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimeSalary: number;
  totalSalary: number;
  calculatedAt: string;
  user?: {
    id: number;
    fullName: string;
    username: string;
    role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  };
};

type PayrollAdminOverview = {
  totals: {
    payrollCount: number;
    totalBaseSalary: number;
    totalOvertimeSalary: number;
    totalPayout: number;
  };
  byRole: Array<{ role: string; payrollCount: number; totalPayout: number }>;
  recentPayrolls: PayrollRecord[];
};

type Shift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type Machine = {
  id: number;
  name: string;
  type: string;
  status: string;
  createdAt: string;
};

type AuditLog = {
  id: number;
  userId: number | null;
  entityType: string;
  entityId: number | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  user?: { fullName: string; username: string } | null;
};

type DashboardAnalytics = {
  totalUsers: number;
  activeUsers: number;
  totalMachines: number;
  operationalMachines: number;
  totalShifts: number;
  todayTotalHours: number;
  thisMonthPayroll: number;
  productionToday: number;
  inventoryItems: number;
  lowStockItems: number;
};

type WorkerToolsAdminOverview = {
  summary: {
    stops: number;
    checklist: number;
    waste: number;
    target: number;
    kaizen: number;
    quality: number;
    micro: number;
    anomaly: number;
    total: number;
  };
  items: Array<{
    feature: string;
    id: number;
    user_id: number;
    worker_name: string;
    created_at: string;
    title: string;
    details: string;
  }>;
};

type WorkerToolsFilters = {
  feature: string;
  workerName: string;
  fromDate: string;
  toDate: string;
};

const downloadCsv = (filename: string, header: string[], rows: string[][]) => {
  const escape = (value: string) => {
    const normalized = value.replace(/\r?\n|\r/g, " ").trim();
    return /[",]/.test(normalized)
      ? `"${normalized.replace(/"/g, '""')}"`
      : normalized;
  };

  const csv = [header, ...rows]
    .map((line) => line.map(escape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUserChanges, setPendingUserChanges] = useState<
    Record<number, { role: AdminUser["role"]; isActive: boolean }>
  >({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const [payrollOverview, setPayrollOverview] =
    useState<PayrollAdminOverview | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState("");

  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machinesError, setMachinesError] = useState("");

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState("");

  const [dashboardAnalytics, setDashboardAnalytics] =
    useState<DashboardAnalytics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [productionSettings, setProductionSettings] = useState<
    ProductionSetting[]
  >([]);
  const [productionLoading, setProductionLoading] = useState(false);
  const [productionError, setProductionError] = useState("");

  const [systemSetting, setSystemSetting] = useState<SystemSetting | null>(
    null,
  );
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState("");

  const [settingsOverview, setSettingsOverview] =
    useState<SettingsAdminOverview | null>(null);
  const [settingsOverviewLoading, setSettingsOverviewLoading] = useState(false);
  const [settingsOverviewError, setSettingsOverviewError] = useState("");
  const [supportsSettingsOverviewApi, setSupportsSettingsOverviewApi] =
    useState(true);

  const [workerToolsOverview, setWorkerToolsOverview] =
    useState<WorkerToolsAdminOverview | null>(null);
  const [workerToolsLoading, setWorkerToolsLoading] = useState(false);
  const [workerToolsError, setWorkerToolsError] = useState("");
  const [workerToolsFilters, setWorkerToolsFilters] =
    useState<WorkerToolsFilters>({
      feature: "",
      workerName: "",
      fromDate: "",
      toDate: "",
    });
  const [workerToolsAppliedFilters, setWorkerToolsAppliedFilters] =
    useState<WorkerToolsFilters>({
      feature: "",
      workerName: "",
      fromDate: "",
      toDate: "",
    });

  const [systemForm, setSystemForm] = useState({
    qualityCheckIntervalMinutes: "120",
    qualityCheckReminderMinutes: "60",
    inventoryAuditFrequency: "DAILY",
    shiftEndReminderMinutes: "20",
    weeklyReportDayOfWeek: "1",
    weeklyReportTime: "09:00",
    monthlyReportDayOfMonth: "1",
    monthlyReportTime: "09:00",
  });

  const roleBadge = useMemo(() => user?.role ?? "UNKNOWN", [user?.role]);
  const isArabic = locale === "ar";
  const isWorkerToolsOnlyView = location.hash === "#worker-tools";

  const adminSettingsText = useMemo(
    () =>
      isArabic
        ? {
            productionSettingsCount: "عدد إعدادات الإنتاج",
            missingProductTypes: "أنواع المنتجات المفقودة",
            noMissing: "لا توجد أنواع مفقودة",
            hasSystemSetting: "وجود إعداد نظام",
            latestSystemUpdater: "آخر من قام بتحديث إعدادات النظام",
            updatedBy: "تم التحديث بواسطة",
            updatedAt: "وقت التحديث",
            notAvailable: "غير متوفر",
            loadingOverview: "جاري تحميل نظرة عامة على الإعدادات...",
            failedOverview: "فشل تحميل نظرة عامة على الإعدادات",
            complete: "مكتمل",
            missing: "مفقود",
            latestSystemUpdatedAt: "وقت آخر تحديث لإعدادات النظام",
            noSystemSetting: "لا يوجد إعداد نظام بعد",
          }
        : {
            productionSettingsCount: "Production settings count",
            missingProductTypes: "Missing product types",
            noMissing: "No missing product types",
            hasSystemSetting: "Has system setting",
            latestSystemUpdater: "Latest system updater",
            updatedBy: "Updated by",
            updatedAt: "Updated at",
            notAvailable: "Not available",
            loadingOverview: "Loading settings overview...",
            failedOverview: "Failed to load settings overview",
            complete: "Complete",
            missing: "Missing",
            latestSystemUpdatedAt: "Latest system update time",
            noSystemSetting: "No system setting yet",
          },
    [isArabic],
  );

  const attendanceText = useMemo(
    () =>
      isArabic
        ? {
            title: "الحضور والغياب",
            todayAttendance: "حضور اليوم",
            todayAbsence: "غياب اليوم",
            openShifts: "المناوبات المفتوحة",
            lateCases: "حالات التأخير",
            recentAttendances: "آخر سجلات الحضور",
            loading: "جاري تحميل بيانات الحضور...",
            noData: "لا توجد سجلات حضور",
            status: "الحالة",
            checkedOut: "تم تسجيل الخروج",
            checkedIn: "داخل المناوبة",
            checkIn: "وقت الدخول",
            checkOut: "وقت الخروج",
            shift: "الوردية",
          }
        : {
            title: "Attendance & Absence",
            todayAttendance: "Today attendance",
            todayAbsence: "Today absence",
            openShifts: "Open shifts",
            lateCases: "Late cases",
            recentAttendances: "Recent attendances",
            loading: "Loading attendance...",
            noData: "No attendance records",
            status: "Status",
            checkedOut: "Checked out",
            checkedIn: "Checked in",
            checkIn: "Check in",
            checkOut: "Check out",
            shift: "Shift",
          },
    [isArabic],
  );

  const payrollText = useMemo(
    () =>
      isArabic
        ? {
            title: "الرواتب",
            totalPayrolls: "عدد سجلات الرواتب",
            totalBaseSalary: "إجمالي الراتب الأساسي",
            totalOvertimeSalary: "إجمالي بدل الإضافي",
            totalPayout: "إجمالي المدفوعات",
            byRole: "حسب الدور",
            recentPayrolls: "آخر الرواتب",
            loading: "جاري تحميل بيانات الرواتب...",
            noData: "لا توجد بيانات رواتب",
          }
        : {
            title: "Payroll",
            totalPayrolls: "Payroll records",
            totalBaseSalary: "Total base salary",
            totalOvertimeSalary: "Total overtime salary",
            totalPayout: "Total payout",
            byRole: "By role",
            recentPayrolls: "Recent payrolls",
            loading: "Loading payroll...",
            noData: "No payroll data",
          },
    [isArabic],
  );

  const getRoleLabel = useCallback(
    (role: AdminUser["role"]) => copy.admin.roleLabels[role] ?? role,
    [copy.admin.roleLabels],
  );

  const getProductTypeLabel = useCallback(
    (productType: ProductionSetting["productType"]) =>
      copy.admin.productTypeLabels[productType] ?? productType,
    [copy.admin.productTypeLabels],
  );

  const getAuditFrequencyLabel = useCallback(
    (value: "DAILY" | "WEEKLY" | "MONTHLY") =>
      copy.admin.auditFrequencyLabels[value] ?? value,
    [copy.admin.auditFrequencyLabels],
  );

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetchWithAdminAuth("/users/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as AdminUser[];
      setUsers(data);
      setPendingUserChanges(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            { role: item.role, isActive: item.isActive },
          ]),
        ),
      );
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Failed to load users",
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadAttendanceData = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const response = await fetchWithAdminAuth("/attendance/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setAttendanceRecords(
        ((await response.json()) as AttendanceRecord[]) ?? [],
      );
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : attendanceText.loading,
      );
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceText.loading]);

  const loadPayrollData = useCallback(async () => {
    setPayrollLoading(true);
    setPayrollError("");
    try {
      const [overviewResponse, listResponse] = await Promise.all([
        fetchWithAdminAuth("/payroll/admin/overview"),
        fetchWithAdminAuth("/payroll"),
      ]);
      if (!overviewResponse.ok) {
        throw new Error(await readApiError(overviewResponse));
      }
      if (!listResponse.ok) {
        throw new Error(await readApiError(listResponse));
      }
      setPayrollOverview(
        (await overviewResponse.json()) as PayrollAdminOverview,
      );
      setPayrollRecords(((await listResponse.json()) as PayrollRecord[]) ?? []);
    } catch (error) {
      setPayrollError(
        error instanceof Error ? error.message : payrollText.loading,
      );
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollText.loading]);

  const loadShifts = useCallback(async () => {
    setShiftsLoading(true);
    setShiftsError("");
    try {
      const response = await fetchWithAdminAuth("/shifts");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setShifts((await response.json()) as Shift[]);
    } catch (error) {
      setShiftsError(
        error instanceof Error ? error.message : "Failed to load shifts",
      );
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  const loadMachines = useCallback(async () => {
    setMachinesLoading(true);
    setMachinesError("");
    try {
      const response = await fetchWithAdminAuth("/machines");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setMachines((await response.json()) as Machine[]);
    } catch (error) {
      setMachinesError(
        error instanceof Error ? error.message : "Failed to load machines",
      );
    } finally {
      setMachinesLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    setAuditLogsError("");
    try {
      const response = await fetchWithAdminAuth("/audit/logs?limit=50");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const payload = (await response.json()) as
        | AuditLog[]
        | { logs?: AuditLog[] };
      setAuditLogs(Array.isArray(payload) ? payload : (payload.logs ?? []));
    } catch (error) {
      setAuditLogsError(
        error instanceof Error ? error.message : "Failed to load audit logs",
      );
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const response = await fetchWithAdminAuth("/dashboard/analytics");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setDashboardAnalytics((await response.json()) as DashboardAnalytics);
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : "Failed to load dashboard",
      );
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadProductionSettings = useCallback(async () => {
    setProductionLoading(true);
    setProductionError("");
    try {
      const response = await fetchWithAdminAuth("/settings/production");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setProductionSettings((await response.json()) as ProductionSetting[]);
    } catch (error) {
      setProductionError(
        error instanceof Error
          ? error.message
          : "Failed to load production settings",
      );
    } finally {
      setProductionLoading(false);
    }
  }, []);

  const loadSystemSettings = useCallback(async () => {
    setSystemLoading(true);
    setSystemError("");
    try {
      const response = await fetchWithAdminAuth("/settings/system");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as SystemSetting | null;
      setSystemSetting(data);
      if (data) {
        setSystemForm({
          qualityCheckIntervalMinutes: String(data.qualityCheckIntervalMinutes),
          qualityCheckReminderMinutes: String(data.qualityCheckReminderMinutes),
          inventoryAuditFrequency: data.inventoryAuditFrequency,
          shiftEndReminderMinutes: String(data.shiftEndReminderMinutes),
          weeklyReportDayOfWeek: String(data.weeklyReportDayOfWeek),
          weeklyReportTime: data.weeklyReportTime,
          monthlyReportDayOfMonth: String(data.monthlyReportDayOfMonth),
          monthlyReportTime: data.monthlyReportTime,
        });
      }
    } catch (error) {
      setSystemError(
        error instanceof Error
          ? error.message
          : "Failed to load system settings",
      );
    } finally {
      setSystemLoading(false);
    }
  }, []);

  const loadSettingsOverview = useCallback(async () => {
    setSettingsOverviewLoading(true);
    setSettingsOverviewError("");
    try {
      if (!supportsSettingsOverviewApi) {
        const [productionResponse, systemResponse] = await Promise.all([
          fetchWithAdminAuth("/settings/production"),
          fetchWithAdminAuth("/settings/system"),
        ]);
        if (!productionResponse.ok) {
          throw new Error(await readApiError(productionResponse));
        }
        if (!systemResponse.ok) {
          throw new Error(await readApiError(systemResponse));
        }
        const productionData =
          (await productionResponse.json()) as ProductionSetting[];
        const systemData =
          (await systemResponse.json()) as SystemSetting | null;
        const missingProductTypes = (["CAPS", "PREFORM"] as const).filter(
          (type) =>
            !productionData.some((setting) => setting.productType === type),
        );
        setSettingsOverview({
          productionSettingsCount: productionData.length,
          hasSystemSetting: Boolean(systemData),
          productionSettings: productionData,
          latestSystemSetting: systemData,
          summary: { missingProductTypes },
        });
        setProductionSettings(productionData);
        if (systemData) {
          setSystemSetting(systemData);
        }
        return;
      }

      const response = await fetchWithAdminAuth("/settings/admin/overview");
      if (!response.ok) {
        if (response.status === 404) {
          setSupportsSettingsOverviewApi(false);
          const [productionResponse, systemResponse] = await Promise.all([
            fetchWithAdminAuth("/settings/production"),
            fetchWithAdminAuth("/settings/system"),
          ]);
          if (!productionResponse.ok) {
            throw new Error(await readApiError(productionResponse));
          }
          if (!systemResponse.ok) {
            throw new Error(await readApiError(systemResponse));
          }
          const productionData =
            (await productionResponse.json()) as ProductionSetting[];
          const systemData =
            (await systemResponse.json()) as SystemSetting | null;
          const missingProductTypes = (["CAPS", "PREFORM"] as const).filter(
            (type) =>
              !productionData.some((setting) => setting.productType === type),
          );
          setSettingsOverview({
            productionSettingsCount: productionData.length,
            hasSystemSetting: Boolean(systemData),
            productionSettings: productionData,
            latestSystemSetting: systemData,
            summary: { missingProductTypes },
          });
          setProductionSettings(productionData);
          if (systemData) {
            setSystemSetting(systemData);
          }
          return;
        }
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as SettingsAdminOverview;
      setSettingsOverview(data);
      if (Array.isArray(data.productionSettings)) {
        setProductionSettings(data.productionSettings);
      }
      if (data.latestSystemSetting) {
        setSystemSetting(data.latestSystemSetting);
      }
    } catch (error) {
      setSettingsOverviewError(
        error instanceof Error
          ? error.message
          : adminSettingsText.failedOverview,
      );
    } finally {
      setSettingsOverviewLoading(false);
    }
  }, [adminSettingsText.failedOverview, supportsSettingsOverviewApi]);

  const loadWorkerToolsOverview = useCallback(async () => {
    setWorkerToolsLoading(true);
    setWorkerToolsError("");
    setWorkerToolsOverview(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (workerToolsAppliedFilters.feature) {
        params.set("feature", workerToolsAppliedFilters.feature);
      }
      if (workerToolsAppliedFilters.workerName.trim()) {
        params.set("workerName", workerToolsAppliedFilters.workerName.trim());
      }
      if (workerToolsAppliedFilters.fromDate) {
        params.set(
          "fromDate",
          `${workerToolsAppliedFilters.fromDate}T00:00:00.000Z`,
        );
      }
      if (workerToolsAppliedFilters.toDate) {
        params.set(
          "toDate",
          `${workerToolsAppliedFilters.toDate}T23:59:59.999Z`,
        );
      }

      const response = await fetchWithAdminAuth(
        `/worker-tools/admin/overview?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setWorkerToolsOverview(
        (await response.json()) as WorkerToolsAdminOverview,
      );
    } catch (error) {
      setWorkerToolsError(
        error instanceof Error
          ? error.message
          : "Failed to load worker tools overview",
      );
    } finally {
      setWorkerToolsLoading(false);
    }
  }, [workerToolsAppliedFilters]);

  const exportWorkerToolsCsv = useCallback(() => {
    if (!workerToolsOverview?.items?.length) {
      return;
    }

    const header = [
      "id",
      "feature",
      "worker_name",
      "title",
      "details",
      "created_at",
    ];

    const rows = workerToolsOverview.items.map((item) => [
      String(item.id),
      item.feature,
      item.worker_name,
      item.title,
      item.details,
      new Date(item.created_at).toISOString(),
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`worker-tools-${stamp}.csv`, header, rows);
  }, [workerToolsOverview]);

  useEffect(() => {
    void loadUsers();
    void loadAttendanceData();
    void loadPayrollData();
    void loadShifts();
    void loadMachines();
    void loadAuditLogs();
    void loadDashboard();
    void loadProductionSettings();
    void loadSystemSettings();
    void loadSettingsOverview();
  }, [
    loadAuditLogs,
    loadAttendanceData,
    loadDashboard,
    loadMachines,
    loadPayrollData,
    loadProductionSettings,
    loadSettingsOverview,
    loadShifts,
    loadSystemSettings,
    loadUsers,
  ]);

  useEffect(() => {
    void loadWorkerToolsOverview();
  }, [loadWorkerToolsOverview]);

  useEffect(() => {
    if (location.hash !== "#worker-tools") {
      return;
    }
    const timer = window.setTimeout(() => {
      document
        .getElementById("worker-tools")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const attendanceTodayStats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const todayAttendances = attendanceRecords.filter((record) => {
      const checkIn = new Date(record.checkIn);
      return checkIn >= start && checkIn <= end;
    });
    const checkedInUserIds = new Set(
      todayAttendances.map((record) => record.userId),
    );
    const operationalUsers = users.filter(
      (item) =>
        !item.deletedAt &&
        item.isActive &&
        (item.role === "WORKER" ||
          item.role === "ENGINEER" ||
          item.role === "ACCOUNTANT"),
    );
    return {
      attendanceCount: checkedInUserIds.size,
      absentCount: operationalUsers.filter(
        (item) => !checkedInUserIds.has(item.id),
      ).length,
      openShiftCount: todayAttendances.filter((item) => !item.checkOut).length,
      lateCount: todayAttendances.filter((item) => (item.lateMinutes ?? 0) > 0)
        .length,
    };
  }, [attendanceRecords, users]);

  const handleDeleteUser = async (id: number) => {
    const confirmed = window.confirm(copy.admin.deleteUserConfirm);
    if (!confirmed) {
      return;
    }
    try {
      const response = await fetchWithAdminAuth(`/users/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === id
            ? { ...userItem, deletedAt: new Date().toISOString() }
            : userItem,
        ),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : copy.admin.deleteUserFailed,
      );
    }
  };

  const handleUpdateProductionSetting = async (
    productType: "CAPS" | "PREFORM",
    value: string,
  ) => {
    const piecesPerCarton = Number(value);
    if (!Number.isInteger(piecesPerCarton) || piecesPerCarton <= 0) {
      window.alert("piecesPerCarton must be a positive integer");
      return;
    }
    try {
      const response = await fetchWithAdminAuth(
        `/settings/production/${productType}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ piecesPerCarton }),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const updated = (await response.json()) as ProductionSetting;
      setProductionSettings((prev) =>
        prev.map((item) =>
          item.productType === updated.productType ? updated : item,
        ),
      );
      await loadSettingsOverview();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update production setting",
      );
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      const payload = {
        qualityCheckIntervalMinutes: Number(
          systemForm.qualityCheckIntervalMinutes,
        ),
        qualityCheckReminderMinutes: Number(
          systemForm.qualityCheckReminderMinutes,
        ),
        inventoryAuditFrequency: systemForm.inventoryAuditFrequency,
        shiftEndReminderMinutes: Number(systemForm.shiftEndReminderMinutes),
        weeklyReportDayOfWeek: Number(systemForm.weeklyReportDayOfWeek),
        weeklyReportTime: systemForm.weeklyReportTime,
        monthlyReportDayOfMonth: Number(systemForm.monthlyReportDayOfMonth),
        monthlyReportTime: systemForm.monthlyReportTime,
      };
      const response = await fetchWithAdminAuth("/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as SystemSetting;
      setSystemSetting(data);
      window.alert("System settings updated successfully");
      await loadSettingsOverview();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update system settings",
      );
    }
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <PageHeader
            eyebrow="Plasticon"
            title={copy.admin.title}
            subtitle={copy.admin.subtitle}
          />
          <div className="admin-header__actions">
            <span className="admin-role-badge">
              {roleBadge === "UNKNOWN"
                ? roleBadge
                : getRoleLabel(roleBadge as AdminUser["role"])}
            </span>
          </div>
        </header>

        {!isWorkerToolsOnlyView ? (
          <>
            <section className="admin-section" id="users">
              <div className="admin-section__head">
                <h2>{copy.admin.usersTitle}</h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button onClick={() => navigate("/register")}>
                    {copy.admin.addNewUser}
                  </Button>
                  <Button onClick={() => void loadUsers()}>
                    {copy.refresh}
                  </Button>
                </div>
              </div>
              {usersLoading ? <p>{copy.admin.loadingUsers}</p> : null}
              {usersError ? (
                <div className="auth-alert auth-alert--error">{usersError}</div>
              ) : null}
              <TableShell>
                <TableBase className="admin-table">
                  <thead>
                    <tr>
                      <th>{copy.admin.id}</th>
                      <th>{copy.admin.name}</th>
                      <th>{copy.admin.username}</th>
                      <th>{copy.admin.email}</th>
                      <th>{copy.admin.role}</th>
                      <th>{copy.admin.status}</th>
                      <th>{copy.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.fullName}</td>
                        <td>{item.username}</td>
                        <td>{item.email ?? "-"}</td>
                        <td>
                          <select
                            value={
                              pendingUserChanges[item.id]?.role ?? item.role
                            }
                            onChange={(event) =>
                              setPendingUserChanges((prev) => ({
                                ...prev,
                                [item.id]: {
                                  role: event.target.value as AdminUser["role"],
                                  isActive:
                                    prev[item.id]?.isActive ?? item.isActive,
                                },
                              }))
                            }
                          >
                            <option value="ADMIN">
                              {getRoleLabel("ADMIN")}
                            </option>
                            <option value="ENGINEER">
                              {getRoleLabel("ENGINEER")}
                            </option>
                            <option value="ACCOUNTANT">
                              {getRoleLabel("ACCOUNTANT")}
                            </option>
                            <option value="WORKER">
                              {getRoleLabel("WORKER")}
                            </option>
                          </select>
                        </td>
                        <td>
                          {item.deletedAt
                            ? copy.admin.deleted
                            : item.isActive
                              ? copy.admin.active
                              : copy.admin.inactive}
                        </td>
                        <td>
                          <label className="admin-flag">
                            <input
                              type="checkbox"
                              checked={
                                pendingUserChanges[item.id]?.isActive ??
                                item.isActive
                              }
                              disabled={Boolean(item.deletedAt)}
                              onChange={(event) =>
                                setPendingUserChanges((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    role: prev[item.id]?.role ?? item.role,
                                    isActive: event.target.checked,
                                  },
                                }))
                              }
                            />
                            {copy.admin.active}
                          </label>
                          <button
                            type="button"
                            className="auth-button"
                            disabled={Boolean(item.deletedAt)}
                            onClick={() => {
                              const pending = pendingUserChanges[item.id];
                              if (!pending) return;
                              void (async () => {
                                try {
                                  const roleResponse = await fetchWithAdminAuth(
                                    `/users/${item.id}/role`,
                                    {
                                      method: "PUT",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        role: pending.role,
                                      }),
                                    },
                                  );
                                  if (!roleResponse.ok)
                                    throw new Error(
                                      await readApiError(roleResponse),
                                    );
                                  const updateResponse =
                                    await fetchWithAdminAuth(
                                      `/users/${item.id}`,
                                      {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          isActive: pending.isActive,
                                        }),
                                      },
                                    );
                                  if (!updateResponse.ok)
                                    throw new Error(
                                      await readApiError(updateResponse),
                                    );
                                  setUsers((prev) =>
                                    prev.map((userItem) =>
                                      userItem.id === item.id
                                        ? {
                                            ...userItem,
                                            role: pending.role,
                                            isActive: pending.isActive,
                                          }
                                        : userItem,
                                    ),
                                  );
                                  window.alert(copy.admin.userUpdated);
                                } catch (error) {
                                  window.alert(
                                    error instanceof Error
                                      ? error.message
                                      : copy.admin.userUpdateFailed,
                                  );
                                }
                              })();
                            }}
                          >
                            {copy.admin.saveChanges}
                          </button>
                          <button
                            type="button"
                            className="auth-button auth-button--ghost"
                            disabled={Boolean(item.deletedAt)}
                            onClick={() => void handleDeleteUser(item.id)}
                          >
                            {copy.delete}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableBase>
              </TableShell>
            </section>

            <section className="admin-section" id="attendance">
              <div className="admin-section__head">
                <h2>{attendanceText.title}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => {
                    void loadUsers();
                    void loadAttendanceData();
                  }}
                >
                  {copy.refresh}
                </button>
              </div>
              {attendanceLoading ? <p>{attendanceText.loading}</p> : null}
              {attendanceError ? (
                <div className="auth-alert auth-alert--error">
                  {attendanceError}
                </div>
              ) : null}
              <div className="admin-kpi-grid">
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {attendanceText.todayAttendance}
                  </p>
                  <p className="admin-kpi-card__value">
                    {attendanceTodayStats.attendanceCount}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {attendanceText.todayAbsence}
                  </p>
                  <p className="admin-kpi-card__value">
                    {attendanceTodayStats.absentCount}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {attendanceText.openShifts}
                  </p>
                  <p className="admin-kpi-card__value">
                    {attendanceTodayStats.openShiftCount}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {attendanceText.lateCases}
                  </p>
                  <p className="admin-kpi-card__value">
                    {attendanceTodayStats.lateCount}
                  </p>
                </article>
              </div>
              <h3>{attendanceText.recentAttendances}</h3>
              <TableShell>
                <TableBase className="admin-table">
                  <thead>
                    <tr>
                      <th>{copy.admin.id}</th>
                      <th>{copy.admin.name}</th>
                      <th>{copy.admin.role}</th>
                      <th>{attendanceText.shift}</th>
                      <th>{attendanceText.checkIn}</th>
                      <th>{attendanceText.checkOut}</th>
                      <th>{attendanceText.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.slice(0, 60).map((record) => (
                      <tr key={record.id}>
                        <td>{record.id}</td>
                        <td>
                          {record.user?.fullName ||
                            record.user?.username ||
                            "-"}
                        </td>
                        <td>{record.user?.role || "-"}</td>
                        <td>{record.shift?.name || "-"}</td>
                        <td>{new Date(record.checkIn).toLocaleString()}</td>
                        <td>
                          {record.checkOut
                            ? new Date(record.checkOut).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          {record.checkOut
                            ? attendanceText.checkedOut
                            : attendanceText.checkedIn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableBase>
              </TableShell>
              {!attendanceLoading && attendanceRecords.length === 0 ? (
                <EmptyState title={attendanceText.noData} />
              ) : null}
            </section>

            <section className="admin-section" id="payroll">
              <div className="admin-section__head">
                <h2>{payrollText.title}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadPayrollData()}
                >
                  {copy.refresh}
                </button>
              </div>
              {payrollLoading ? <p>{payrollText.loading}</p> : null}
              {payrollError ? (
                <div className="auth-alert auth-alert--error">
                  {payrollError}
                </div>
              ) : null}
              <div className="admin-kpi-grid">
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {payrollText.totalPayrolls}
                  </p>
                  <p className="admin-kpi-card__value">
                    {payrollOverview?.totals.payrollCount ??
                      payrollRecords.length}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {payrollText.totalBaseSalary}
                  </p>
                  <p className="admin-kpi-card__value admin-kpi-card__value--small">
                    {(
                      payrollOverview?.totals.totalBaseSalary ?? 0
                    ).toLocaleString()}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {payrollText.totalOvertimeSalary}
                  </p>
                  <p className="admin-kpi-card__value admin-kpi-card__value--small">
                    {(
                      payrollOverview?.totals.totalOvertimeSalary ?? 0
                    ).toLocaleString()}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {payrollText.totalPayout}
                  </p>
                  <p className="admin-kpi-card__value admin-kpi-card__value--small">
                    {(
                      payrollOverview?.totals.totalPayout ?? 0
                    ).toLocaleString()}
                  </p>
                </article>
              </div>
              <div className="admin-grid">
                <article className="admin-panel">
                  <h3>{payrollText.byRole}</h3>
                  <TableShell>
                    <TableBase className="admin-table">
                      <thead>
                        <tr>
                          <th>{copy.admin.role}</th>
                          <th>{payrollText.totalPayrolls}</th>
                          <th>{payrollText.totalPayout}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payrollOverview?.byRole ?? []).map((item) => (
                          <tr key={item.role}>
                            <td>{item.role}</td>
                            <td>{item.payrollCount}</td>
                            <td>{item.totalPayout.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableBase>
                  </TableShell>
                </article>
                <article className="admin-panel">
                  <h3>{payrollText.recentPayrolls}</h3>
                  <TableShell>
                    <TableBase className="admin-table">
                      <thead>
                        <tr>
                          <th>{copy.admin.name}</th>
                          <th>{copy.admin.role}</th>
                          <th>Month</th>
                          <th>{payrollText.totalPayout}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollRecords.slice(0, 30).map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.user?.fullName ||
                                item.user?.username ||
                                "-"}
                            </td>
                            <td>{item.user?.role || "-"}</td>
                            <td>{item.month}</td>
                            <td>{item.totalSalary.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableBase>
                  </TableShell>
                </article>
              </div>
              {!payrollLoading && payrollRecords.length === 0 ? (
                <EmptyState title={payrollText.noData} />
              ) : null}
            </section>

            <section className="admin-section" id="shifts">
              <div className="admin-section__head">
                <h2>{copy.admin.shiftsTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadShifts()}
                >
                  {copy.refresh}
                </button>
              </div>
              {shiftsLoading ? <p>{copy.admin.loadingShifts}</p> : null}
              {shiftsError ? (
                <div className="auth-alert auth-alert--error">
                  {shiftsError}
                </div>
              ) : null}
              {!shiftsLoading && shifts.length === 0 ? (
                <p className="admin-muted">{copy.admin.noShifts}</p>
              ) : null}
              {shifts.length > 0 ? (
                <TableShell>
                  <TableBase className="admin-table">
                    <thead>
                      <tr>
                        <th>{copy.admin.id}</th>
                        <th>{copy.admin.name}</th>
                        <th>{copy.admin.shiftStart}</th>
                        <th>{copy.admin.shiftEnd}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>
                            {new Date(item.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td>
                            {new Date(item.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableBase>
                </TableShell>
              ) : null}
            </section>

            <section className="admin-section" id="machines">
              <div className="admin-section__head">
                <h2>{copy.admin.machinesTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadMachines()}
                >
                  {copy.refresh}
                </button>
              </div>
              {machinesLoading ? <p>{copy.admin.loadingMachines}</p> : null}
              {machinesError ? (
                <div className="auth-alert auth-alert--error">
                  {machinesError}
                </div>
              ) : null}
              {!machinesLoading && machines.length === 0 ? (
                <p className="admin-muted">{copy.admin.noMachines}</p>
              ) : null}
              {machines.length > 0 ? (
                <TableShell>
                  <TableBase className="admin-table">
                    <thead>
                      <tr>
                        <th>{copy.admin.id}</th>
                        <th>{copy.admin.name}</th>
                        <th>{copy.admin.machineType}</th>
                        <th>{copy.admin.machineStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.type}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableBase>
                </TableShell>
              ) : null}
            </section>

            <section className="admin-section" id="audit-logs">
              <div className="admin-section__head">
                <h2>{copy.admin.auditLogsTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadAuditLogs()}
                >
                  {copy.refresh}
                </button>
              </div>
              {auditLogsLoading ? <p>{copy.admin.loadingAuditLogs}</p> : null}
              {auditLogsError ? (
                <div className="auth-alert auth-alert--error">
                  {auditLogsError}
                </div>
              ) : null}
              {!auditLogsLoading && auditLogs.length === 0 ? (
                <p className="admin-muted">{copy.admin.noAuditLogs}</p>
              ) : null}
              {auditLogs.length > 0 ? (
                <TableShell>
                  <TableBase className="admin-table">
                    <thead>
                      <tr>
                        <th>{copy.admin.id}</th>
                        <th>{copy.admin.name}</th>
                        <th>{copy.admin.auditEntity}</th>
                        <th>{copy.admin.auditAction}</th>
                        <th>{copy.admin.calculatedAt}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>
                            {item.user
                              ? `${item.user.fullName} (@${item.user.username})`
                              : "-"}
                          </td>
                          <td>{item.entityType}</td>
                          <td>{item.action}</td>
                          <td>{new Date(item.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableBase>
                </TableShell>
              ) : null}
            </section>
          </>
        ) : null}

        <section className="admin-section" id="worker-tools">
          <div className="admin-section__head">
            <h2>
              {isArabic
                ? "أدوات العامل (من قاعدة البيانات)"
                : "Worker Tools (Database)"}
            </h2>
            <div className="admin-section__actions">
              <button
                type="button"
                className="auth-button"
                onClick={() => void loadWorkerToolsOverview()}
              >
                {copy.refresh}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={exportWorkerToolsCsv}
                disabled={!workerToolsOverview?.items?.length}
              >
                {isArabic ? "تصدير CSV" : "Export CSV"}
              </button>
            </div>
          </div>
          <div
            className="admin-tabs"
            role="tablist"
            aria-label="Worker tool filters"
          >
            {[
              { value: "", label: isArabic ? "الكل" : "All" },
              { value: "stops", label: isArabic ? "توقفات" : "Stops" },
              {
                value: "checklist",
                label: isArabic ? "فحص" : "Checklist",
              },
              { value: "waste", label: isArabic ? "مخلفات" : "Waste" },
              { value: "target", label: isArabic ? "أهداف" : "Targets" },
              { value: "kaizen", label: "Kaizen" },
              { value: "quality", label: isArabic ? "جودة" : "Quality" },
              {
                value: "micro",
                label: isArabic ? "توقفات صغيرة" : "Micro",
              },
              {
                value: "anomaly",
                label: isArabic ? "كهرباء" : "Anomaly",
              },
            ].map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                className={
                  workerToolsFilters.feature === tab.value ? "is-active" : ""
                }
                onClick={() => {
                  setWorkerToolsOverview(null);
                  setWorkerToolsFilters((prev) => ({
                    ...prev,
                    feature: tab.value,
                  }));
                  setWorkerToolsAppliedFilters((prev) => ({
                    ...prev,
                    feature: tab.value,
                  }));
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="admin-form-grid">
            <label>
              {isArabic ? "اسم العامل" : "Worker name"}
              <input
                type="text"
                value={workerToolsFilters.workerName}
                onChange={(event) =>
                  setWorkerToolsFilters((prev) => ({
                    ...prev,
                    workerName: event.target.value,
                  }))
                }
                placeholder={isArabic ? "ابحث بالاسم" : "Search by name"}
              />
            </label>

            <label>
              {isArabic ? "من تاريخ" : "From date"}
              <input
                type="date"
                value={workerToolsFilters.fromDate}
                onChange={(event) =>
                  setWorkerToolsFilters((prev) => ({
                    ...prev,
                    fromDate: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              {isArabic ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                value={workerToolsFilters.toDate}
                onChange={(event) =>
                  setWorkerToolsFilters((prev) => ({
                    ...prev,
                    toDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="admin-section__actions">
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                setWorkerToolsOverview(null);
                setWorkerToolsAppliedFilters(workerToolsFilters);
              }}
            >
              {isArabic ? "تطبيق الفلاتر" : "Apply filters"}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                setWorkerToolsOverview(null);
                setWorkerToolsFilters({
                  feature: "",
                  workerName: "",
                  fromDate: "",
                  toDate: "",
                });
                setWorkerToolsAppliedFilters({
                  feature: "",
                  workerName: "",
                  fromDate: "",
                  toDate: "",
                });
              }}
            >
              {isArabic ? "مسح الفلاتر" : "Clear filters"}
            </button>
          </div>
          {workerToolsLoading ? (
            <p>
              {isArabic
                ? "جاري تحميل بيانات أدوات العامل..."
                : "Loading worker tools data..."}
            </p>
          ) : null}
          {workerToolsError ? (
            <div className="auth-alert auth-alert--error">
              {workerToolsError}
            </div>
          ) : null}
          {!workerToolsLoading && workerToolsOverview ? (
            <>
              <div className="admin-kpi-grid">
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "الإجمالي" : "Total"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.total}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "توقفات" : "Stops"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.stops}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "فحص" : "Checklist"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.checklist}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "مخلفات" : "Waste"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.waste}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "أهداف" : "Targets"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.target}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">Kaizen</p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.kaizen}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "جودة" : "Quality"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.quality}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "توقفات صغيرة" : "Micro Stops"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.micro}
                  </p>
                </article>
                <article className="admin-kpi-card">
                  <p className="admin-kpi-card__label">
                    {isArabic ? "كهرباء" : "Electricity"}
                  </p>
                  <p className="admin-kpi-card__value">
                    {workerToolsOverview.summary.anomaly}
                  </p>
                </article>
              </div>

              <h3>
                {isArabic ? "آخر إدخالات العمال" : "Recent worker submissions"}
              </h3>
              <TableShell>
                <TableBase className="admin-table">
                  <thead>
                    <tr>
                      <th>{copy.admin.id}</th>
                      <th>{isArabic ? "النوع" : "Feature"}</th>
                      <th>{copy.admin.name}</th>
                      <th>{isArabic ? "العنوان" : "Title"}</th>
                      <th>{isArabic ? "التفاصيل" : "Details"}</th>
                      <th>{copy.admin.calculatedAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerToolsOverview.items.slice(0, 150).map((item) => (
                      <tr key={`${item.feature}-${item.id}`}>
                        <td>{item.id}</td>
                        <td>{item.feature}</td>
                        <td>{item.worker_name}</td>
                        <td>{item.title}</td>
                        <td>{item.details}</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableBase>
              </TableShell>
            </>
          ) : null}
        </section>

        {!isWorkerToolsOnlyView ? (
          <>
            <section className="admin-section" id="dashboard-analytics">
              <div className="admin-section__head">
                <h2>{copy.admin.dashboardTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadDashboard()}
                >
                  {copy.refresh}
                </button>
              </div>
              {dashboardLoading ? <p>{copy.admin.loadingDashboard}</p> : null}
              {dashboardError ? (
                <div className="auth-alert auth-alert--error">
                  {dashboardError}
                </div>
              ) : null}
              {dashboardAnalytics ? (
                <div className="admin-kpi-grid">
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.totalUsers}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.totalUsers}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.activeUsers}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.activeUsers}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.totalMachines}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.totalMachines}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.operationalMachines}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.operationalMachines}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.totalShifts}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.totalShifts}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.todayTotalHours}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.todayTotalHours.toLocaleString()}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.thisMonthPayroll}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.thisMonthPayroll.toLocaleString()}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.productionToday}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.productionToday.toLocaleString()}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.inventoryItems}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.inventoryItems}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {copy.admin.lowStockItems}
                    </p>
                    <p className="admin-kpi-card__value">
                      {dashboardAnalytics.lowStockItems}
                    </p>
                  </article>
                </div>
              ) : null}
            </section>

            <section className="admin-section" id="settings-overview">
              <div className="admin-section__head">
                <h2>{copy.admin.settingsOverviewTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadSettingsOverview()}
                >
                  {copy.refresh}
                </button>
              </div>
              {settingsOverviewLoading ? (
                <p>{adminSettingsText.loadingOverview}</p>
              ) : null}
              {settingsOverviewError ? (
                <div className="auth-alert auth-alert--error">
                  {settingsOverviewError}
                </div>
              ) : null}
              {settingsOverview ? (
                <div className="admin-kpi-grid">
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.productionSettingsCount}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.productionSettingsCount}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.missingProductTypes}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.summary.missingProductTypes.length}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.hasSystemSetting}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.hasSystemSetting ? "1" : "0"}
                    </p>
                  </article>
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.latestSystemUpdatedAt}
                    </p>
                    <p className="admin-kpi-card__value admin-kpi-card__value--small">
                      {settingsOverview.latestSystemSetting?.updatedAt
                        ? new Date(
                            settingsOverview.latestSystemSetting.updatedAt,
                          ).toLocaleString()
                        : adminSettingsText.notAvailable}
                    </p>
                  </article>
                </div>
              ) : null}
              <div className="admin-grid">
                <article className="admin-panel">
                  <h3>{adminSettingsText.missingProductTypes}</h3>
                  <p>
                    {settingsOverview?.summary.missingProductTypes.length
                      ? settingsOverview.summary.missingProductTypes
                          .map((type) => getProductTypeLabel(type))
                          .join(", ")
                      : adminSettingsText.noMissing}
                  </p>
                </article>
                <article className="admin-panel">
                  <h3>{adminSettingsText.latestSystemUpdater}</h3>
                  <p>
                    {settingsOverview?.latestSystemSetting?.updatedBy
                      ? `${settingsOverview.latestSystemSetting.updatedBy.fullName} (@${settingsOverview.latestSystemSetting.updatedBy.username})`
                      : adminSettingsText.notAvailable}
                  </p>
                </article>
              </div>
            </section>

            <section className="admin-section" id="production">
              <div className="admin-section__head">
                <h2>{copy.admin.productionTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => {
                    void loadProductionSettings();
                    void loadSettingsOverview();
                  }}
                >
                  {copy.refresh}
                </button>
              </div>
              {productionLoading ? <p>{copy.admin.loadingProduction}</p> : null}
              {productionError ? (
                <div className="auth-alert auth-alert--error">
                  {productionError}
                </div>
              ) : null}
              <div className="admin-grid">
                {productionSettings.map((setting) => (
                  <article className="admin-panel" key={setting.id}>
                    <h3>{getProductTypeLabel(setting.productType)}</h3>
                    <label>
                      {copy.admin.productionPiecesPerCarton}
                      <input
                        type="number"
                        min={1}
                        defaultValue={setting.piecesPerCarton}
                        id={`pieces-${setting.productType}`}
                      />
                    </label>
                    <button
                      type="button"
                      className="auth-button"
                      onClick={() => {
                        const input = document.getElementById(
                          `pieces-${setting.productType}`,
                        ) as HTMLInputElement | null;
                        void handleUpdateProductionSetting(
                          setting.productType,
                          input?.value ?? String(setting.piecesPerCarton),
                        );
                      }}
                    >
                      {copy.admin.saveChanges}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-section" id="system">
              <div className="admin-section__head">
                <h2>{copy.admin.systemTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void loadSystemSettings()}
                >
                  {copy.refresh}
                </button>
              </div>
              {systemLoading ? <p>{copy.admin.loadingSystem}</p> : null}
              {systemError ? (
                <div className="auth-alert auth-alert--error">
                  {systemError}
                </div>
              ) : null}
              <div className="admin-form-grid">
                <label>
                  {copy.admin.qualityCheckIntervalMinutes}
                  <input
                    type="number"
                    min={1}
                    value={systemForm.qualityCheckIntervalMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        qualityCheckIntervalMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.qualityCheckReminderMinutes}
                  <input
                    type="number"
                    min={0}
                    value={systemForm.qualityCheckReminderMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        qualityCheckReminderMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.inventoryAuditFrequency}
                  <select
                    value={systemForm.inventoryAuditFrequency}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        inventoryAuditFrequency: event.target.value,
                      }))
                    }
                  >
                    <option value="DAILY">
                      {getAuditFrequencyLabel("DAILY")}
                    </option>
                    <option value="WEEKLY">
                      {getAuditFrequencyLabel("WEEKLY")}
                    </option>
                    <option value="MONTHLY">
                      {getAuditFrequencyLabel("MONTHLY")}
                    </option>
                  </select>
                </label>
                <label>
                  {copy.admin.shiftEndReminderMinutes}
                  <input
                    type="number"
                    min={1}
                    value={systemForm.shiftEndReminderMinutes}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        shiftEndReminderMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.weeklyReportDayOfWeek}
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={systemForm.weeklyReportDayOfWeek}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        weeklyReportDayOfWeek: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.weeklyReportTime}
                  <input
                    type="time"
                    value={systemForm.weeklyReportTime}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        weeklyReportTime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.monthlyReportDayOfMonth}
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={systemForm.monthlyReportDayOfMonth}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        monthlyReportDayOfMonth: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {copy.admin.monthlyReportTime}
                  <input
                    type="time"
                    value={systemForm.monthlyReportTime}
                    onChange={(event) =>
                      setSystemForm((prev) => ({
                        ...prev,
                        monthlyReportTime: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="admin-section__actions">
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => void handleSaveSystemSettings()}
                >
                  {copy.save}
                </button>
              </div>
              {systemSetting ? (
                <p className="admin-muted">
                  {copy.admin.systemSettingLoaded}: {systemSetting.id}
                </p>
              ) : null}
            </section>

            <section className="admin-section" id="chat">
              <div className="admin-section__head">
                <h2>{copy.admin.chatTab}</h2>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => navigate("/chat")}
                >
                  {copy.admin.openChat}
                </button>
              </div>
              <p className="admin-muted">{copy.admin.chatTabDescription}</p>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
