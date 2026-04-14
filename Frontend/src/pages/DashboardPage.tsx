import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Boxes,
  CalendarClock,
  ClipboardList,
  Factory,
  ShieldCheck,
} from "lucide-react";
import { authCopy } from "../content/authCopy";
import { appCopy } from "../content/appCopy";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { API_BASE_URL } from "../lib/api";

type DashboardAnalytics = {
  totalUsers: number;
  activeUsers: number;
  totalMachines: number;
  operationalMachines: number;
  totalShifts: number;
  productionToday: number;
  lowStockItems: number;
};

type QuickStats = {
  machineStatusBreakdown: Array<{ status: string; count: number }>;
};

type AttendanceRecord = {
  id: number;
  checkIn: string;
  checkOut: string | null;
  shift?: { id: number; name: string } | null;
};

type PayrollRecord = {
  id: number;
  month: string;
  totalSalary: number;
};

type ProductionItem = {
  id: number;
  createdAt: string;
};

type InventoryTransaction = {
  id: number;
  createdAt: string;
};

type WorkerSnapshot = {
  id: number;
  createdAt: string;
};

type Insight = {
  key: string;
  titleAr: string;
  titleEn: string;
  value: string;
  hintAr: string;
  hintEn: string;
  to: string;
};

type TaskItem = {
  key: string;
  textAr: string;
  textEn: string;
  to: string;
};

async function fetchWithAuth<T>(path: string): Promise<T | null> {
  try {
    const token = window.localStorage.getItem("plasticon_token");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const authText = authCopy[locale];
  const copy = appCopy[locale];

  const role = String(user?.role ?? "").toUpperCase();
  const isArabic = locale === "ar";
  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const isEngineer = role === "ENGINEER";
  const isWorker = role === "WORKER";
  const canAccessInventory = isAdmin || isAccountant;
  const canAccessReports = isAdmin || isAccountant;

  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dashboardAnalytics, setDashboardAnalytics] =
    useState<DashboardAnalytics | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [myProduction, setMyProduction] = useState<ProductionItem[]>([]);
  const [allProduction, setAllProduction] = useState<ProductionItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<
    InventoryTransaction[]
  >([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [workerSnapshots, setWorkerSnapshots] = useState<WorkerSnapshot[]>([]);
  const [workerToolsCount, setWorkerToolsCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const unread = await fetchWithAuth<{
      unreadCount?: number;
      count?: number;
    }>("/notifications/unread-count");
    const attendance =
      await fetchWithAuth<AttendanceRecord[]>("/attendance/me");
    const mineProduction =
      await fetchWithAuth<ProductionItem[]>("/production/me");
    const payroll = await fetchWithAuth<PayrollRecord[]>("/payroll/me");

    setUnreadNotifications(unread?.unreadCount ?? unread?.count ?? 0);
    setAttendanceRecords(attendance ?? []);
    setMyProduction(mineProduction ?? []);
    setPayrollRecords(payroll ?? []);

    if (isAdmin) {
      const [analytics, stats, allProd, inventory] = await Promise.all([
        fetchWithAuth<DashboardAnalytics>("/dashboard/analytics"),
        fetchWithAuth<QuickStats>("/dashboard/stats"),
        fetchWithAuth<ProductionItem[]>("/production/all"),
        fetchWithAuth<InventoryTransaction[]>("/inventory/transactions/all"),
      ]);
      setDashboardAnalytics(analytics);
      setQuickStats(stats);
      setAllProduction(allProd ?? []);
      setInventoryTransactions(inventory ?? []);
    } else if (isAccountant) {
      const [allProd, inventory] = await Promise.all([
        fetchWithAuth<ProductionItem[]>("/production/all"),
        fetchWithAuth<InventoryTransaction[]>("/inventory/transactions/all"),
      ]);
      setAllProduction(allProd ?? []);
      setInventoryTransactions(inventory ?? []);
    }

    if (isWorker) {
      const [
        snapshots,
        stopLogs,
        checklists,
        waste,
        targets,
        kaizenLogs,
        quality,
        micro,
        anomaly,
      ] = await Promise.all([
        fetchWithAuth<WorkerSnapshot[]>("/settings/snapshots/mine?limit=200"),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/machine-stop-alerts/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/shift-checklists/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/material-waste/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/daily-targets/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/kaizen/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/quality-issues/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/micro-stops/mine",
        ),
        fetchWithAuth<Array<Record<string, unknown>>>(
          "/worker-tools/electricity-anomaly-alerts/mine",
        ),
      ]);

      const toolTotal = [
        stopLogs,
        checklists,
        waste,
        targets,
        kaizenLogs,
        quality,
        micro,
        anomaly,
      ].reduce((sum, item) => sum + (Array.isArray(item) ? item.length : 0), 0);

      setWorkerSnapshots(snapshots ?? []);
      setWorkerToolsCount(toolTotal);
    }

    setLoading(false);
  }, [isAccountant, isAdmin, isWorker]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshKey]);

  const today = new Date().toISOString().slice(0, 10);

  const myTodayProductionCount = useMemo(
    () =>
      myProduction.filter((item) => item.createdAt.slice(0, 10) === today)
        .length,
    [myProduction, today],
  );

  const allTodayProductionCount = useMemo(
    () =>
      allProduction.filter((item) => item.createdAt.slice(0, 10) === today)
        .length,
    [allProduction, today],
  );

  const inventoryTodayCount = useMemo(
    () =>
      inventoryTransactions.filter(
        (item) => item.createdAt.slice(0, 10) === today,
      ).length,
    [inventoryTransactions, today],
  );

  const snapshotsTodayCount = useMemo(
    () =>
      workerSnapshots.filter((item) => item.createdAt.slice(0, 10) === today)
        .length,
    [workerSnapshots, today],
  );

  const latestAttendance = attendanceRecords[0] ?? null;
  const openAttendance =
    attendanceRecords.find((item) => item.checkOut === null) ?? null;

  const insights = useMemo(() => {
    const items: Insight[] = [];

    if (isAdmin) {
      items.push(
        {
          key: "users",
          titleAr: "المستخدمون النشطون",
          titleEn: "Active users",
          value: `${dashboardAnalytics?.activeUsers ?? 0}/${dashboardAnalytics?.totalUsers ?? 0}`,
          hintAr: "نسبة النشاط في النظام",
          hintEn: "System activity health",
          to: "/admin/users",
        },
        {
          key: "machines",
          titleAr: "حالة الماكينات",
          titleEn: "Machine operation",
          value: `${dashboardAnalytics?.operationalMachines ?? 0}/${dashboardAnalytics?.totalMachines ?? 0}`,
          hintAr: "جاهزية خطوط الإنتاج",
          hintEn: "Line readiness",
          to: "/admin/machines",
        },
        {
          key: "production",
          titleAr: "إنتاج اليوم",
          titleEn: "Today production",
          value: String(
            dashboardAnalytics?.productionToday ?? allTodayProductionCount,
          ),
          hintAr: "سجلات الإنتاج الحالية",
          hintEn: "Current production records",
          to: "/production",
        },
        {
          key: "inventory",
          titleAr: "مواد منخفضة",
          titleEn: "Low stock items",
          value: String(dashboardAnalytics?.lowStockItems ?? 0),
          hintAr: "تحتاج شراء أو تعويض",
          hintEn: "Require procurement action",
          to: "/inventory",
        },
      );
    } else if (isAccountant) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyPayroll = payrollRecords
        .filter((item) => item.month === thisMonth)
        .reduce((sum, item) => sum + item.totalSalary, 0);

      items.push(
        {
          key: "inventory",
          titleAr: "حركات المخزون اليوم",
          titleEn: "Inventory moves today",
          value: String(inventoryTodayCount),
          hintAr: "عمليات IN/OUT اليومية",
          hintEn: "Daily IN/OUT records",
          to: "/inventory",
        },
        {
          key: "production",
          titleAr: "إنتاج اليوم",
          titleEn: "Today production",
          value: String(allTodayProductionCount),
          hintAr: "إجمالي السجلات المضافة",
          hintEn: "Total records submitted",
          to: "/production",
        },
        {
          key: "payroll",
          titleAr: "رواتب هذا الشهر",
          titleEn: "Payroll this month",
          value: monthlyPayroll.toLocaleString(),
          hintAr: "ملف الرواتب الشهري",
          hintEn: "Monthly payroll output",
          to: "/my-payroll",
        },
        {
          key: "reports",
          titleAr: "مركز التقارير",
          titleEn: "Reporting center",
          value: copy.dashboard.reports,
          hintAr: "تقارير الحضور والإنتاج والرواتب",
          hintEn: "Attendance, production, payroll insights",
          to: "/reports",
        },
      );
    } else if (isEngineer) {
      items.push(
        {
          key: "production",
          titleAr: "إنتاجك اليوم",
          titleEn: "Your production today",
          value: String(myTodayProductionCount),
          hintAr: "عدد السجلات التي أضفتها",
          hintEn: "Records submitted by you",
          to: "/production",
        },
        {
          key: "attendance",
          titleAr: "حالة الدوام",
          titleEn: "Attendance state",
          value: openAttendance
            ? isArabic
              ? "داخل الدوام"
              : "Checked in"
            : isArabic
              ? "خارج الدوام"
              : "Checked out",
          hintAr: "تأكد من تسجيل الدخول/الخروج",
          hintEn: "Keep check-in/out updated",
          to: "/attendance",
        },
        {
          key: "notifications",
          titleAr: "إشعارات جديدة",
          titleEn: "New notifications",
          value: String(unreadNotifications),
          hintAr: "متابعة تنبيهات التشغيل",
          hintEn: "Track operations alerts",
          to: "/notifications",
        },
      );
    } else if (isWorker) {
      items.push(
        {
          key: "snapshots",
          titleAr: "قراءات اليوم",
          titleEn: "Readings today",
          value: String(snapshotsTodayCount),
          hintAr: "قراءات الماكينة والكهرباء",
          hintEn: "Machine and electricity entries",
          to: "/worker/snapshots",
        },
        {
          key: "tools",
          titleAr: "أدوات العامل",
          titleEn: "Worker tools entries",
          value: String(workerToolsCount),
          hintAr: "كل البلاغات والإدخالات",
          hintEn: "All submissions and logs",
          to: "/worker/tools",
        },
        {
          key: "production",
          titleAr: "إنتاجك اليوم",
          titleEn: "Your production today",
          value: String(myTodayProductionCount),
          hintAr: "سجلات الإنتاج المضافة",
          hintEn: "Added production records",
          to: "/production",
        },
      );
    }

    return items;
  }, [
    allTodayProductionCount,
    copy.dashboard.reports,
    dashboardAnalytics,
    inventoryTodayCount,
    isAccountant,
    isAdmin,
    isArabic,
    isEngineer,
    isWorker,
    myTodayProductionCount,
    openAttendance,
    payrollRecords,
    snapshotsTodayCount,
    unreadNotifications,
    workerToolsCount,
  ]);

  const tasks = useMemo(() => {
    const items: TaskItem[] = [];

    if (!openAttendance) {
      items.push({
        key: "checkin",
        textAr: "ابدأ الدوام قبل إدخال السجلات",
        textEn: "Start shift check-in before logging records",
        to: "/attendance",
      });
    }

    if ((isWorker || isEngineer) && myTodayProductionCount === 0) {
      items.push({
        key: "add-production",
        textAr: "أضف سجل إنتاج اليوم",
        textEn: "Add today's production record",
        to: "/production",
      });
    }

    if (isWorker && snapshotsTodayCount === 0) {
      items.push({
        key: "add-snapshot",
        textAr: "أضف قراءة العداد والكهرباء",
        textEn: "Add machine/electricity reading",
        to: "/worker/snapshots",
      });
    }

    if (isAccountant && inventoryTodayCount === 0) {
      items.push({
        key: "review-inventory",
        textAr: "راجع حركات المخزون اليوم",
        textEn: "Review today's inventory transactions",
        to: "/inventory",
      });
    }

    if (isAdmin && (dashboardAnalytics?.lowStockItems ?? 0) > 0) {
      items.push({
        key: "low-stock",
        textAr: "عندك مواد منخفضة تحتاج متابعة",
        textEn: "Low stock requires immediate review",
        to: "/inventory",
      });
    }

    if (unreadNotifications > 0) {
      items.push({
        key: "notifications",
        textAr: `لديك ${unreadNotifications} إشعار غير مقروء`,
        textEn: `${unreadNotifications} unread notifications to review`,
        to: "/notifications",
      });
    }

    return items;
  }, [
    dashboardAnalytics?.lowStockItems,
    inventoryTodayCount,
    isAccountant,
    isAdmin,
    isEngineer,
    isWorker,
    myTodayProductionCount,
    openAttendance,
    snapshotsTodayCount,
    unreadNotifications,
  ]);

  const shiftName =
    openAttendance?.shift?.name ?? latestAttendance?.shift?.name ?? "-";
  const shiftStart = openAttendance?.checkIn ?? latestAttendance?.checkIn;

  const machineStatsTotal =
    quickStats?.machineStatusBreakdown.reduce(
      (sum, item) => sum + item.count,
      0,
    ) ?? 0;

  return (
    <section className="dashboard-card dashboard-card--expanded grid gap-4">
      <Card className="border-[#EEEEEE] bg-gradient-to-r from-[#A2AF9B] to-[#DCCFC0] p-5 text-[#000000]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2e3d2a]">
              {isArabic ? "لوحة العمليات الذكية" : "Operations Intelligence"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#000000]">
              {isArabic
                ? "تحليل مباشر لكل شيء في النظام"
                : "Live analytics for every module"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-[#2e3d2a]">
              {isArabic
                ? "داشبورد ديناميكي حسب الدور: إنتاج، مخزون، تقارير، إشعارات، حضور ورواتب مع توصيات عمل فورية."
                : "Dynamic role-based dashboard for production, inventory, reports, notifications, attendance, and payroll with action recommendations."}
            </p>
          </div>

          <Button
            variant="secondary"
            className="border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            {loading ? copy.load : copy.refreshAll}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{user?.name ?? authText.dashboardUserFallback}</Badge>
          <Badge tone="soft">
            {user?.email ?? authText.dashboardEmailFallback}
          </Badge>
          <Badge tone="accent">
            {user?.role ?? authText.dashboardRoleFallback}
          </Badge>
        </div>
      </Card>

      <div className="dashboard-layout grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.88fr)]">
        <Card className="p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#5F6659]">
              {isArabic ? "تحليلات مرتبطة بالأزرار" : "Button-linked analytics"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.to)}
                className="rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-4 text-start transition hover:-translate-y-0.5 hover:border-[#A2AF9B]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5F6659]">
                  {isArabic ? item.titleAr : item.titleEn}
                </p>
                <p className="mt-2 text-2xl font-black text-[#000000]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[#5F6659]">
                  {isArabic ? item.hintAr : item.hintEn}
                </p>
              </button>
            ))}
          </div>

          {isAdmin &&
          quickStats &&
          quickStats.machineStatusBreakdown.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-[#EEEEEE] bg-[#FAF9EE] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Factory
                  className="h-4 w-4 text-[#5F6659]"
                  aria-hidden="true"
                />
                <p className="text-sm font-bold text-[#000000]">
                  {isArabic ? "نسب تشغيل الماكينات" : "Machine status ratios"}
                </p>
              </div>
              <div className="grid gap-2">
                {quickStats.machineStatusBreakdown.map((item) => {
                  const ratio =
                    machineStatsTotal > 0
                      ? Math.round((item.count / machineStatsTotal) * 100)
                      : 0;
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#5F6659]">
                        <span>{item.status}</span>
                        <span>{ratio}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#EEEEEE]">
                        <div
                          className="h-2 rounded-full bg-[#A2AF9B]"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList
                className="h-4 w-4 text-[#5F6659]"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-[#000000]">
                {isArabic ? "ماذا يجب أن تعمل الآن" : "What to do now"}
              </p>
            </div>
            <div className="grid gap-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <button
                    key={task.key}
                    type="button"
                    className="flex items-center justify-between rounded-xl border border-[#EEEEEE] bg-[#FAF9EE] px-3 py-2 text-start text-sm font-semibold text-[#000000]"
                    onClick={() => navigate(task.to)}
                  >
                    <span>{isArabic ? task.textAr : task.textEn}</span>
                    <span className="text-xs text-[#5F6659]">
                      {isArabic ? "فتح" : "Open"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm font-semibold text-[#5F6659]">
                  {isArabic ? "وضعك ممتاز حاليا" : "Everything is on track"}
                </p>
              )}
            </div>
          </div>
        </Card>

        <aside>
          <Card className="border-[#EEEEEE] bg-[#FFFFFF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 text-[#5F6659]"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-[#000000]">
                {isArabic ? "معلومات المستخدم" : "User info"}
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="rounded-xl border border-[#EEEEEE] bg-[#FAF9EE] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5F6659]">
                  {isArabic ? "الاسم" : "Name"}
                </p>
                <strong>{user?.name ?? authText.dashboardUserFallback}</strong>
              </div>
              <div className="rounded-xl border border-[#EEEEEE] bg-[#FAF9EE] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5F6659]">
                  {isArabic ? "الشفت" : "Shift"}
                </p>
                <strong>{shiftName}</strong>
              </div>
              <div className="rounded-xl border border-[#EEEEEE] bg-[#FAF9EE] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5F6659]">
                  {isArabic ? "بداية الدوام" : "Shift start"}
                </p>
                <strong>
                  {shiftStart ? new Date(shiftStart).toLocaleString() : "-"}
                </strong>
              </div>
            </div>
          </Card>

          <Card className="mt-4 border-[#EEEEEE] bg-[#FFFFFF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock
                className="h-4 w-4 text-[#5F6659]"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-[#000000]">
                {isArabic ? "ملخص حمل اليوم" : "Today workload"}
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-[#EEEEEE] px-3 py-2">
                <span className="text-[#5F6659]">
                  {isArabic ? "الإنتاج اليوم" : "Production today"}
                </span>
                <strong>{myTodayProductionCount}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#EEEEEE] px-3 py-2">
                <span className="text-[#5F6659]">
                  {isArabic ? "حركات المخزون اليوم" : "Inventory updates"}
                </span>
                <strong>{inventoryTodayCount}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#EEEEEE] px-3 py-2">
                <span className="text-[#5F6659]">
                  {isArabic ? "الإشعارات" : "Notifications"}
                </span>
                <strong>{unreadNotifications}</strong>
              </div>
            </div>
          </Card>

          <Card className="mt-4 border-[#EEEEEE] bg-[#FFFFFF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#5F6659]" aria-hidden="true" />
              <p className="text-sm font-bold text-[#000000]">
                {isArabic ? "تنقل سريع" : "Quick actions"}
              </p>
            </div>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]"
                onClick={() => navigate("/production")}
              >
                <Factory className="h-4 w-4" aria-hidden="true" />
                {copy.dashboard.production}
              </Button>

              {canAccessInventory ? (
                <Button
                  variant="outline"
                  className="justify-start border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]"
                  onClick={() => navigate("/inventory")}
                >
                  <Boxes className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.inventory}
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="justify-start border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {copy.dashboard.notifications}
              </Button>

              {canAccessReports ? (
                <Button
                  variant="outline"
                  className="justify-start border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]"
                  onClick={() => navigate("/reports")}
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.reports}
                </Button>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
}
