import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

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

type QuickStats = {
  machineStatusBreakdown: Array<{ status: string; count: number }>;
  userRoleBreakdown: Array<{ role: string; count: number }>;
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

export function DashboardAnalyticsPage() {
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [dashboardAnalytics, setDashboardAnalytics] =
    useState<DashboardAnalytics | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageText = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "لوحة التحليلات",
            loading: "جارٍ تحميل التحليلات...",
            noData: "لا توجد بيانات تحليلات",
          }
        : {
            title: "Dashboard Analytics",
            loading: "Loading analytics...",
            noData: "No analytics available",
          },
    [locale],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/dashboard/analytics");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setDashboardAnalytics((await response.json()) as DashboardAnalytics);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : pageText.loading,
      );
    } finally {
      setLoading(false);
    }
  }, [pageText.loading]);

  const loadQuickStats = useCallback(async () => {
    try {
      const response = await fetchWithAdminAuth("/dashboard/stats");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setQuickStats((await response.json()) as QuickStats);
    } catch (statsError) {
      console.error(statsError);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadQuickStats();
  }, [loadDashboard, loadQuickStats]);

  const chartData = useMemo(() => {
    if (!dashboardAnalytics) {
      return null;
    }

    const bars = [
      { key: copy.admin.totalUsers, value: dashboardAnalytics.totalUsers },
      { key: copy.admin.activeUsers, value: dashboardAnalytics.activeUsers },
      {
        key: copy.admin.totalMachines,
        value: dashboardAnalytics.totalMachines,
      },
      {
        key: copy.admin.operationalMachines,
        value: dashboardAnalytics.operationalMachines,
      },
      { key: copy.admin.totalShifts, value: dashboardAnalytics.totalShifts },
      {
        key: copy.admin.lowStockItems,
        value: dashboardAnalytics.lowStockItems,
      },
    ];

    const maxValue = Math.max(...bars.map((item) => item.value), 1);
    const machineTotal = Math.max(dashboardAnalytics.totalMachines, 1);
    const operationalShare = Math.round(
      (dashboardAnalytics.operationalMachines / machineTotal) * 100,
    );

    return {
      bars,
      maxValue,
      operationalShare,
    };
  }, [
    copy.admin.activeUsers,
    copy.admin.lowStockItems,
    copy.admin.operationalMachines,
    copy.admin.totalMachines,
    copy.admin.totalShifts,
    copy.admin.totalUsers,
    dashboardAnalytics,
  ]);

  const quickStatsCharts = useMemo(() => {
    if (!quickStats) {
      return null;
    }

    const machineMax = Math.max(
      ...quickStats.machineStatusBreakdown.map((item) => item.count),
      1,
    );
    const roleMax = Math.max(
      ...quickStats.userRoleBreakdown.map((item) => item.count),
      1,
    );

    return { machineMax, roleMax };
  }, [quickStats]);

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{pageText.title}</h1>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2>{pageText.title}</h2>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadDashboard()}
            >
              {copy.refresh}
            </button>
          </div>

          {loading ? <p>{pageText.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}

          {dashboardAnalytics ? (
            <div style={{ display: "grid", gap: "16px" }}>
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

              {chartData ? (
                <div className="admin-grid">
                  <article className="admin-panel">
                    <h3>
                      {locale === "ar" ? "مخطط المقارنة" : "Comparison Chart"}
                    </h3>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {chartData.bars.map((item) => (
                        <div key={item.key}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "4px",
                            }}
                          >
                            <span>{item.key}</span>
                            <strong>{item.value}</strong>
                          </div>
                          <div
                            style={{
                              height: "10px",
                              borderRadius: "999px",
                              background: "rgba(220, 207, 192, 0.22)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(item.value / chartData.maxValue) * 100}%`,
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, #A2AF9B, #DCCFC0)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="admin-panel">
                    <h3>
                      {locale === "ar" ? "مخطط التشغيل" : "Operational Diagram"}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "150px",
                          height: "150px",
                          borderRadius: "50%",
                          background: `conic-gradient(#DCCFC0 ${chartData.operationalShare}%, #EEEEEE ${chartData.operationalShare}% 100%)`,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: "22px",
                            background: "#FAF9EE",
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700,
                          }}
                        >
                          {chartData.operationalShare}%
                        </div>
                      </div>
                      <p className="admin-muted">
                        {locale === "ar"
                          ? "نسبة الماكينات التشغيلية"
                          : "Operational machine ratio"}
                      </p>
                    </div>
                  </article>
                </div>
              ) : null}

              {quickStats && quickStatsCharts ? (
                <div className="admin-grid">
                  <article className="admin-panel">
                    <h3>
                      {locale === "ar" ? "حالة الماكينات" : "Machine Status"}
                    </h3>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {quickStats.machineStatusBreakdown.map((item) => (
                        <div key={item.status}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "4px",
                            }}
                          >
                            <span>{item.status}</span>
                            <strong>{item.count}</strong>
                          </div>
                          <div
                            style={{
                              height: "10px",
                              borderRadius: "999px",
                              background: "rgba(220, 207, 192, 0.22)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(item.count / quickStatsCharts.machineMax) * 100}%`,
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, #DCCFC0, #EEEEEE)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="admin-panel">
                    <h3>
                      {locale === "ar" ? "أدوار المستخدمين" : "User Roles"}
                    </h3>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {quickStats.userRoleBreakdown.map((item) => (
                        <div key={item.role}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "4px",
                            }}
                          >
                            <span>{item.role}</span>
                            <strong>{item.count}</strong>
                          </div>
                          <div
                            style={{
                              height: "10px",
                              borderRadius: "999px",
                              background: "rgba(220, 207, 192, 0.22)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(item.count / quickStatsCharts.roleMax) * 100}%`,
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, #A2AF9B, #DCCFC0)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              ) : null}
            </div>
          ) : !loading ? (
            <p className="admin-muted">{pageText.noData}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
