import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  Factory,
  Camera,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type AttendanceRecord = {
  id: number;
  checkIn: string;
  checkOut: string | null;
  overtimeMinutes: number;
  leaveType: string | null;
  shift?: { name: string } | null;
};

type DailyPayroll = {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  deductionAmount: number;
  deductionNotes: string | null;
  isConfirmed: boolean;
  attendance?: { checkIn: string; checkOut: string | null } | null;
};

type MonthlyPayroll = {
  id: number;
  month: string;
  totalHours: number;
  baseSalary: number;
  overtimeSalary: number;
  totalSalary: number;
};

type ProductionRecord = {
  id: number;
  createdAt: string;
  productType: string;
  goodCount: number;
  defectCount: number;
  shift?: { name: string } | null;
  machine?: { name: string; type: string } | null;
};

type Snapshot = {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
};

type MachineStop = {
  id: number;
  createdAt: string;
  machineId?: number;
  reason: string;
  durationMinutes: number;
  notes?: string | null;
};

type ChecklistItem = {
  id: number;
  createdAt: string;
  shiftDate: string;
  completedItems: number;
  totalItems: number;
  notes?: string | null;
};

type WasteLog = {
  id: number;
  createdAt: string;
  materialType: string;
  wasteKg: number;
  reason?: string | null;
};

type KaizenIdea = {
  id: number;
  createdAt: string;
  title: string;
  description: string;
  status?: string;
};

type QualityIssue = {
  id: number;
  createdAt: string;
  issueType: string;
  severity: string;
  description: string;
};

type MicroStop = {
  id: number;
  createdAt: string;
  reason: string;
  durationMinutes: number;
};

type DailyTarget = {
  id: number;
  created_at: string;
  target_date: string;
  target_units: number;
  actual_units: number;
  note: string | null;
  achieved: boolean;
  achievementRatio: number;
};

type ElectricityAnomaly = {
  id: number;
  created_at: string;
  machine_label: string;
  current_kwh: number;
  baseline_kwh: number;
  severity: string;
  message: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path: string) {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: authHeader(),
  });
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}
function fmtTime(d: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d));
}
function fmtDateTime(d: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d));
}
function hoursFromDates(checkIn: string, checkOut: string | null) {
  if (!checkOut) return null;
  return ((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000).toFixed(1);
}

const LEAVE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SICK:   { label: "Sick",   color: "#b91c1c", bg: "#fee2e2" },
  ANNUAL: { label: "Annual", color: "#1d4ed8", bg: "#dbeafe" },
  UNPAID: { label: "Unpaid", color: "#92400e", bg: "#fef3c7" },
};

type HubTab = "attendance" | "payroll" | "production" | "readings" | "tools";

const TOOL_TABS = ["stops", "checklist", "waste", "target", "kaizen", "quality", "micro", "anomaly"] as const;
type ToolTab = typeof TOOL_TABS[number];

const TOOL_LABELS: Record<ToolTab, { en: string; ar: string; icon: string }> = {
  stops:     { en: "Machine Stops",       ar: "توقف الماكينات",   icon: "🛑" },
  checklist: { en: "Checklist",           ar: "قائمة اليوم",      icon: "✅" },
  waste:     { en: "Material Waste",      ar: "هدر المواد",       icon: "🗑️" },
  target:    { en: "Daily Targets",       ar: "الأهداف اليومية",  icon: "🎯" },
  kaizen:    { en: "Kaizen Ideas",        ar: "أفكار كايزن",      icon: "💡" },
  quality:   { en: "Quality Issues",      ar: "مشاكل الجودة",     icon: "🔍" },
  micro:     { en: "Micro Stops",         ar: "توقفات مايكرو",    icon: "⏱️" },
  anomaly:   { en: "Electricity Alerts",  ar: "تنبيهات الكهرباء", icon: "⚡" },
};

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>{icon}</div>
      <p style={{ margin: 0, fontSize: ".9rem" }}>{message}</p>
    </div>
  );
}

// ─── Card row ────────────────────────────────────────────────────────────────

function HubCard({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "linear-gradient(135deg,rgba(59,130,246,.05),rgba(139,92,246,.04))" : "var(--bg-surface)",
      border: `1px solid ${highlight ? "rgba(59,130,246,.25)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-lg)",
      padding: ".85rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: ".35rem",
    }}>
      {children}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function WorkerHubPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<HubTab>("attendance");
  const [toolTab, setToolTab] = useState<ToolTab>("stops");

  // Data states
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dailyPayroll, setDailyPayroll] = useState<DailyPayroll[]>([]);
  const [monthlyPayroll, setMonthlyPayroll] = useState<MonthlyPayroll[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [machineStops, setMachineStops] = useState<MachineStop[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [waste, setWaste] = useState<WasteLog[]>([]);
  const [kaizen, setKaizen] = useState<KaizenIdea[]>([]);
  const [quality, setQuality] = useState<QualityIssue[]>([]);
  const [microStops, setMicroStops] = useState<MicroStop[]>([]);
  const [targets, setTargets] = useState<DailyTarget[]>([]);
  const [anomalies, setAnomalies] = useState<ElectricityAnomaly[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Payroll sub-tab
  const [payrollView, setPayrollView] = useState<"daily" | "monthly">("daily");

  const loadTab = useCallback(async (t: HubTab) => {
    setLoading(true);
    setError("");
    try {
      if (t === "attendance") {
        const res = await api("/attendance/me");
        if (!res.ok) throw new Error(await readApiError(res));
        setAttendance((await res.json()) as AttendanceRecord[]);
      } else if (t === "payroll") {
        const [dr, mr] = await Promise.all([
          api("/payroll/daily/me"),
          api("/payroll/me"),
        ]);
        if (!dr.ok) throw new Error(await readApiError(dr));
        if (!mr.ok) throw new Error(await readApiError(mr));
        const dailyData = await dr.json() as { records: DailyPayroll[]; confirmedTotal: number };
        setDailyPayroll(dailyData.records ?? []);
        setMonthlyPayroll((await mr.json()) as MonthlyPayroll[]);
      } else if (t === "production") {
        const res = await api("/production/me");
        if (!res.ok) throw new Error(await readApiError(res));
        setProductions((await res.json()) as ProductionRecord[]);
      } else if (t === "readings") {
        const res = await api("/settings/snapshots/mine?limit=50");
        if (!res.ok) throw new Error(await readApiError(res));
        setSnapshots((await res.json()) as Snapshot[]);
      } else if (t === "tools") {
        const [sr, cr, wr, tr, kr, qr, mr, ar] = await Promise.all([
          api("/worker-tools/machine-stop-alerts/mine"),
          api("/worker-tools/shift-checklists/mine"),
          api("/worker-tools/material-waste/mine"),
          api("/worker-tools/daily-targets/mine"),
          api("/worker-tools/kaizen/mine"),
          api("/worker-tools/quality-issues/mine"),
          api("/worker-tools/micro-stops/mine"),
          api("/worker-tools/electricity-anomaly-alerts/mine"),
        ]);
        if (sr.ok) setMachineStops((await sr.json()) as MachineStop[]);
        if (cr.ok) setChecklists((await cr.json()) as ChecklistItem[]);
        if (wr.ok) setWaste((await wr.json()) as WasteLog[]);
        if (tr.ok) setTargets((await tr.json()) as DailyTarget[]);
        if (kr.ok) setKaizen((await kr.json()) as KaizenIdea[]);
        if (qr.ok) setQuality((await qr.json()) as QualityIssue[]);
        if (mr.ok) setMicroStops((await mr.json()) as MicroStop[]);
        if (ar.ok) setAnomalies((await ar.json()) as ElectricityAnomaly[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  // Summary counts for KPI bar
  const counts = useMemo(() => ({
    attendance: attendance.length,
    dailyPay: dailyPayroll.length,
    confirmedPay: dailyPayroll.filter(r => r.isConfirmed).length,
    totalEarned: dailyPayroll.filter(r => r.isConfirmed).reduce((s, r) => s + r.totalDailyPay, 0),
    productions: productions.length,
    snapshots: snapshots.length,
  }), [attendance, dailyPayroll, productions, snapshots]);

  const tabs: { key: HubTab; label: string; labelAr: string; icon: React.ReactNode; color: string }[] = [
    { key: "attendance",  label: "Attendance",  labelAr: "الحضور",          icon: <Calendar size={16} />,   color: "#3b82f6" },
    { key: "payroll",     label: "My Pay",      labelAr: "راتبي",            icon: <DollarSign size={16} />, color: "#10b981" },
    { key: "production",  label: "Production",  labelAr: "الإنتاج",          icon: <Factory size={16} />,    color: "#f59e0b" },
    { key: "readings",    label: "Readings",    labelAr: "قراءاتي",          icon: <Camera size={16} />,     color: "#8b5cf6" },
    { key: "tools",       label: "Tool Logs",   labelAr: "سجلات الأدوات",   icon: <Wrench size={16} />,     color: "#ef4444" },
  ];

  return (
    <ModulePageShell
      title={isAr ? "مركز العمليات" : "Work Operation Hub"}
      subtitle={isAr ? "كل سجلاتك في مكان واحد" : "All your records in one place"}
      actions={
        <button className="btn btn--ghost btn--sm" onClick={() => void loadTab(tab)}>
          <RefreshCw size={14} /> {isAr ? "تحديث" : "Refresh"}
        </button>
      }
    >
      {/* Welcome strip */}
      <div style={{
        background: "linear-gradient(135deg,#1e40af,#4f46e5)",
        borderRadius: "var(--radius-xl)",
        padding: "1.1rem 1.5rem",
        marginBottom: "1.5rem",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
          👷
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{user?.fullName ?? "Worker"}</p>
          <p style={{ margin: ".15rem 0 0", opacity: .8, fontSize: ".83rem" }}>
            {isAr ? "مركز عمليات الموظف — اعرض جميع سجلاتك الشخصية" : "Employee operation hub — view all your personal records"}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-default)", paddingBottom: "1rem" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
              padding: ".5rem 1rem",
              borderRadius: "var(--radius-lg)",
              border: tab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
              background: tab === t.key ? `${t.color}14` : "var(--bg-surface)",
              color: tab === t.key ? t.color : "var(--text-secondary)",
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: ".85rem",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {t.icon}
            {isAr ? t.labelAr : t.label}
          </button>
        ))}
      </div>

      {error && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : (
        <>
          {/* ── ATTENDANCE ── */}
          {tab === "attendance" && (
            <>
              {/* Summary chips */}
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {[
                  { label: isAr ? "إجمالي السجلات" : "Total Records", value: attendance.length, color: "#3b82f6" },
                  { label: isAr ? "أيام كاملة" : "Full Days", value: attendance.filter(r => r.checkOut).length, color: "#10b981" },
                  { label: isAr ? "قيد التشغيل" : "Active/Missing", value: attendance.filter(r => !r.checkOut).length, color: "#f59e0b" },
                ].map((chip) => (
                  <div key={chip.label} style={{ background: chip.color + "14", border: `1px solid ${chip.color}33`, borderRadius: "var(--radius-lg)", padding: ".5rem .9rem", display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem", color: chip.color }}>{chip.value}</span>
                    <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{chip.label}</span>
                  </div>
                ))}
              </div>

              {attendance.length === 0 ? (
                <EmptyState icon="📅" message={isAr ? "لا توجد سجلات حضور بعد" : "No attendance records yet"} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                  {attendance.slice(0, 60).map((r) => {
                    const hours = hoursFromDates(r.checkIn, r.checkOut);
                    const leaveBadge = r.leaveType ? LEAVE_BADGE[r.leaveType] : null;
                    const missing = !r.checkOut;
                    return (
                      <HubCard key={r.id} highlight={missing}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <Calendar size={14} style={{ color: "var(--blue-600)", flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{fmtDate(r.checkIn)}</span>
                            {r.shift && <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>· {r.shift.name}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                            {leaveBadge && (
                              <span style={{ background: leaveBadge.bg, border: `1px solid ${leaveBadge.color}44`, borderRadius: "4px", padding: "1px 7px", color: leaveBadge.color, fontSize: ".73rem", fontWeight: 700 }}>
                                {leaveBadge.label}
                              </span>
                            )}
                            {missing ? (
                              <span style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "4px", padding: "1px 7px", color: "#854d0e", fontSize: ".73rem", fontWeight: 700 }}>
                                ⚠ {isAr ? "لا يوجد خروج" : "No check-out"}
                              </span>
                            ) : (
                              <span style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "4px", padding: "1px 7px", color: "#15803d", fontSize: ".73rem", fontWeight: 700 }}>
                                ✓ {isAr ? "مكتمل" : "Complete"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                          <span><Clock size={12} style={{ verticalAlign: "middle" }} /> {fmtTime(r.checkIn)} → {r.checkOut ? fmtTime(r.checkOut) : "—"}</span>
                          {hours && <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{hours}h worked</span>}
                          {r.overtimeMinutes > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}>+{(r.overtimeMinutes / 60).toFixed(1)}h OT</span>}
                        </div>
                      </HubCard>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── PAYROLL ── */}
          {tab === "payroll" && (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {[
                  { label: isAr ? "إجمالي مكتسب (مؤكد)" : "Total Earned (confirmed)", value: `${dailyPayroll.filter(r => r.isConfirmed).reduce((s, r) => s + r.totalDailyPay, 0).toFixed(2)} ₪`, color: "#10b981" },
                  { label: isAr ? "سجلات يومية" : "Daily Records", value: dailyPayroll.length, color: "#3b82f6" },
                  { label: isAr ? "سجلات شهرية" : "Monthly Records", value: monthlyPayroll.length, color: "#8b5cf6" },
                ].map((chip) => (
                  <div key={chip.label} style={{ background: chip.color + "14", border: `1px solid ${chip.color}33`, borderRadius: "var(--radius-lg)", padding: ".5rem .9rem", display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: chip.color }}>{chip.value}</span>
                    <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{chip.label}</span>
                  </div>
                ))}
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: ".5rem", marginBottom: "1rem" }}>
                {(["daily", "monthly"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setPayrollView(v)}
                    style={{ padding: ".4rem .9rem", borderRadius: "var(--radius-md)", border: payrollView === v ? "2px solid #10b981" : "2px solid var(--border-default)", background: payrollView === v ? "#10b98114" : "transparent", color: payrollView === v ? "#10b981" : "var(--text-secondary)", fontWeight: payrollView === v ? 700 : 500, fontSize: ".83rem", cursor: "pointer" }}>
                    {v === "daily" ? (isAr ? "يومي" : "Daily") : (isAr ? "شهري" : "Monthly")}
                  </button>
                ))}
              </div>

              {payrollView === "daily" && (
                dailyPayroll.length === 0 ? <EmptyState icon="💰" message={isAr ? "لا توجد سجلات راتب يومي" : "No daily payroll records yet"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {dailyPayroll.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{fmtDate(r.date)}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#10b981" }}>{r.totalDailyPay.toFixed(2)} ₪</span>
                            {r.isConfirmed
                              ? <span style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "4px", padding: "1px 7px", color: "#15803d", fontSize: ".72rem", fontWeight: 700 }}><CheckCircle size={11} style={{ verticalAlign: "middle" }} /> {isAr ? "مؤكد" : "Confirmed"}</span>
                              : <span style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "4px", padding: "1px 7px", color: "#854d0e", fontSize: ".72rem", fontWeight: 700 }}><AlertCircle size={11} style={{ verticalAlign: "middle" }} /> {isAr ? "انتظار" : "Pending"}</span>
                            }
                          </div>
                        </div>
                        <div style={{ fontSize: ".81rem", color: "var(--text-secondary)", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                          <span><Clock size={11} style={{ verticalAlign: "middle" }} /> {r.hoursWorked.toFixed(1)}h</span>
                          <span>{isAr ? "المعدل:" : "Rate:"} {r.dailyRate.toFixed(2)} ₪/day</span>
                          {r.deductionAmount > 0 && <span style={{ color: "#ef4444" }}>−{r.deductionAmount.toFixed(2)} ₪ {r.deductionNotes ? `(${r.deductionNotes})` : ""}</span>}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {payrollView === "monthly" && (
                monthlyPayroll.length === 0 ? <EmptyState icon="📆" message={isAr ? "لا توجد سجلات راتب شهري" : "No monthly payroll records yet"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {monthlyPayroll.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".95rem" }}>{r.month}</span>
                          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}>{r.totalSalary.toLocaleString()} ₪</span>
                        </div>
                        <div style={{ fontSize: ".81rem", color: "var(--text-secondary)", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                          <span>{isAr ? "الساعات:" : "Hours:"} {r.totalHours.toFixed(1)}h</span>
                          <span>{isAr ? "أساسي:" : "Base:"} {r.baseSalary.toFixed(2)} ₪</span>
                          {r.overtimeSalary > 0 && <span style={{ color: "#f59e0b" }}>+{r.overtimeSalary.toFixed(2)} OT</span>}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}
            </>
          )}

          {/* ── PRODUCTION ── */}
          {tab === "production" && (
            <>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {[
                  { label: isAr ? "إجمالي السجلات" : "Total Records", value: productions.length, color: "#f59e0b" },
                  { label: isAr ? "إجمالي جيد" : "Total Good", value: productions.reduce((s, r) => s + r.goodCount, 0), color: "#10b981" },
                  { label: isAr ? "إجمالي عيوب" : "Total Defects", value: productions.reduce((s, r) => s + r.defectCount, 0), color: "#ef4444" },
                ].map((chip) => (
                  <div key={chip.label} style={{ background: chip.color + "14", border: `1px solid ${chip.color}33`, borderRadius: "var(--radius-lg)", padding: ".5rem .9rem", display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem", color: chip.color }}>{chip.value}</span>
                    <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{chip.label}</span>
                  </div>
                ))}
              </div>
              {productions.length === 0 ? <EmptyState icon="🏭" message={isAr ? "لا توجد سجلات إنتاج" : "No production records yet"} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                  {productions.slice(0, 50).map((r) => (
                    <HubCard key={r.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: ".4rem" }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{r.productType}</span>
                          {r.machine && <span style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginInlineStart: ".5rem" }}>· {r.machine.name}</span>}
                        </div>
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: ".82rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>✓ {r.goodCount} {isAr ? "جيد" : "good"}</span>
                        {r.defectCount > 0 && <span style={{ color: "#ef4444", fontWeight: 600 }}>✗ {r.defectCount} {isAr ? "معيب" : "defect"}</span>}
                        {r.shift && <span style={{ color: "var(--text-secondary)" }}>{r.shift.name}</span>}
                      </div>
                    </HubCard>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── READINGS ── */}
          {tab === "readings" && (
            <>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <div style={{ background: "#8b5cf614", border: "1px solid #8b5cf633", borderRadius: "var(--radius-lg)", padding: ".5rem .9rem", display: "flex", gap: ".4rem", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#8b5cf6" }}>{snapshots.length}</span>
                  <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{isAr ? "لقطات مسجلة" : "Snapshots recorded"}</span>
                </div>
              </div>
              {snapshots.length === 0 ? <EmptyState icon="📸" message={isAr ? "لا توجد قراءات بعد" : "No readings recorded yet"} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                  {snapshots.map((r) => (
                    <HubCard key={r.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".4rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{r.machineLabel}</span>
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                        <span>🔢 {isAr ? "العداد:" : "Counter:"} <strong style={{ color: "var(--text-primary)" }}>{r.machineCounter}</strong></span>
                        <span>⚡ {isAr ? "كهرباء:" : "Electricity:"} <strong style={{ color: "var(--text-primary)" }}>{r.electricityKwh.toFixed(2)} kWh</strong></span>
                      </div>
                      {r.notes && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{r.notes}</p>}
                    </HubCard>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── TOOL LOGS ── */}
          {tab === "tools" && (
            <>
              {/* Tool sub-tab pills */}
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {TOOL_TABS.map((tt) => {
                  const meta = TOOL_LABELS[tt];
                  return (
                    <button key={tt} type="button" onClick={() => setToolTab(tt)}
                      style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".35rem .8rem", borderRadius: "20px", border: toolTab === tt ? "2px solid #ef4444" : "1px solid var(--border-default)", background: toolTab === tt ? "#ef444414" : "var(--bg-surface)", color: toolTab === tt ? "#ef4444" : "var(--text-secondary)", fontWeight: toolTab === tt ? 700 : 500, fontSize: ".8rem", cursor: "pointer" }}>
                      <span>{meta.icon}</span>
                      {isAr ? meta.ar : meta.en}
                    </button>
                  );
                })}
              </div>

              {/* Machine Stops */}
              {toolTab === "stops" && (
                machineStops.length === 0 ? <EmptyState icon="🛑" message={isAr ? "لا توجد سجلات توقف" : "No machine stop records"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {machineStops.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem", color: "#ef4444" }}>🛑 {r.reason}</span>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>
                          <Clock size={12} style={{ verticalAlign: "middle" }} /> {r.durationMinutes} {isAr ? "دقيقة" : "min"}
                          {r.notes && <span style={{ marginInlineStart: ".75rem", fontStyle: "italic" }}>{r.notes}</span>}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Checklist */}
              {toolTab === "checklist" && (
                checklists.length === 0 ? <EmptyState icon="✅" message={isAr ? "لا توجد قوائم تحقق" : "No checklist records"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {checklists.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>✅ {isAr ? "قائمة التحقق" : "Checklist"} — {fmtDate(r.shiftDate)}</span>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>
                          {r.completedItems}/{r.totalItems} {isAr ? "بنود مكتملة" : "items completed"}
                          {r.notes && <span style={{ marginInlineStart: ".75rem", fontStyle: "italic" }}>{r.notes}</span>}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Waste */}
              {toolTab === "waste" && (
                waste.length === 0 ? <EmptyState icon="🗑️" message={isAr ? "لا توجد سجلات هدر" : "No waste records"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {waste.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>🗑️ {r.materialType}</span>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>
                          {isAr ? "الكمية:" : "Qty:"} <strong style={{ color: "#f59e0b" }}>{r.wasteKg} kg</strong>
                          {r.reason && <span style={{ marginInlineStart: ".75rem" }}>{r.reason}</span>}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Kaizen */}
              {toolTab === "kaizen" && (
                kaizen.length === 0 ? <EmptyState icon="💡" message={isAr ? "لا توجد أفكار كايزن" : "No kaizen ideas yet"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {kaizen.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>💡 {r.title}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                            {r.status && (
                              <span style={{ fontSize: ".72rem", background: "#dbeafe", color: "#1d4ed8", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>{r.status}</span>
                            )}
                            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>{r.description}</p>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Quality */}
              {toolTab === "quality" && (
                quality.length === 0 ? <EmptyState icon="🔍" message={isAr ? "لا توجد مشاكل جودة مسجلة" : "No quality issues recorded"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {quality.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>🔍 {r.issueType}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                            <span style={{ fontSize: ".72rem", background: r.severity === "HIGH" ? "#fee2e2" : r.severity === "MEDIUM" ? "#fef9c3" : "#dbeafe", color: r.severity === "HIGH" ? "#b91c1c" : r.severity === "MEDIUM" ? "#854d0e" : "#1d4ed8", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>{r.severity}</span>
                            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>{r.description}</p>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Micro stops */}
              {toolTab === "micro" && (
                microStops.length === 0 ? <EmptyState icon="⏱️" message={isAr ? "لا توجد توقفات مايكرو" : "No micro-stop records"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {microStops.map((r) => (
                      <HubCard key={r.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>⏱️ {r.reason}</span>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>
                          <Clock size={12} style={{ verticalAlign: "middle" }} /> {r.durationMinutes} {isAr ? "دقيقة" : "min"}
                        </div>
                      </HubCard>
                    ))}
                  </div>
                )
              )}

              {/* Daily Targets */}
              {toolTab === "target" && (
                targets.length === 0 ? <EmptyState icon="🎯" message={isAr ? "لا توجد أهداف يومية" : "No daily target records"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {targets.map((r) => {
                      const pct = Math.round(r.achievementRatio * 100);
                      return (
                        <HubCard key={r.id} highlight={!r.achieved}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                            <span style={{ fontWeight: 700, fontSize: ".9rem" }}>🎯 {r.target_date?.slice(0, 10)}</span>
                            <span style={{ fontSize: ".75rem", background: r.achieved ? "#dcfce7" : "#fee2e2", color: r.achieved ? "#15803d" : "#b91c1c", borderRadius: "4px", padding: "1px 7px", fontWeight: 700 }}>
                              {r.achieved ? (isAr ? "✓ محقق" : "✓ Achieved") : (isAr ? "✗ لم يتحقق" : "✗ Not achieved")}
                            </span>
                          </div>
                          <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                            <span>{isAr ? "الهدف:" : "Target:"} <strong style={{ color: "var(--text-primary)" }}>{r.target_units}</strong></span>
                            <span>{isAr ? "الفعلي:" : "Actual:"} <strong style={{ color: r.achieved ? "#10b981" : "#ef4444" }}>{r.actual_units}</strong></span>
                            <span style={{ color: r.achieved ? "#10b981" : "#f59e0b" }}>{pct}%</span>
                          </div>
                          {r.note && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{r.note}</p>}
                        </HubCard>
                      );
                    })}
                  </div>
                )
              )}

              {/* Electricity Alerts */}
              {toolTab === "anomaly" && (
                anomalies.length === 0 ? <EmptyState icon="⚡" message={isAr ? "لا توجد تنبيهات كهرباء" : "No electricity alerts recorded"} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                    {anomalies.map((r) => (
                      <HubCard key={r.id} highlight={r.severity === "CRITICAL"}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>⚡ {r.machine_label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                            <span style={{ fontSize: ".72rem", background: r.severity === "CRITICAL" ? "#fee2e2" : "#fef9c3", color: r.severity === "CRITICAL" ? "#b91c1c" : "#854d0e", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>{r.severity}</span>
                            <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{fmtDateTime(r.created_at)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                          <span>{isAr ? "الحالي:" : "Current:"} <strong style={{ color: "#ef4444" }}>{Number(r.current_kwh).toFixed(2)} kWh</strong></span>
                          <span>{isAr ? "الأساس:" : "Baseline:"} <strong>{Number(r.baseline_kwh).toFixed(2)} kWh</strong></span>
                        </div>
                        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{r.message}</p>
                      </HubCard>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </ModulePageShell>
  );
}
