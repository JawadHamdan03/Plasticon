import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Settings,
  Users,
  AlertCircle,
  ChevronDown,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { toast } from "../../lib/toast";

type DailyRecord = {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  leaveType: string | null;
  user: { id: number; fullName: string; role: string };
  attendance: { id: number; checkIn: string; checkOut: string | null } | null;
  confirmedBy: { fullName: string } | null;
};

type SalaryConfig = { id: number; role: string; monthlySalary: number };

type DeductionRule = {
  id: number;
  type: string;
  isActive: boolean;
  thresholdMinutes: number;
  deductionValue: number;
};

type MonthlyPayroll = {
  id: number;
  month: string;
  totalSalary: number;
  baseSalary?: number;
  overtimeSalary?: number;
  totalHours?: number;
  user?: { fullName: string; role: string };
};

type UserSalary = {
  id: number;
  fullName: string;
  role: string;
  roleDefaultSalary: number;
  individualSalary: number | null;
  effectiveSalary: number;
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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options?.headers ?? {}), ...authHeaders() },
  });
}

function fmtTime(d: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d));
}

const ROLE_COLORS: Record<string, string> = {
  WORKER: "var(--blue-600)",
  ENGINEER: "var(--green-600)",
  ACCOUNTANT: "var(--orange-500)",
  ADMIN: "var(--red-600)",
};

const LEAVE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SICK:   { label: "Sick",   color: "#b91c1c", bg: "#fee2e2" },
  ANNUAL: { label: "Annual", color: "#1d4ed8", bg: "#dbeafe" },
  UNPAID: { label: "Unpaid", color: "#92400e", bg: "#fef3c7" },
};

function KpiCard({ label, value, gradient, icon }: { label: string; value: string | number; gradient: string; icon: ReactNode }) {
  return (
    <div style={{ background: gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: ".73rem", opacity: .85, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
        <p style={{ margin: ".2rem 0 0", fontSize: "1.3rem", fontWeight: 800, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
}

export function PayrollAdminPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";
  const isAdmin = user?.role === "ADMIN";

  const [tab, setTab] = useState<"daily" | "monthly" | "salaries" | "config">("daily");
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [dateFilter, setDateFilter] = useState(defaultDate);
  const [monthFilter, setMonthFilter] = useState(defaultMonth);
  const [calculatingMonthly, setCalculatingMonthly] = useState(false);

  // Daily
  const [daily, setDaily] = useState<DailyRecord[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [markLeaveFor, setMarkLeaveFor] = useState<{ attendanceId: number; current: string | null } | null>(null);
  const [markingLeave, setMarkingLeave] = useState(false);

  // Monthly
  const [overview, setOverview] = useState<Overview | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyPayroll[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState("");
  const [editMonthly, setEditMonthly] = useState<{ id: number; value: string } | null>(null);
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Config
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [editConfig, setEditConfig] = useState<{ role: string; value: string } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // User salaries
  const [userSalaries, setUserSalaries] = useState<UserSalary[]>([]);
  const [userSalariesLoading, setUserSalariesLoading] = useState(false);
  const [editUserSalary, setEditUserSalary] = useState<{ userId: number; value: string } | null>(null);
  const [savingUserSalary, setSavingUserSalary] = useState(false);

  // Deduction rules
  const [deductionRules, setDeductionRules] = useState<DeductionRule[]>([]);
  const [deductionLoading, setDeductionLoading] = useState(false);
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [editRule, setEditRule] = useState<{ type: string; thresholdMinutes: string; deductionValue: string } | null>(null);

  const [calculating, setCalculating] = useState(false);
  const [calcMsg, setCalcMsg] = useState("");

  const loadDaily = useCallback(async () => {
    setDailyLoading(true); setDailyError("");
    try {
      const res = await api(`/payroll/daily?date=${dateFilter}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setDaily((await res.json()) as DailyRecord[]);
    } catch (e) { setDailyError(e instanceof Error ? e.message : "Failed"); }
    finally { setDailyLoading(false); }
  }, [dateFilter]);

  const loadMonthly = useCallback(async (filterMonth?: string) => {
    setMonthlyLoading(true); setMonthlyError("");
    try {
      const m = filterMonth ?? monthFilter;
      const [or, lr] = await Promise.all([
        api(`/payroll/admin/overview${m ? `?month=${m}` : ""}`),
        api(`/payroll${m ? `?month=${m}` : ""}`),
      ]);
      if (!or.ok) throw new Error(await readApiError(or));
      if (!lr.ok) throw new Error(await readApiError(lr));
      setOverview(await or.json());
      setMonthlyRecords(await lr.json());
    } catch (e) { setMonthlyError(e instanceof Error ? e.message : "Failed"); }
    finally { setMonthlyLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  const calculateMonthlyPayroll = async () => {
    if (!monthFilter) return;
    setCalculatingMonthly(true);
    try {
      const res = await api("/payroll/monthly/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: monthFilter }),
      });
      const data = await res.json() as { calculated?: number; message?: string };
      if (!res.ok) { toast.error(data.message ?? "Error"); return; }
      toast.success(
        data.calculated === 0
          ? (isAr ? "لا سجلات جديدة" : "No new records")
          : (isAr ? `تم احتساب ${data.calculated} راتب` : `Calculated ${data.calculated} payroll(s)`)
      );
      void loadMonthly();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCalculatingMonthly(false); }
  };

  const loadConfigs = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api("/payroll/salary-config");
      if (res.ok) setConfigs(await res.json());
    } catch { /* ignore */ }
    finally { setConfigLoading(false); }
  }, []);

  const loadDeductionRules = useCallback(async () => {
    setDeductionLoading(true);
    try {
      const res = await api("/payroll/admin/deduction-rules");
      if (!res.ok) throw new Error(await readApiError(res));
      setDeductionRules((await res.json()) as DeductionRule[]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setDeductionLoading(false); }
  }, []);

  const toggleRule = async (type: string, isActive: boolean) => {
    setSavingRule(type);
    try {
      const res = await api(`/payroll/admin/deduction-rules/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      setDeductionRules((prev) => prev.map((r) => r.type === type ? { ...r, isActive } : r));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingRule(null); }
  };

  const saveRuleParams = async () => {
    if (!editRule) return;
    setSavingRule(editRule.type);
    try {
      const res = await api(`/payroll/admin/deduction-rules/${editRule.type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thresholdMinutes: Number(editRule.thresholdMinutes),
          deductionValue: Number(editRule.deductionValue),
        }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      const updated = (await res.json()) as DeductionRule;
      setDeductionRules((prev) => prev.map((r) => r.type === editRule.type ? updated : r));
      setEditRule(null);
      toast.success("Rule updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingRule(null); }
  };

  const loadUserSalaries = useCallback(async () => {
    setUserSalariesLoading(true);
    try {
      const res = await api("/payroll/admin/user-salaries");
      if (!res.ok) throw new Error(await readApiError(res));
      setUserSalaries((await res.json()) as UserSalary[]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setUserSalariesLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "daily") void loadDaily();
    if (tab === "monthly") void loadMonthly();
    if (tab === "config") { void loadConfigs(); void loadDeductionRules(); }
    if (tab === "salaries") void loadUserSalaries();
  }, [tab, loadDaily, loadMonthly, loadConfigs, loadDeductionRules, loadUserSalaries]);

  // Reload monthly when filter changes
  useEffect(() => {
    if (tab === "monthly") void loadMonthly();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  const confirmRecord = async (id: number) => {
    setConfirmingId(id);
    try {
      const res = await api(`/payroll/daily/${id}/confirm`, { method: "POST" });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      setDaily((prev) => prev.map((r) => r.id === id ? { ...r, isConfirmed: true, confirmedAt: new Date().toISOString() } : r));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setConfirmingId(null); }
  };

  const markLeave = async (attendanceId: number, leaveType: string | null) => {
    setMarkingLeave(true);
    try {
      const res = await api(`/payroll/admin/attendance/${attendanceId}/leave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveType }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      setDaily((prev) => prev.map((r) => r.attendance?.id === attendanceId ? { ...r, leaveType } : r));
      setMarkLeaveFor(null);
      toast.success(leaveType ? `Marked as ${leaveType}` : "Leave cleared");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setMarkingLeave(false); }
  };

  const calculateAllForDate = async () => {
    if (!dateFilter) { setCalcMsg(isAr ? "اختر تاريخاً أولاً" : "Select a date first"); return; }
    setCalculating(true); setCalcMsg("");
    try {
      const res = await api("/payroll/daily/calculate-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateFilter }),
      });
      const data = await res.json() as { calculated?: number; message?: string };
      if (!res.ok) { setCalcMsg(data.message ?? "Error"); return; }
      setCalcMsg(
        data.calculated === 0
          ? (isAr ? "لا توجد سجلات جديدة" : "No new records to process")
          : (isAr ? `تم حساب ${data.calculated} راتب` : `Calculated ${data.calculated} payroll record(s)`)
      );
      void loadDaily();
    } catch (e) { setCalcMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setCalculating(false); }
  };

  const saveConfig = async () => {
    if (!editConfig) return;
    setSavingConfig(true);
    try {
      const res = await api("/payroll/salary-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editConfig.role, monthlySalary: Number(editConfig.value) }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      await loadConfigs(); setEditConfig(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingConfig(false); }
  };

  const saveMonthlyPayroll = async () => {
    if (!editMonthly) return;
    setSavingMonthly(true);
    try {
      const res = await api(`/payroll/${editMonthly.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSalary: Number(editMonthly.value) }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      setMonthlyRecords((prev) => prev.map((r) => r.id === editMonthly.id ? { ...r, totalSalary: Number(editMonthly.value) } : r));
      setEditMonthly(null); toast.success("Payroll updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingMonthly(false); }
  };

  const deleteMonthlyPayroll = async (id: number) => {
    if (!confirm("Delete this payroll record? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await api(`/payroll/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      setMonthlyRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Payroll deleted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setDeletingId(null); }
  };

  const saveUserSalary = async () => {
    if (!editUserSalary) return;
    setSavingUserSalary(true);
    try {
      const monthlySalary = editUserSalary.value === "" ? null : Number(editUserSalary.value);
      const res = await api(`/payroll/admin/user-salaries/${editUserSalary.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlySalary }),
      });
      if (!res.ok) { toast.error(await readApiError(res)); return; }
      await loadUserSalaries(); setEditUserSalary(null); toast.success("Salary updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSavingUserSalary(false); }
  };

  const pendingCount = useMemo(() => daily.filter((r) => !r.isConfirmed).length, [daily]);
  const confirmedCount = useMemo(() => daily.filter((r) => r.isConfirmed).length, [daily]);
  const dailyTotal = useMemo(() => daily.reduce((s, r) => s + r.totalDailyPay, 0), [daily]);

  const tabs = [
    { key: "daily",    label: isAr ? "الرواتب اليومية"  : "Daily Payroll" },
    { key: "monthly",  label: isAr ? "الملخص الشهري"    : "Monthly Summary" },
    { key: "salaries", label: isAr ? "رواتب الموظفين"   : "User Salaries" },
    { key: "config",   label: isAr ? "إعداد الرواتب"    : "Salary Config" },
  ] as const;

  return (
    <ModulePageShell
      title={isAr ? "إدارة الرواتب" : "Payroll Management"}
      subtitle={isAr ? "تأكيد الرواتب اليومية وعرض التقارير الشهرية." : "Confirm daily payrolls and view monthly reports."}
      actions={
        <button className="btn btn--ghost btn--sm" onClick={() => {
          if (tab === "daily") void loadDaily();
          if (tab === "monthly") void loadMonthly();
          if (tab === "config") { void loadConfigs(); void loadDeductionRules(); }
          if (tab === "salaries") void loadUserSalaries();
        }}>
          <RefreshCw size={14} />{isAr ? "تحديث" : "Refresh"}
        </button>
      }
    >
      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: "1.5rem" }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`admin-tab${tab === t.key ? " admin-tab--active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === "daily" && pendingCount > 0 && (
              <span className="badge badge--warning" style={{ marginInlineStart: ".5rem", fontSize: ".7rem" }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DAILY TAB ── */}
      {tab === "daily" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <KpiCard label={isAr ? "قيد الانتظار" : "Pending"}    value={pendingCount}                     gradient="linear-gradient(135deg,#f97316,#ea580c)" icon={<AlertCircle size={20} />} />
            <KpiCard label={isAr ? "مؤكد" : "Confirmed"}           value={confirmedCount}                   gradient="linear-gradient(135deg,#10b981,#059669)" icon={<CheckCircle size={20} />} />
            <KpiCard label={isAr ? "إجمالي اليوم" : "Day Total"}   value={`${dailyTotal.toFixed(2)} ₪`}  gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" icon={<DollarSign size={20} />} />
            <KpiCard label={isAr ? "الموظفون" : "Employees"}       value={daily.length}                     gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" icon={<Users size={20} />} />
          </div>

          {/* Filter row */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "flex-end", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1rem 1.25rem" }}>
            <div className="field" style={{ flex: "0 0 auto" }}>
              <label className="field__label">{isAr ? "تاريخ" : "Date"}</label>
              <input type="date" className="field__control" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: "min(180px, 100%)" }} />
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => void loadDaily()}>{isAr ? "بحث" : "Search"}</button>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem", alignItems: "flex-end" }}>
              <label className="field__label" style={{ alignSelf: "flex-start" }}>{isAr ? "حساب رواتب اليوم المحدد" : "Calculate payrolls for selected date"}</label>
              <button className="btn btn--outline btn--sm" onClick={() => void calculateAllForDate()} disabled={calculating} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <RefreshCw size={13} />{calculating ? "..." : isAr ? "احسب الكل" : "Calculate All"}
              </button>
              {calcMsg && (
                <p style={{ margin: 0, fontSize: ".78rem", color: calcMsg.includes("0") || calcMsg.toLowerCase().includes("error") ? "var(--orange-500)" : "var(--green-600)" }}>{calcMsg}</p>
              )}
            </div>
          </div>

          {dailyError && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{dailyError}</div>}

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
                    <th>{isAr ? "الإجازة" : "Leave"}</th>
                    <th>{isAr ? "الحالة" : "Status"}</th>
                    <th>{isAr ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLoading ? (
                    <tr><td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></td></tr>
                  ) : daily.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                        <Clock size={28} style={{ display: "block", margin: "0 auto .5rem", opacity: 0.4 }} />
                        {isAr ? "لا توجد سجلات لهذا اليوم" : "No records for this date"}
                      </td>
                    </tr>
                  ) : (
                    daily.map((r) => {
                      const leaveBadge = r.leaveType ? LEAVE_BADGE[r.leaveType] : null;
                      const isMarkingThis = markLeaveFor?.attendanceId === r.attendance?.id;
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.user.fullName}</td>
                          <td>
                            <span className="badge" style={{ background: ROLE_COLORS[r.user.role] + "22", color: ROLE_COLORS[r.user.role], border: "none", fontSize: ".74rem" }}>{r.user.role}</span>
                          </td>
                          <td>{r.attendance?.checkIn ? fmtTime(r.attendance.checkIn) : "—"}</td>
                          <td>
                            {r.attendance?.checkOut ? fmtTime(r.attendance.checkOut) : "—"}
                          </td>
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                              <Clock size={13} style={{ opacity: 0.6 }} />{r.hoursWorked.toFixed(1)}h
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--brand-primary)" }}>{r.totalDailyPay.toFixed(2)} ₪</td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem", alignItems: "flex-start" }}>
                              {leaveBadge
                                ? <span style={{ background: leaveBadge.bg, border: `1px solid ${leaveBadge.color}44`, borderRadius: "4px", padding: "1px 7px", color: leaveBadge.color, fontSize: ".75rem", fontWeight: 700 }}>{leaveBadge.label}</span>
                                : <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>—</span>
                              }
                              {isAdmin && r.attendance && (
                                <div style={{ position: "relative" }}>
                                  <button
                                    className="btn btn--ghost btn--sm"
                                    style={{ fontSize: ".72rem", padding: "2px 7px", display: "flex", alignItems: "center", gap: ".2rem" }}
                                    onClick={() => setMarkLeaveFor(isMarkingThis ? null : { attendanceId: r.attendance!.id, current: r.leaveType })}
                                  >
                                    {isAr ? "إجازة" : "Mark"} <ChevronDown size={11} />
                                  </button>
                                  {isMarkingThis && (
                                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,.12)", zIndex: 50, minWidth: "120px", overflow: "hidden" }}>
                                      {(["SICK", "ANNUAL", "UNPAID"] as const).map((lt) => (
                                        <button key={lt} disabled={markingLeave}
                                          style={{ display: "block", width: "100%", textAlign: "left", padding: ".45rem .75rem", fontSize: ".82rem", background: r.leaveType === lt ? "var(--bg-page)" : "transparent", fontWeight: r.leaveType === lt ? 700 : 400, cursor: "pointer", border: "none", color: LEAVE_BADGE[lt].color }}
                                          onClick={() => void markLeave(r.attendance!.id, lt)}
                                        >{LEAVE_BADGE[lt].label}</button>
                                      ))}
                                      {r.leaveType && (
                                        <button disabled={markingLeave}
                                          style={{ display: "block", width: "100%", textAlign: "left", padding: ".45rem .75rem", fontSize: ".82rem", background: "transparent", cursor: "pointer", border: "none", borderTop: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                                          onClick={() => void markLeave(r.attendance!.id, null)}
                                        >Clear</button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {r.isConfirmed
                              ? <span className="badge badge--success"><CheckCircle size={12} /> {isAr ? "مؤكد" : "Confirmed"}</span>
                              : <span className="badge badge--warning"><AlertCircle size={12} /> {isAr ? "انتظار" : "Pending"}</span>
                            }
                          </td>
                          <td>
                            {!r.isConfirmed
                              ? <button className="btn btn--primary btn--sm" onClick={() => void confirmRecord(r.id)} disabled={confirmingId === r.id}><CheckCircle size={13} />{confirmingId === r.id ? "..." : isAr ? "تأكيد" : "Confirm"}</button>
                              : <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>{r.confirmedBy?.fullName ?? "—"}</span>
                            }
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MONTHLY TAB ── */}
      {tab === "monthly" && (
        <>
          {monthlyError && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{monthlyError}</div>}

          {/* Month filter bar */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "flex-end", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1rem 1.25rem" }}>
            <div className="field" style={{ flex: "0 0 auto" }}>
              <label className="field__label">{isAr ? "الشهر" : "Month"}</label>
              <input type="month" className="field__control" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ width: "min(180px, 100%)" }} />
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => void loadMonthly()}>{isAr ? "بحث" : "Search"}</button>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem", alignItems: "flex-end" }}>
              <label className="field__label" style={{ alignSelf: "flex-start" }}>{isAr ? "احتساب رواتب الشهر المحدد" : "Calculate monthly payrolls for selected month"}</label>
              <button className="btn btn--outline btn--sm" onClick={() => void calculateMonthlyPayroll()} disabled={calculatingMonthly} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <RefreshCw size={13} />{calculatingMonthly ? "..." : isAr ? "احسب الشهر" : "Calculate Month"}
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <KpiCard label={isAr ? "سجلات الرواتب" : "Payroll Records"} value={overview?.totals.payrollCount ?? "—"}                                      gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" icon={<Users size={20} />} />
            <KpiCard label={isAr ? "إجمالي الصرف" : "Total Payout"}      value={`${(overview?.totals.totalPayout ?? 0).toLocaleString()} ₪`}              gradient="linear-gradient(135deg,#10b981,#059669)" icon={<DollarSign size={20} />} />
            <KpiCard label={isAr ? "الراتب الأساسي" : "Base Salary"}     value={`${(overview?.totals.totalBaseSalary ?? 0).toLocaleString()} ₪`}          gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" icon={<Clock size={20} />} />
            <KpiCard label={isAr ? "الوقت الإضافي" : "Overtime"}         value={`${(overview?.totals.totalOvertimeSalary ?? 0).toLocaleString()} ₪`}      gradient="linear-gradient(135deg,#f97316,#ea580c)" icon={<Settings size={20} />} />
          </div>

          <div className="payroll-monthly-grid">
            {/* By Role breakdown */}
            <div className="module-panel">
              <h3 style={{ margin: "0 0 1rem", fontSize: ".88rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em" }}>{isAr ? "حسب الدور" : "By Role"}</h3>
              {monthlyLoading ? <div className="spinner" style={{ margin: "1rem auto" }} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {(overview?.byRole ?? []).map((r) => {
                    const pct = overview ? (r.totalPayout / (overview.totals.totalPayout || 1)) * 100 : 0;
                    return (
                      <div key={r.role} style={{ padding: ".65rem .75rem", borderRadius: "var(--radius-md)", background: "var(--bg-page)", border: "1px solid var(--border-default)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".35rem" }}>
                          <span style={{ fontWeight: 700, color: ROLE_COLORS[r.role] ?? "var(--text-primary)", fontSize: ".85rem" }}>{r.role}</span>
                          <span style={{ fontSize: ".85rem", fontWeight: 600 }}>{r.totalPayout.toLocaleString()} ₪</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--border-default)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: ROLE_COLORS[r.role] ?? "#94a3b8" }} />
                          </div>
                          <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", minWidth: 32 }}>{pct.toFixed(0)}%</span>
                        </div>
                        <p style={{ margin: ".25rem 0 0", fontSize: ".73rem", color: "var(--text-secondary)" }}>
                          {r.payrollCount} {isAr ? "موظف" : "employees"}
                        </p>
                      </div>
                    );
                  })}
                  {(overview?.byRole ?? []).length === 0 && !monthlyLoading && (
                    <p style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>{isAr ? "لا بيانات" : "No data"}</p>
                  )}
                </div>
              )}
            </div>

            {/* Per-employee table */}
            <div className="module-panel module-panel--full">
              {monthlyLoading ? <div className="spinner" style={{ margin: "1rem auto" }} /> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{isAr ? "الموظف" : "Employee"}</th>
                        <th>{isAr ? "الدور" : "Role"}</th>
                        <th>{isAr ? "الشهر" : "Month"}</th>
                        <th>{isAr ? "الساعات" : "Hours"}</th>
                        <th>{isAr ? "الأساسي" : "Base"}</th>
                        <th>{isAr ? "الوقت الإضافي" : "Overtime"}</th>
                        <th>{isAr ? "الإجمالي" : "Total"}</th>
                        {isAdmin && <th>{isAr ? "إجراء" : "Action"}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRecords.slice(0, 100).map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700 }}>{r.user?.fullName ?? "—"}</td>
                          <td>
                            <span className="badge" style={{ background: ROLE_COLORS[r.user?.role ?? ""] + "22", color: ROLE_COLORS[r.user?.role ?? ""], border: "none", fontSize: ".74rem" }}>{r.user?.role ?? "—"}</span>
                          </td>
                          <td style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>{r.month}</td>
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                              <Clock size={12} style={{ opacity: .5 }} />
                              <strong>{r.totalHours?.toFixed(1) ?? "—"}</strong>h
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>{r.baseSalary != null ? `${r.baseSalary.toLocaleString()} ₪` : "—"}</td>
                          <td style={{ color: "#f97316" }}>{r.overtimeSalary != null && r.overtimeSalary > 0 ? `+${r.overtimeSalary.toFixed(2)} ₪` : <span style={{ color: "var(--text-secondary)" }}>—</span>}</td>
                          <td style={{ fontWeight: 700, color: "var(--brand-primary)" }}>
                            {editMonthly?.id === r.id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                                <input className="field__control" type="number" value={editMonthly.value} onChange={(e) => setEditMonthly({ ...editMonthly, value: e.target.value })} style={{ width: "110px", fontSize: ".85rem" }} autoFocus />
                                <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>₪</span>
                                <button className="btn btn--primary btn--sm" onClick={() => void saveMonthlyPayroll()} disabled={savingMonthly}>{savingMonthly ? "..." : isAr ? "حفظ" : "Save"}</button>
                                <button className="btn btn--ghost btn--sm" onClick={() => setEditMonthly(null)}><X size={13} /></button>
                              </div>
                            ) : `${r.totalSalary.toLocaleString()} ₪`}
                          </td>
                          {isAdmin && (
                            <td>
                              {editMonthly?.id !== r.id && (
                                <div style={{ display: "flex", gap: ".4rem" }}>
                                  <button className="btn btn--ghost btn--sm" title="Edit" onClick={() => setEditMonthly({ id: r.id, value: String(r.totalSalary) })}><Edit2 size={13} /></button>
                                  <button className="btn btn--ghost btn--sm" style={{ color: "var(--red-600)" }} title="Delete" disabled={deletingId === r.id} onClick={() => void deleteMonthlyPayroll(r.id)}>
                                    {deletingId === r.id ? "..." : <Trash2 size={13} />}
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {monthlyRecords.length === 0 && (
                        <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                          <DollarSign size={28} style={{ display: "block", margin: "0 auto .5rem", opacity: .3 }} />
                          {isAr ? "لا توجد سجلات لهذا الشهر" : "No records for this month"}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── USER SALARIES TAB ── */}
      {tab === "salaries" && (
        <>
          <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.06))", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{isAr ? "رواتب الموظفين" : "Employee Salaries"}</h3>
              <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                {isAr ? "اضبط الراتب الشهري لكل موظف. اترك فارغاً لاستخدام راتب الدور الافتراضي." : "Set a monthly salary for each employee. Leave blank to use the role-default salary."}
              </p>
            </div>
          </div>

          {userSalariesLoading ? <div className="spinner" style={{ margin: "2rem auto" }} /> : (
            <div className="module-panel module-panel--full">
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{isAr ? "الموظف" : "Employee"}</th>
                      <th>{isAr ? "الدور" : "Role"}</th>
                      <th>{isAr ? "الراتب الشهري" : "Monthly Salary"}</th>
                      <th>{isAr ? "اليومي" : "Daily Rate"}</th>
                      <th>{isAr ? "المصدر" : "Source"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSalaries.map((u) => {
                      const isEditing = editUserSalary?.userId === u.id;
                      const isSaving = savingUserSalary && editUserSalary?.userId === u.id;
                      const isCustom = u.individualSalary != null;
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                          <td>
                            <span className="badge" style={{ background: ROLE_COLORS[u.role] + "22", color: ROLE_COLORS[u.role], border: "none", fontSize: ".74rem" }}>{u.role}</span>
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
                                <input
                                  className="field__control"
                                  type="number"
                                  min="0"
                                  placeholder={`${u.roleDefaultSalary.toLocaleString()} (role default)`}
                                  value={editUserSalary.value}
                                  onChange={(e) => setEditUserSalary({ ...editUserSalary, value: e.target.value })}
                                  style={{ width: "150px", fontSize: ".9rem" }}
                                  autoFocus
                                />
                                <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>₪/mo</span>
                                <button className="btn btn--primary btn--sm" onClick={() => void saveUserSalary()} disabled={isSaving}>
                                  {isSaving ? "..." : isAr ? "حفظ" : "Save"}
                                </button>
                                {isCustom && (
                                  <button
                                    className="btn btn--ghost btn--sm"
                                    style={{ color: "var(--text-secondary)", fontSize: ".75rem" }}
                                    title={isAr ? "إعادة تعيين إلى راتب الدور" : "Reset to role default"}
                                    onClick={() => { setEditUserSalary({ ...editUserSalary, value: "" }); }}
                                  >
                                    {isAr ? "إعادة تعيين" : "Reset"}
                                  </button>
                                )}
                                <button className="btn btn--ghost btn--sm" onClick={() => setEditUserSalary(null)}><X size={13} /></button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <span style={{ fontWeight: 700, fontSize: "1rem", color: isCustom ? "var(--blue-600)" : "var(--text-primary)" }}>
                                  {u.effectiveSalary.toLocaleString()} ₪
                                </span>
                                {isAdmin && (
                                  <button
                                    className="btn btn--ghost btn--sm"
                                    style={{ padding: "3px 8px", opacity: .7 }}
                                    title={isAr ? "تعديل الراتب" : "Edit salary"}
                                    onClick={() => setEditUserSalary({ userId: u.id, value: String(u.effectiveSalary) })}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: ".88rem" }}>
                            {(u.effectiveSalary / 30).toFixed(1)} ₪
                          </td>
                          <td>
                            {isCustom ? (
                              <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                                <span style={{ fontSize: ".75rem", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "1px 7px", fontWeight: 700 }}>
                                  {isAr ? "مخصص" : "Custom"}
                                </span>
                                {isAdmin && !isEditing && (
                                  <button
                                    className="btn btn--ghost btn--sm"
                                    style={{ padding: "2px 6px", fontSize: ".72rem", color: "var(--text-secondary)" }}
                                    title={isAr ? "إعادة تعيين إلى راتب الدور" : "Reset to role default"}
                                    onClick={() => {
                                      setEditUserSalary({ userId: u.id, value: "" });
                                      void (async () => {
                                        setSavingUserSalary(true);
                                        try {
                                          const res = await api(`/payroll/admin/user-salaries/${u.id}`, {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ monthlySalary: null }),
                                          });
                                          if (!res.ok) { toast.error(await readApiError(res)); return; }
                                          await loadUserSalaries();
                                          toast.success(isAr ? "تمت إعادة التعيين" : "Reset to role default");
                                        } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                                        finally { setSavingUserSalary(false); setEditUserSalary(null); }
                                      })();
                                    }}
                                  >
                                    ↩ {isAr ? "إعادة تعيين" : "Reset"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>
                                {isAr ? "راتب الدور" : "Role default"} ({u.roleDefaultSalary.toLocaleString()} ₪)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {userSalaries.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>{isAr ? "لا يوجد موظفون" : "No employees found"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CONFIG TAB ── */}
      {tab === "config" && (
        <div style={{ maxWidth: "680px" }}>
          <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.06))", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <Settings size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{isAr ? "إعداد الرواتب الشهرية" : "Monthly Salary Configuration"}</h3>
              <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                {isAr ? "اضبط الراتب الشهري لكل دور. يُحسب اليومي = الشهري ÷ 30" : "Set the base monthly salary per role. Daily rate = monthly ÷ 30."}
              </p>
            </div>
          </div>

          {configLoading ? <div className="spinner" style={{ margin: "1rem auto" }} /> : (
            <div className="module-panel" style={{ display: "flex", flexDirection: "column", gap: ".75rem", marginBottom: "1.5rem" }}>
              {configs.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: ".75rem 1rem", background: "var(--bg-page)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
                  <span style={{ fontWeight: 700, color: ROLE_COLORS[c.role] ?? "var(--text-primary)", minWidth: "110px", fontSize: ".9rem" }}>{c.role}</span>
                  {editConfig?.role === c.role ? (
                    <>
                      <input className="field__control" type="number" value={editConfig.value} onChange={(e) => setEditConfig({ ...editConfig, value: e.target.value })} style={{ width: "120px", fontSize: ".9rem" }} autoFocus />
                      <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>₪/mo</span>
                      <button className="btn btn--primary btn--sm" onClick={() => void saveConfig()} disabled={savingConfig}>{savingConfig ? "..." : isAr ? "حفظ" : "Save"}</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setEditConfig(null)}>{isAr ? "إلغاء" : "Cancel"}</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: ".95rem" }}>{c.monthlySalary.toLocaleString()} ₪/mo</span>
                      <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>≈ {(c.monthlySalary / 30).toFixed(1)} ₪/day</span>
                      {isAdmin && <button className="btn btn--ghost btn--sm" onClick={() => setEditConfig({ role: c.role, value: String(c.monthlySalary) })}>{isAr ? "تعديل" : "Edit"}</button>}
                    </>
                  )}
                </div>
              ))}
              {configs.length === 0 && <p style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>{isAr ? "لا توجد إعدادات" : "No configs found"}</p>}
            </div>
          )}

          {/* Deduction Rules */}
          <div style={{ marginBottom: ".75rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>{isAr ? "قواعد الخصم التلقائي" : "Automated Deduction Rules"}</h3>
              <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
                {isAr ? "تُطبَّق تلقائياً عند حساب الرواتب اليومية" : "Applied automatically when calculating daily payroll"}
              </p>
            </div>
          </div>

          {deductionLoading ? <div className="spinner" style={{ margin: "1rem auto" }} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {(() => {
                const ruleMeta: Record<string, { icon: string; title: string; titleAr: string; desc: string; descAr: string; showThreshold: boolean; valueLabel: string; valueLabelAr: string; valueHint: string }> = {
                  LATE_ARRIVAL: {
                    icon: "🕐", title: "Late Arrival", titleAr: "تأخر في الدخول",
                    desc: "Deduct X ₪ per hour of lateness beyond threshold",
                    descAr: "خصم X شيكل لكل ساعة تأخر بعد الحد الأدنى",
                    showThreshold: true, valueLabel: "₪ per hour late", valueLabelAr: "شيكل/ساعة تأخر", valueHint: "e.g. 5",
                  },
                  EARLY_CHECKOUT: {
                    icon: "🚪", title: "Early Checkout", titleAr: "خروج مبكر",
                    desc: "Deduct hourly rate × missed hours beyond threshold",
                    descAr: "خصم سعر الساعة × الساعات المفقودة بعد الحد",
                    showThreshold: true, valueLabel: "(auto: hourly rate × missed hours)", valueLabelAr: "(تلقائي: سعر الساعة × الساعات)", valueHint: "",
                  },
                  UNEXCUSED_ABSENCE: {
                    icon: "❌", title: "Unexcused Absence", titleAr: "غياب بدون عذر",
                    desc: "Deduct full daily rate if no attendance record",
                    descAr: "خصم يوم كامل إذا لم يسجّل حضوراً",
                    showThreshold: false, valueLabel: "(full day rate deducted)", valueLabelAr: "(خصم يوم كامل)", valueHint: "",
                  },
                  SICK_LEAVE: {
                    icon: "🏥", title: "Sick Leave Pay Rate", titleAr: "معدل أجر الإجازة المرضية",
                    desc: "Pay this % of daily rate for sick-leave marked days",
                    descAr: "ادفع هذه النسبة من الراتب اليومي لأيام الإجازة المرضية",
                    showThreshold: false, valueLabel: "% of daily rate to pay", valueLabelAr: "% من الراتب اليومي", valueHint: "e.g. 75",
                  },
                };

                const ruleOrder = ["LATE_ARRIVAL", "EARLY_CHECKOUT", "UNEXCUSED_ABSENCE", "SICK_LEAVE"];
                const ruleMap = new Map(deductionRules.map((r) => [r.type, r]));

                return ruleOrder.map((type) => {
                  const rule = ruleMap.get(type);
                  const meta = ruleMeta[type];
                  const isEditing = editRule?.type === type;
                  const isSaving = savingRule === type;
                  if (!rule || !meta) return null;

                  return (
                    <div key={type} style={{ background: "var(--bg-page)", border: `1px solid ${rule.isActive ? "var(--blue-600)" : "var(--border-default)"}`, borderRadius: "var(--radius-lg)", padding: "1rem 1.1rem", transition: "border-color .2s" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: ".85rem" }}>
                        <span style={{ fontSize: "1.4rem", lineHeight: 1, marginTop: "2px" }}>{meta.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap", marginBottom: ".35rem" }}>
                            <span style={{ fontWeight: 700, fontSize: ".92rem" }}>{isAr ? meta.titleAr : meta.title}</span>
                            {/* Toggle switch */}
                            <button
                              disabled={isSaving || !isAdmin}
                              onClick={() => void toggleRule(type, !rule.isActive)}
                              style={{
                                position: "relative", width: "42px", height: "22px",
                                background: rule.isActive ? "var(--blue-600)" : "var(--border-default)",
                                borderRadius: "11px", border: "none", cursor: isAdmin ? "pointer" : "default",
                                transition: "background .2s", flexShrink: 0,
                              }}
                            >
                              <span style={{ position: "absolute", top: "3px", left: rule.isActive ? "21px" : "3px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
                            </button>
                            <span style={{ fontSize: ".78rem", fontWeight: 600, color: rule.isActive ? "var(--blue-600)" : "var(--text-secondary)" }}>
                              {rule.isActive ? (isAr ? "مُفعَّل" : "Active") : (isAr ? "معطَّل" : "Inactive")}
                            </span>
                          </div>
                          <p style={{ margin: "0 0 .5rem", fontSize: ".8rem", color: "var(--text-secondary)" }}>{isAr ? meta.descAr : meta.desc}</p>

                          {isEditing ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center", marginTop: ".35rem" }}>
                              {meta.showThreshold && (
                                <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                                  <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{isAr ? "الحد (دقيقة):" : "Threshold (min):"}</span>
                                  <input className="field__control" type="number" min="0" value={editRule.thresholdMinutes} onChange={(e) => setEditRule({ ...editRule, thresholdMinutes: e.target.value })} style={{ width: "70px", fontSize: ".85rem" }} />
                                </div>
                              )}
                              {type !== "EARLY_CHECKOUT" && type !== "UNEXCUSED_ABSENCE" && (
                                <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                                  <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{isAr ? meta.valueLabelAr : meta.valueLabel}:</span>
                                  <input className="field__control" type="number" min="0" placeholder={meta.valueHint} value={editRule.deductionValue} onChange={(e) => setEditRule({ ...editRule, deductionValue: e.target.value })} style={{ width: "80px", fontSize: ".85rem" }} />
                                </div>
                              )}
                              <button className="btn btn--primary btn--sm" onClick={() => void saveRuleParams()} disabled={isSaving}>{isSaving ? "..." : isAr ? "حفظ" : "Save"}</button>
                              <button className="btn btn--ghost btn--sm" onClick={() => setEditRule(null)}><X size={13} /></button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
                              {meta.showThreshold && (
                                <span style={{ fontSize: ".8rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "2px 8px" }}>
                                  {isAr ? "الحد:" : "Threshold:"} <strong>{rule.thresholdMinutes} min</strong>
                                </span>
                              )}
                              {type === "LATE_ARRIVAL" && (
                                <span style={{ fontSize: ".8rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "2px 8px" }}>
                                  {isAr ? "الخصم:" : "Deduct:"} <strong>{rule.deductionValue} ₪/hr</strong>
                                </span>
                              )}
                              {type === "SICK_LEAVE" && (
                                <span style={{ fontSize: ".8rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "6px", padding: "2px 8px" }}>
                                  {isAr ? "معدل الأجر:" : "Pay rate:"} <strong>{rule.deductionValue}%</strong>
                                </span>
                              )}
                              {isAdmin && (
                                <button className="btn btn--ghost btn--sm" onClick={() => setEditRule({ type, thresholdMinutes: String(rule.thresholdMinutes), deductionValue: String(rule.deductionValue) })}>
                                  <Edit2 size={12} /> {isAr ? "تعديل" : "Edit"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </ModulePageShell>
  );
}
