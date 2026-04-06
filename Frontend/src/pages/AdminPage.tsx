import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

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

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  return response;
}

export function AdminPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const requestedTab = searchParams.get("tab");
  const initialTab:
    | "users"
    | "attendance"
    | "payroll"
    | "settingsOverview"
    | "production"
    | "system" =
    requestedTab === "attendance" ||
    requestedTab === "payroll" ||
    requestedTab === "settingsOverview" ||
    requestedTab === "production" ||
    requestedTab === "system" ||
    requestedTab === "users"
      ? requestedTab
      : "users";
  const [tab, setTab] = useState<
    | "users"
    | "attendance"
    | "payroll"
    | "settingsOverview"
    | "production"
    | "system"
  >(initialTab);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUserChanges, setPendingUserChanges] = useState<
    Record<number, { role: AdminUser["role"]; isActive: boolean }>
  >({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

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

  const adminSettingsText = useMemo(
    () =>
      isArabic
        ? {
            overview: "ملخص الإعدادات",
            productionSettingsCount: "عدد إعدادات الإنتاج",
            missingProductTypes: "أنواع المنتجات الناقصة",
            noMissing: "لا يوجد أنواع ناقصة",
            hasSystemSetting: "يوجد إعداد نظام",
            latestSystemUpdater: "آخر من حدّث إعداد النظام",
            updatedBy: "تم التحديث بواسطة",
            updatedAt: "آخر تحديث",
            notAvailable: "غير متوفر",
            loadingOverview: "جارٍ تحميل ملخص الإعدادات...",
            failedOverview: "فشل تحميل ملخص الإعدادات",
            complete: "مكتمل",
            missing: "ناقص",
            latestSystemUpdatedAt: "وقت آخر تحديث للنظام",
            noSystemSetting: "لا يوجد إعداد نظام حتى الآن",
          }
        : {
            overview: "Settings overview",
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
            tab: "الحضور والغياب",
            title: "الحضور والغياب",
            todayAttendance: "حضور اليوم",
            todayAbsence: "غياب اليوم",
            openShifts: "دوام مفتوح",
            lateCases: "حالات تأخير",
            recentAttendances: "آخر سجلات الحضور",
            loading: "جارٍ تحميل الحضور...",
            noData: "لا توجد سجلات حضور",
            status: "الحالة",
            checkedOut: "انتهى الدوام",
            checkedIn: "داخل الدوام",
            checkIn: "دخول",
            checkOut: "خروج",
            shift: "الشفت",
          }
        : {
            tab: "Attendance & Absence",
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
            tab: "الرواتب",
            title: "الرواتب",
            totalPayrolls: "عدد سجلات الرواتب",
            totalBaseSalary: "إجمالي الراتب الأساسي",
            totalOvertimeSalary: "إجمالي بدل الإضافي",
            totalPayout: "إجمالي المدفوعات",
            byRole: "حسب الدور",
            recentPayrolls: "آخر الرواتب",
            loading: "جارٍ تحميل الرواتب...",
            noData: "لا توجد بيانات رواتب",
          }
        : {
            tab: "Payroll",
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

  const loadUsers = async () => {
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
  };

  const loadProductionSettings = async () => {
    setProductionLoading(true);
    setProductionError("");
    try {
      const response = await fetchWithAdminAuth("/settings/production");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as ProductionSetting[];
      setProductionSettings(data);
    } catch (error) {
      setProductionError(
        error instanceof Error
          ? error.message
          : "Failed to load production settings",
      );
    } finally {
      setProductionLoading(false);
    }
  };

  const loadSystemSettings = async () => {
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
  };

  const loadSettingsOverview = async () => {
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

        const synthesizedOverview: SettingsAdminOverview = {
          productionSettingsCount: productionData.length,
          hasSystemSetting: Boolean(systemData),
          productionSettings: productionData,
          latestSystemSetting: systemData,
          summary: {
            missingProductTypes,
          },
        };

        setSettingsOverview(synthesizedOverview);
        setProductionSettings(productionData);

        if (systemData) {
          setSystemSetting(systemData);
          setSystemForm({
            qualityCheckIntervalMinutes: String(
              systemData.qualityCheckIntervalMinutes,
            ),
            qualityCheckReminderMinutes: String(
              systemData.qualityCheckReminderMinutes,
            ),
            inventoryAuditFrequency: systemData.inventoryAuditFrequency,
            shiftEndReminderMinutes: String(systemData.shiftEndReminderMinutes),
            weeklyReportDayOfWeek: String(systemData.weeklyReportDayOfWeek),
            weeklyReportTime: systemData.weeklyReportTime,
            monthlyReportDayOfMonth: String(systemData.monthlyReportDayOfMonth),
            monthlyReportTime: systemData.monthlyReportTime,
          });
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

          const synthesizedOverview: SettingsAdminOverview = {
            productionSettingsCount: productionData.length,
            hasSystemSetting: Boolean(systemData),
            productionSettings: productionData,
            latestSystemSetting: systemData,
            summary: {
              missingProductTypes,
            },
          };

          setSettingsOverview(synthesizedOverview);
          setProductionSettings(productionData);

          if (systemData) {
            setSystemSetting(systemData);
            setSystemForm({
              qualityCheckIntervalMinutes: String(
                systemData.qualityCheckIntervalMinutes,
              ),
              qualityCheckReminderMinutes: String(
                systemData.qualityCheckReminderMinutes,
              ),
              inventoryAuditFrequency: systemData.inventoryAuditFrequency,
              shiftEndReminderMinutes: String(
                systemData.shiftEndReminderMinutes,
              ),
              weeklyReportDayOfWeek: String(systemData.weeklyReportDayOfWeek),
              weeklyReportTime: systemData.weeklyReportTime,
              monthlyReportDayOfMonth: String(
                systemData.monthlyReportDayOfMonth,
              ),
              monthlyReportTime: systemData.monthlyReportTime,
            });
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
        setSystemForm({
          qualityCheckIntervalMinutes: String(
            data.latestSystemSetting.qualityCheckIntervalMinutes,
          ),
          qualityCheckReminderMinutes: String(
            data.latestSystemSetting.qualityCheckReminderMinutes,
          ),
          inventoryAuditFrequency:
            data.latestSystemSetting.inventoryAuditFrequency,
          shiftEndReminderMinutes: String(
            data.latestSystemSetting.shiftEndReminderMinutes,
          ),
          weeklyReportDayOfWeek: String(
            data.latestSystemSetting.weeklyReportDayOfWeek,
          ),
          weeklyReportTime: data.latestSystemSetting.weeklyReportTime,
          monthlyReportDayOfMonth: String(
            data.latestSystemSetting.monthlyReportDayOfMonth,
          ),
          monthlyReportTime: data.latestSystemSetting.monthlyReportTime,
        });
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
  };

  const loadAttendanceData = async () => {
    setAttendanceLoading(true);
    setAttendanceError("");
    try {
      const response = await fetchWithAdminAuth("/attendance/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as AttendanceRecord[];
      setAttendanceRecords(data ?? []);
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : attendanceText.loading,
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadPayrollData = async () => {
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

      const overviewData =
        (await overviewResponse.json()) as PayrollAdminOverview;
      const listData = (await listResponse.json()) as PayrollRecord[];

      setPayrollOverview(overviewData);
      setPayrollRecords(listData ?? []);
    } catch (error) {
      setPayrollError(
        error instanceof Error ? error.message : payrollText.loading,
      );
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadProductionSettings();
    void loadSystemSettings();
    void loadSettingsOverview();
    void loadAttendanceData();
    void loadPayrollData();
  }, []);

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
            ? {
                ...userItem,
                deletedAt: new Date().toISOString(),
              }
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
          headers: {
            "Content-Type": "application/json",
          },
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
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  const handleTabChange = (
    nextTab:
      | "users"
      | "attendance"
      | "payroll"
      | "settingsOverview"
      | "production"
      | "system",
  ) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{copy.admin.title}</h1>
            <p>{copy.admin.subtitle}</p>
          </div>
          <div className="admin-header__actions">
            <span className="admin-role-badge">
              {roleBadge === "UNKNOWN"
                ? roleBadge
                : getRoleLabel(roleBadge as AdminUser["role"])}
            </span>
            <LocaleSwitch />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={handleSignOut}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <nav className="admin-tabs">
          <button
            type="button"
            className={tab === "users" ? "is-active" : ""}
            onClick={() => handleTabChange("users")}
          >
            {copy.admin.usersTab}
          </button>
          <button
            type="button"
            className={tab === "attendance" ? "is-active" : ""}
            onClick={() => handleTabChange("attendance")}
          >
            {attendanceText.tab}
          </button>
          <button
            type="button"
            className={tab === "payroll" ? "is-active" : ""}
            onClick={() => handleTabChange("payroll")}
          >
            {payrollText.tab}
          </button>
          <button
            type="button"
            className={tab === "settingsOverview" ? "is-active" : ""}
            onClick={() => handleTabChange("settingsOverview")}
          >
            {copy.admin.settingsOverviewTab}
          </button>
          <button
            type="button"
            className={tab === "production" ? "is-active" : ""}
            onClick={() => handleTabChange("production")}
          >
            {copy.admin.productionTab}
          </button>
          <button
            type="button"
            className={tab === "system" ? "is-active" : ""}
            onClick={() => handleTabChange("system")}
          >
            {copy.admin.systemTab}
          </button>
        </nav>

        {tab === "users" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <h2>{copy.admin.usersTitle}</h2>
              <button
                type="button"
                className="auth-button"
                onClick={() => void loadUsers()}
              >
                {copy.refresh}
              </button>
            </div>

            {usersLoading ? <p>{copy.admin.loadingUsers}</p> : null}
            {usersError ? (
              <div className="auth-alert auth-alert--error">{usersError}</div>
            ) : null}

            <div className="admin-table-wrap">
              <table className="admin-table">
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
                          value={pendingUserChanges[item.id]?.role ?? item.role}
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
                          <option value="ADMIN">{getRoleLabel("ADMIN")}</option>
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
                            if (!pending) {
                              return;
                            }

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

                                if (!roleResponse.ok) {
                                  throw new Error(
                                    await readApiError(roleResponse),
                                  );
                                }

                                const updateResponse = await fetchWithAdminAuth(
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

                                if (!updateResponse.ok) {
                                  throw new Error(
                                    await readApiError(updateResponse),
                                  );
                                }

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
              </table>
            </div>
          </section>
        ) : null}

        {tab === "attendance" ? (
          <section className="admin-section">
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
            <div className="admin-table-wrap">
              <table className="admin-table">
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
                        {record.user?.fullName || record.user?.username || "-"}
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
              </table>
            </div>

            {!attendanceLoading && attendanceRecords.length === 0 ? (
              <p className="admin-muted">{attendanceText.noData}</p>
            ) : null}
          </section>
        ) : null}

        {tab === "payroll" ? (
          <section className="admin-section">
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
              <div className="auth-alert auth-alert--error">{payrollError}</div>
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
                  {(payrollOverview?.totals.totalPayout ?? 0).toLocaleString()}
                </p>
              </article>
            </div>

            <div className="admin-grid">
              <article className="admin-panel">
                <h3>{payrollText.byRole}</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
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
                  </table>
                </div>
              </article>

              <article className="admin-panel">
                <h3>{payrollText.recentPayrolls}</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
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
                            {item.user?.fullName || item.user?.username || "-"}
                          </td>
                          <td>{item.user?.role || "-"}</td>
                          <td>{item.month}</td>
                          <td>{item.totalSalary.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            {!payrollLoading && payrollRecords.length === 0 ? (
              <p className="admin-muted">{payrollText.noData}</p>
            ) : null}
          </section>
        ) : null}

        {tab === "settingsOverview" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <h2>{copy.admin.settingsOverviewTab}</h2>
              <button
                type="button"
                className="auth-button"
                onClick={() => {
                  void loadSettingsOverview();
                }}
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
              <>
                <div className="admin-kpi-grid">
                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.productionSettingsCount}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.productionSettingsCount}
                    </p>
                    <p className="admin-kpi-card__status">
                      {settingsOverview.productionSettingsCount > 0
                        ? adminSettingsText.complete
                        : adminSettingsText.missing}
                    </p>
                  </article>

                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.missingProductTypes}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.summary.missingProductTypes.length}
                    </p>
                    <p className="admin-kpi-card__status">
                      {settingsOverview.summary.missingProductTypes.length === 0
                        ? adminSettingsText.complete
                        : adminSettingsText.missing}
                    </p>
                  </article>

                  <article className="admin-kpi-card">
                    <p className="admin-kpi-card__label">
                      {adminSettingsText.hasSystemSetting}
                    </p>
                    <p className="admin-kpi-card__value">
                      {settingsOverview.hasSystemSetting ? "1" : "0"}
                    </p>
                    <p className="admin-kpi-card__status">
                      {settingsOverview.hasSystemSetting
                        ? adminSettingsText.complete
                        : adminSettingsText.missing}
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
                    <p className="admin-kpi-card__status">
                      {settingsOverview.latestSystemSetting
                        ? adminSettingsText.complete
                        : adminSettingsText.missing}
                    </p>
                  </article>
                </div>

                <div className="admin-grid">
                  <article className="admin-panel">
                    <h3>{adminSettingsText.missingProductTypes}</h3>
                    <p>
                      {settingsOverview.summary.missingProductTypes.length > 0
                        ? settingsOverview.summary.missingProductTypes
                            .map((type) => getProductTypeLabel(type))
                            .join(", ")
                        : adminSettingsText.noMissing}
                    </p>
                  </article>

                  <article className="admin-panel">
                    <h3>{adminSettingsText.latestSystemUpdater}</h3>
                    <p>
                      {settingsOverview.latestSystemSetting?.updatedBy
                        ? `${settingsOverview.latestSystemSetting.updatedBy.fullName} (@${settingsOverview.latestSystemSetting.updatedBy.username})`
                        : adminSettingsText.notAvailable}
                    </p>
                    <p>
                      {settingsOverview.latestSystemSetting
                        ? `${adminSettingsText.updatedAt}: ${settingsOverview.latestSystemSetting.updatedAt ? new Date(settingsOverview.latestSystemSetting.updatedAt).toLocaleString() : adminSettingsText.notAvailable}`
                        : adminSettingsText.noSystemSetting}
                    </p>
                  </article>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {tab === "production" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <h2>{copy.admin.productionTitle}</h2>
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
                  <p>{copy.admin.productionPiecesPerCarton}</p>
                  <p>
                    {adminSettingsText.updatedBy}:{" "}
                    {setting.updatedBy
                      ? `${setting.updatedBy.fullName} (@${setting.updatedBy.username})`
                      : adminSettingsText.notAvailable}
                  </p>
                  <p>
                    {adminSettingsText.updatedAt}:{" "}
                    {setting.updatedAt
                      ? new Date(setting.updatedAt).toLocaleString()
                      : adminSettingsText.notAvailable}
                  </p>
                  <div className="admin-inline-form">
                    <input
                      type="number"
                      min={1}
                      defaultValue={setting.piecesPerCarton}
                      id={`pieces-${setting.productType}`}
                    />
                    <button
                      type="button"
                      className="auth-button"
                      onClick={() => {
                        const element = document.getElementById(
                          `pieces-${setting.productType}`,
                        ) as HTMLInputElement | null;
                        if (!element) return;
                        void handleUpdateProductionSetting(
                          setting.productType,
                          element.value,
                        );
                      }}
                    >
                      {copy.save}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "system" ? (
          <section className="admin-section">
            <div className="admin-section__head">
              <h2>{copy.admin.systemTitle}</h2>
              <button
                type="button"
                className="auth-button"
                onClick={() => {
                  void loadSystemSettings();
                  void loadSettingsOverview();
                }}
              >
                {copy.refresh}
              </button>
            </div>

            {systemLoading ? <p>{copy.admin.loadingSystem}</p> : null}
            {systemError ? (
              <div className="auth-alert auth-alert--error">{systemError}</div>
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
        ) : null}
      </section>
    </main>
  );
}
