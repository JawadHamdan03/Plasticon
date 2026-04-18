import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Settings,
  Users,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

type DailyRecord = {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  user: { id: number; fullName: string; role: string };
  attendance: { checkIn: string; checkOut: string | null } | null;
  confirmedBy: { fullName: string } | null;
};

type SalaryConfig = { id: number; role: string; monthlySalary: number };

type MonthlyPayroll = {
  id: number;
  month: string;
  totalSalary: number;
  totalHours?: number;
  user?: { fullName: string; role: string };
};

type Overview = {
  totals: {
    payrollCount: number;
    totalBaseSalary: number;
    totalOvertimeSalary: number;
    totalPayout: number;
  };
  byRole: { role: string; payrollCount: number; totalPayout: number }[];
};

async function api(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.headers ?? {}),
    },
  });
}

function fmtTime(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}
function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

const ROLE_COLORS: Record<string, string> = {
  WORKER: "var(--blue-600)",
  ENGINEER: "var(--green-600)",
  ACCOUNTANT: "var(--orange-500)",
  ADMIN: "var(--red-600)",
};

export function PayrollAdminPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";
  const isAdmin = user?.role === "ADMIN";

  const [tab, setTab] = useState<"daily" | "monthly" | "config">("daily");
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [dateFilter, setDateFilter] = useState(defaultDate);

  // Daily payroll state
  const [daily, setDaily] = useState<DailyRecord[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Monthly/overview state
  const [overview, setOverview] = useState<Overview | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyPayroll[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState("");

  // Salary config state
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [editConfig, setEditConfig] = useState<{
    role: string;
    value: string;
  } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Calculate daily payroll
  const [calcAttId, setCalcAttId] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [calcMsg, setCalcMsg] = useState("");

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setDailyError("");
    try {
      const res = await api(`/payroll/daily?date=${dateFilter}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setDaily((await res.json()) as DailyRecord[]);
    } catch (e) {
      setDailyError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDailyLoading(false);
    }
  }, [dateFilter]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setMonthlyError("");
    try {
      const [or, lr] = await Promise.all([
        api("/payroll/admin/overview"),
        api("/payroll"),
      ]);
      if (!or.ok) throw new Error(await readApiError(or));
      if (!lr.ok) throw new Error(await readApiError(lr));
      setOverview(await or.json());
      setMonthlyRecords(await lr.json());
    } catch (e) {
      setMonthlyError(e instanceof Error ? e.message : "Failed");
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api("/payroll/salary-config");
      if (res.ok) setConfigs(await res.json());
    } catch {
      /* ignore */
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "daily") void loadDaily();
    if (tab === "monthly") void loadMonthly();
    if (tab === "config") void loadConfigs();
  }, [tab, loadDaily, loadMonthly, loadConfigs]);

  const confirmRecord = async (id: number) => {
    setConfirmingId(id);
    try {
      const res = await api(`/payroll/daily/${id}/confirm`, { method: "POST" });
      if (!res.ok) {
        window.alert(await readApiError(res));
        return;
      }
      setDaily((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, isConfirmed: true, confirmedAt: new Date().toISOString() }
            : r,
        ),
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setConfirmingId(null);
    }
  };

  const calculateDaily = async () => {
    const id = Number(calcAttId.trim());
    if (!id) {
      setCalcMsg("Enter a valid attendance ID");
      return;
    }
    setCalculating(true);
    setCalcMsg("");
    try {
      const res = await api("/payroll/daily/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCalcMsg(data.message ?? "Error");
        return;
      }
      setCalcMsg(isAr ? "تم الحساب بنجاح" : "Calculated successfully");
      setCalcAttId("");
      void loadDaily();
    } catch (e) {
      setCalcMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setCalculating(false);
    }
  };

  const saveConfig = async () => {
    if (!editConfig) return;
    setSavingConfig(true);
    try {
      const res = await api("/payroll/salary-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editConfig.role,
          monthlySalary: Number(editConfig.value),
        }),
      });
      if (!res.ok) {
        window.alert(await readApiError(res));
        return;
      }
      await loadConfigs();
      setEditConfig(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingConfig(false);
    }
  };

  const pendingCount = useMemo(
    () => daily.filter((r) => !r.isConfirmed).length,
    [daily],
  );
  const confirmedCount = useMemo(
    () => daily.filter((r) => r.isConfirmed).length,
    [daily],
  );
  const dailyTotal = useMemo(
    () => daily.reduce((s, r) => s + r.totalDailyPay, 0),
    [daily],
  );

  const tabs = [
    { key: "daily", label: isAr ? "الرواتب اليومية" : "Daily Payroll" },
    { key: "monthly", label: isAr ? "الملخص الشهري" : "Monthly Summary" },
    { key: "config", label: isAr ? "إعداد الرواتب" : "Salary Config" },
  ] as const;

  return (
    <ModulePageShell
      title={isAr ? "إدارة الرواتب" : "Payroll Management"}
      subtitle={
        isAr
          ? "تأكيد الرواتب اليومية وعرض التقارير الشهرية."
          : "Confirm daily payrolls and view monthly reports."
      }
      actions={
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            if (tab === "daily") void loadDaily();
            if (tab === "monthly") void loadMonthly();
            if (tab === "config") void loadConfigs();
          }}
        >
          <RefreshCw size={14} />
          {isAr ? "تحديث" : "Refresh"}
        </button>
      }
    >
      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: "1.5rem" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`admin-tab${tab === t.key ? " admin-tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "daily" && pendingCount > 0 && (
              <span
                className="badge badge--warning"
                style={{ marginInlineStart: ".5rem", fontSize: ".7rem" }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DAILY PAYROLL TAB ── */}
      {tab === "daily" && (
        <>
          {/* Summary row */}
          <div
            className="payroll-summary-cards"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="payroll-summary-card payroll-summary-card--orange">
              <div className="payroll-summary-card__icon">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="payroll-summary-card__label">
                  {isAr ? "قيد الانتظار" : "Pending"}
                </p>
                <p className="payroll-summary-card__value">{pendingCount}</p>
              </div>
            </div>
            <div className="payroll-summary-card payroll-summary-card--green">
              <div className="payroll-summary-card__icon">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="payroll-summary-card__label">
                  {isAr ? "مؤكد" : "Confirmed"}
                </p>
                <p className="payroll-summary-card__value">{confirmedCount}</p>
              </div>
            </div>
            <div className="payroll-summary-card">
              <div className="payroll-summary-card__icon">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="payroll-summary-card__label">
                  {isAr ? "إجمالي اليوم" : "Day Total"}
                </p>
                <p className="payroll-summary-card__value">
                  {dailyTotal.toFixed(2)} NIS
                </p>
              </div>
            </div>
          </div>

          {/* Filter + calculate row */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
              alignItems: "flex-end",
            }}
          >
            <div className="field" style={{ flex: "0 0 auto" }}>
              <label className="field__label">{isAr ? "تاريخ" : "Date"}</label>
              <input
                type="date"
                className="field__control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: "180px" }}
              />
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => void loadDaily()}
            >
              {isAr ? "بحث" : "Search"}
            </button>
            <div style={{ flex: 1 }} />
            <div className="field" style={{ flex: "0 0 auto" }}>
              <label className="field__label">
                {isAr ? "حساب راتب (رقم الحضور)" : "Calculate (Attendance ID)"}
              </label>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  className="field__control"
                  placeholder="e.g. 42"
                  value={calcAttId}
                  onChange={(e) => setCalcAttId(e.target.value)}
                  style={{ width: "120px" }}
                  onKeyDown={(e) => e.key === "Enter" && void calculateDaily()}
                />
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => void calculateDaily()}
                  disabled={calculating}
                >
                  {calculating ? "..." : isAr ? "احسب" : "Calculate"}
                </button>
              </div>
              {calcMsg && (
                <p
                  style={{
                    margin: ".25rem 0 0",
                    fontSize: ".78rem",
                    color:
                      calcMsg.includes("success") || calcMsg.includes("بنجاح")
                        ? "var(--green-600)"
                        : "var(--red-600)",
                  }}
                >
                  {calcMsg}
                </p>
              )}
            </div>
          </div>

          {dailyError && (
            <div
              className="auth-alert auth-alert--error"
              style={{ marginBottom: "1rem" }}
            >
              {dailyError}
            </div>
          )}

          <div className="module-panel module-panel--full">
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{isAr ? "الموظف" : "Employee"}</th>
                    <th>{isAr ? "الدور" : "Role"}</th>
                    <th>{isAr ? "الدخول" : "Check-in"}</th>
                    <th>{isAr ? "الخروج" : "Check-out"}</th>
                    <th>{isAr ? "الساعات" : "Hours"}</th>
                    <th>{isAr ? "الراتب اليومي" : "Daily Pay"}</th>
                    <th>{isAr ? "الحالة" : "Status"}</th>
                    <th>{isAr ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        <div className="spinner" style={{ margin: "0 auto" }} />
                      </td>
                    </tr>
                  ) : daily.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Clock
                          size={28}
                          style={{
                            display: "block",
                            margin: "0 auto .5rem",
                            opacity: 0.4,
                          }}
                        />
                        {isAr
                          ? "لا توجد سجلات لهذا اليوم"
                          : "No records for this date"}
                      </td>
                    </tr>
                  ) : (
                    daily.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.user.fullName}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: ROLE_COLORS[r.user.role] + "22",
                              color: ROLE_COLORS[r.user.role],
                              border: "none",
                              fontSize: ".74rem",
                            }}
                          >
                            {r.user.role}
                          </span>
                        </td>
                        <td>
                          {r.attendance?.checkIn
                            ? fmtTime(r.attendance.checkIn)
                            : "—"}
                        </td>
                        <td>
                          {r.attendance?.checkOut ? (
                            fmtTime(r.attendance.checkOut)
                          ) : (
                            <span style={{ color: "var(--orange-500)" }}>
                              Active
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: ".25rem",
                            }}
                          >
                            <Clock size={13} style={{ opacity: 0.6 }} />
                            {r.hoursWorked.toFixed(1)}h
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: "var(--brand-primary)",
                          }}
                        >
                          {r.totalDailyPay.toFixed(2)} NIS
                        </td>
                        <td>
                          {r.isConfirmed ? (
                            <span className="badge badge--success">
                              <CheckCircle size={12} />{" "}
                              {isAr ? "مؤكد" : "Confirmed"}
                            </span>
                          ) : (
                            <span className="badge badge--warning">
                              <AlertCircle size={12} />{" "}
                              {isAr ? "انتظار" : "Pending"}
                            </span>
                          )}
                        </td>
                        <td>
                          {!r.isConfirmed ? (
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => void confirmRecord(r.id)}
                              disabled={confirmingId === r.id}
                            >
                              <CheckCircle size={13} />
                              {confirmingId === r.id
                                ? "..."
                                : isAr
                                  ? "تأكيد"
                                  : "Confirm"}
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: ".75rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {r.confirmedBy?.fullName ?? "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MONTHLY SUMMARY TAB ── */}
      {tab === "monthly" && (
        <>
          {monthlyError && (
            <div
              className="auth-alert auth-alert--error"
              style={{ marginBottom: "1rem" }}
            >
              {monthlyError}
            </div>
          )}

          {/* KPI cards */}
          <div
            className="payroll-summary-cards"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="payroll-summary-card">
              <div className="payroll-summary-card__icon">
                <Users size={20} />
              </div>
              <div>
                <p className="payroll-summary-card__label">
                  {isAr ? "سجلات الرواتب" : "Payroll Records"}
                </p>
                <p className="payroll-summary-card__value">
                  {overview?.totals.payrollCount ?? "—"}
                </p>
              </div>
            </div>
            <div className="payroll-summary-card payroll-summary-card--green">
              <div className="payroll-summary-card__icon">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="payroll-summary-card__label">
                  {isAr ? "إجمالي الصرف" : "Total Payout"}
                </p>
                <p className="payroll-summary-card__value">
                  {(overview?.totals.totalPayout ?? 0).toLocaleString()} NIS
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "1rem",
            }}
          >
            {/* By role */}
            <div className="module-panel">
              <h3
                style={{
                  margin: "0 0 1rem",
                  fontSize: ".88rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                {isAr ? "حسب الدور" : "By Role"}
              </h3>
              {monthlyLoading ? (
                <div className="spinner" style={{ margin: "1rem auto" }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ".5rem",
                  }}
                >
                  {(overview?.byRole ?? []).map((r) => (
                    <div
                      key={r.role}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: ".5rem .75rem",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-page)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: ROLE_COLORS[r.role] ?? "var(--text-primary)",
                          fontSize: ".85rem",
                        }}
                      >
                        {r.role}
                      </span>
                      <span
                        style={{
                          fontSize: ".85rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        {r.totalPayout.toLocaleString()} NIS
                      </span>
                    </div>
                  ))}
                  {!monthlyLoading && (overview?.byRole ?? []).length === 0 && (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: ".85rem",
                      }}
                    >
                      {isAr ? "لا بيانات" : "No data"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Records table */}
            <div className="module-panel module-panel--full">
              {monthlyLoading ? (
                <div className="spinner" style={{ margin: "1rem auto" }} />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{isAr ? "الموظف" : "Employee"}</th>
                        <th>{isAr ? "الدور" : "Role"}</th>
                        <th>{isAr ? "الشهر" : "Month"}</th>
                        <th>{isAr ? "الساعات" : "Hours"}</th>
                        <th>{isAr ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRecords.slice(0, 50).map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>
                            {r.user?.fullName ?? "—"}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background:
                                  ROLE_COLORS[r.user?.role ?? ""] + "22",
                                color: ROLE_COLORS[r.user?.role ?? ""],
                                border: "none",
                                fontSize: ".74rem",
                              }}
                            >
                              {r.user?.role ?? "—"}
                            </span>
                          </td>
                          <td>{r.month}</td>
                          <td>{r.totalHours?.toFixed(1) ?? "—"}h</td>
                          <td
                            style={{
                              fontWeight: 700,
                              color: "var(--brand-primary)",
                            }}
                          >
                            {r.totalSalary.toLocaleString()} NIS
                          </td>
                        </tr>
                      ))}
                      {monthlyRecords.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              padding: "2rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {isAr ? "لا توجد سجلات" : "No records"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── SALARY CONFIG TAB ── */}
      {tab === "config" && (
        <div className="module-panel" style={{ maxWidth: "520px" }}>
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: ".88rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
            }}
          >
            <Settings size={16} />{" "}
            {isAr ? "إعداد الرواتب الشهرية" : "Monthly Salary Configuration"}
          </h3>
          <p
            style={{
              margin: "0 0 1.25rem",
              fontSize: ".83rem",
              color: "var(--text-secondary)",
            }}
          >
            {isAr
              ? "اضبط الراتب الشهري لكل دور. يُحسب اليومي = الشهري ÷ 30"
              : "Set the base monthly salary per role. Daily rate = monthly ÷ 30 (Friday is off)."}
          </p>
          {configLoading ? (
            <div className="spinner" style={{ margin: "1rem auto" }} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: ".75rem",
              }}
            >
              {configs.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: ".75rem 1rem",
                    background: "var(--bg-page)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: ROLE_COLORS[c.role] ?? "var(--text-primary)",
                      minWidth: "110px",
                      fontSize: ".9rem",
                    }}
                  >
                    {c.role}
                  </span>
                  {editConfig?.role === c.role ? (
                    <>
                      <input
                        className="field__control"
                        type="number"
                        value={editConfig.value}
                        onChange={(e) =>
                          setEditConfig({
                            ...editConfig,
                            value: e.target.value,
                          })
                        }
                        style={{ width: "120px", fontSize: ".9rem" }}
                        autoFocus
                      />
                      <span
                        style={{
                          fontSize: ".8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        NIS/mo
                      </span>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => void saveConfig()}
                        disabled={savingConfig}
                      >
                        {savingConfig ? "..." : isAr ? "حفظ" : "Save"}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditConfig(null)}
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        style={{ flex: 1, fontWeight: 600, fontSize: ".95rem" }}
                      >
                        {c.monthlySalary.toLocaleString()} NIS/mo
                      </span>
                      <span
                        style={{
                          fontSize: ".78rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ≈ {(c.monthlySalary / 30).toFixed(1)} NIS/day
                      </span>
                      {isAdmin && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setEditConfig({
                              role: c.role,
                              value: String(c.monthlySalary),
                            })
                          }
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {configs.length === 0 && (
                <p
                  style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}
                >
                  {isAr ? "لا توجد إعدادات" : "No configs found"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </ModulePageShell>
  );
}
