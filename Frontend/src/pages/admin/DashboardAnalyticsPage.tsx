import { useCallback, useEffect, useState } from "react";
import {
  Users, Factory, Cpu, TrendingUp, AlertTriangle, RefreshCw,
  Wrench, CheckSquare, ShoppingCart, DollarSign, Package,
  UserCheck, Clock, BarChart2, Activity, UserPlus,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { API_BASE_URL, readApiError } from "../../lib/api";

type Overview = {
  totalUsers: number;
  activeUsers: number;
  usersByRole: { role: string; count: number }[];
  attendanceToday: number;
  lateToday: number;
  pendingRegistrations: number;
  production: {
    todayRecords: number;
    todayCartons: number;
    todayPieces: number;
    weekPieces: number;
    weekCartons: number;
    monthPieces: number;
    monthCartons: number;
  };
  totalMachines: number;
  operationalMachines: number;
  machinesByStatus: { status: string; count: number }[];
  totalRawMaterials: number;
  outOfStockCount: number;
  lowStockMaterials: { id: number; name: string; currentQuantity: number; unit: string; minQuantity: number }[];
  maintenanceThisMonth: number;
  overdueSchedules: number;
  pendingSchedules: number;
  qualityThisWeek: number;
  openQualityIssues: number;
  qualityBySeverity: { severity: string; count: number }[];
  salesThisMonth: number;
  salesCountThisMonth: number;
  purchasesThisMonth: number;
  purchasesCountThisMonth: number;
  expensesPending: number;
  expensesThisMonth: number;
  invoicesPending: number;
  invoicesOverdue: number;
  payrollThisMonth: number;
  totalShifts: number;
  recentProduction: { id: number; workerName: string; machineName: string; totalPieces: number; cartonsCount: number; createdAt: string }[];
  recentMaintenance: { id: number; engineerName: string; machineName: string; downtimeReason: string; downtimeMinutes: number | null; createdAt: string }[];
};

/* ── Helpers ──────────────────────────────────────────────── */
function fmt(n: number, dec = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: dec });
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

const MACHINE_STATUS_COLOR: Record<string, string> = {
  OPERATIONAL: "#22c55e",
  UNDER_MAINTENANCE: "#f97316",
  BROKEN: "#ef4444",
  OFFLINE: "#94a3b8",
  DECOMMISSIONED: "#64748b",
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
};

const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: "linear-gradient(135deg,#f97316,#ea580c)",
  ENGINEER: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  ACCOUNTANT: "linear-gradient(135deg,#10b981,#059669)",
  WORKER: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
};

/* ── Sub-components ───────────────────────────────────────── */
function HeroCard({ icon, label, value, sub, gradient, alert }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  gradient: string; alert?: boolean;
}) {
  return (
    <div style={{ background: gradient, borderRadius: 14, padding: "1.1rem 1.25rem", color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,.12)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -10, top: -10, opacity: .15, transform: "scale(2.8)" }}>{icon}</div>
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem", opacity: .9 }}>
        {icon}
        <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
        {alert && <span style={{ marginLeft: "auto", background: "rgba(255,255,255,.25)", borderRadius: 999, padding: "1px 6px", fontSize: ".62rem", fontWeight: 800 }}>!</span>}
      </div>
      <p style={{ margin: 0, fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: ".25rem 0 0", fontSize: ".75rem", opacity: .8 }}>{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 14, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem" }}>
        <span style={{ color: "var(--orange-500,#f97316)" }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: ".9rem", fontWeight: 800 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".3rem", fontSize: ".8rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <strong style={{ color: "var(--text-primary)" }}>{fmt(value)}{suffix}</strong>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "var(--border-default)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".5rem .75rem", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
      <span style={{ fontSize: ".8rem", color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: ".9rem", fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export function DashboardAnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/overview`, { credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res));
      setData((await res.json()) as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const d = data;

  const totalAlerts = d
    ? d.outOfStockCount + d.overdueSchedules + d.invoicesOverdue + d.expensesPending + d.pendingRegistrations
    : 0;

  const attendanceRate = d && d.activeUsers > 0
    ? Math.round((d.attendanceToday / d.activeUsers) * 100)
    : 0;

  const machineHealth = d && d.totalMachines > 0
    ? Math.round((d.operationalMachines / d.totalMachines) * 100)
    : 0;

  const profit = d ? d.salesThisMonth - d.purchasesThisMonth - d.expensesThisMonth : 0;

  return (
    <ModulePageShell
      title="Dashboard Analytics"
      subtitle="Live overview of every system module"
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: ".35rem", animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {error && (
        <div style={{ padding: ".75rem 1rem", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#dc2626", marginBottom: "1rem", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading && !d && (
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <span className="spinner" style={{ margin: "0 auto", width: 36, height: 36 }} />
        </div>
      )}

      {d && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Hero KPI Strip ─────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "1rem" }}>
            <HeroCard icon={<Users size={18} />} label="Active Users" value={d.activeUsers}
              sub={`${d.totalUsers} total · ${d.pendingRegistrations} pending`}
              gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" alert={d.pendingRegistrations > 0} />
            <HeroCard icon={<Factory size={18} />} label="Production Today" value={fmt(d.production.todayPieces)}
              sub={`${fmt(d.production.todayCartons)} cartons · ${d.production.todayRecords} records`}
              gradient="linear-gradient(135deg,#f97316,#ea580c)" />
            <HeroCard icon={<Cpu size={18} />} label="Machines" value={`${d.operationalMachines}/${d.totalMachines}`}
              sub={`${machineHealth}% operational`}
              gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)" alert={d.overdueSchedules > 0} />
            <HeroCard icon={<TrendingUp size={18} />} label="Revenue / Month" value={`SAR ${fmtMoney(d.salesThisMonth)}`}
              sub={`${d.salesCountThisMonth} sales · ${profit >= 0 ? "+" : ""}${fmtMoney(profit)} net`}
              gradient={profit >= 0 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)"}
            />
            <HeroCard icon={<CheckSquare size={18} />} label="Open Quality Issues" value={d.openQualityIssues}
              sub={`${d.qualityThisWeek} checks this week`}
              gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" alert={d.openQualityIssues > 0} />
            <HeroCard icon={<AlertTriangle size={18} />} label="Active Alerts" value={totalAlerts}
              sub={`${d.outOfStockCount} out of stock · ${d.overdueSchedules} overdue`}
              gradient={totalAlerts > 0 ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "linear-gradient(135deg,#64748b,#475569)"}
              alert={totalAlerts > 0} />
          </div>

          {/* ── Row 1: People + Production ─────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>

            {/* People */}
            <SectionCard title="People & Attendance" icon={<Users size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                {(["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"] as const).map((role) => {
                  const count = d.usersByRole.find((r) => r.role === role)?.count ?? 0;
                  return (
                    <div key={role} style={{ background: ROLE_GRADIENT[role], borderRadius: 10, padding: ".6rem .8rem", color: "#fff" }}>
                      <p style={{ margin: 0, fontSize: ".65rem", opacity: .85, fontWeight: 700, textTransform: "uppercase" }}>{role}</p>
                      <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, lineHeight: 1 }}>{count}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <StatPill label="Checked in today" value={d.attendanceToday} color="#16a34a" />
                <StatPill label="Late arrivals today" value={d.lateToday} color={d.lateToday > 0 ? "#f97316" : "#16a34a"} />
                <StatPill label="Attendance rate" value={attendanceRate} color={attendanceRate >= 80 ? "#16a34a" : "#f97316"} />
                <StatPill label="Pending registrations" value={d.pendingRegistrations} color={d.pendingRegistrations > 0 ? "#f97316" : "#64748b"} />
              </div>
            </SectionCard>

            {/* Production */}
            <SectionCard title="Production Output" icon={<Factory size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".5rem", textAlign: "center" }}>
                {[
                  { label: "Today", pieces: d.production.todayPieces, cartons: d.production.todayCartons },
                  { label: "This Week", pieces: d.production.weekPieces, cartons: d.production.weekCartons },
                  { label: "This Month", pieces: d.production.monthPieces, cartons: d.production.monthCartons },
                ].map((p) => (
                  <div key={p.label} style={{ background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.15)", borderRadius: 10, padding: ".6rem .4rem" }}>
                    <p style={{ margin: "0 0 .25rem", fontSize: ".65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{p.label}</p>
                    <p style={{ margin: "0 0 .1rem", fontSize: "1.1rem", fontWeight: 900, color: "#f97316" }}>{fmtMoney(p.pieces)}</p>
                    <p style={{ margin: 0, fontSize: ".68rem", color: "var(--text-secondary)" }}>pcs</p>
                    <p style={{ margin: ".2rem 0 0", fontSize: ".75rem", fontWeight: 700, color: "var(--text-primary)" }}>{fmtMoney(p.cartons)}<span style={{ fontSize: ".6rem", fontWeight: 400, color: "var(--text-secondary)" }}> ctn</span></p>
                  </div>
                ))}
              </div>
              <BarRow label="Today vs Week" value={d.production.todayPieces} max={d.production.weekPieces || 1} color="#f97316" />
              <BarRow label="Week vs Month" value={d.production.weekPieces} max={d.production.monthPieces || 1} color="#fb923c" />
            </SectionCard>

          </div>

          {/* ── Row 2: Machines + Inventory ────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>

            {/* Machines */}
            <SectionCard title="Machine Status" icon={<Cpu size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                {d.machinesByStatus.length === 0
                  ? <p style={{ margin: 0, fontSize: ".85rem", color: "var(--text-secondary)" }}>No machines recorded.</p>
                  : d.machinesByStatus.map((m) => (
                    <div key={m.status} style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".45rem .75rem", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: MACHINE_STATUS_COLOR[m.status] ?? "#94a3b8", flexShrink: 0 }} />
                      <span style={{ fontSize: ".8rem", fontWeight: 600, flex: 1 }}>{m.status.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: ".85rem", fontWeight: 800, color: MACHINE_STATUS_COLOR[m.status] ?? "inherit" }}>{m.count}</span>
                      <div style={{ width: 60, height: 5, borderRadius: 999, background: "var(--border-default)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(m.count / (d.totalMachines || 1)) * 100}%`, background: MACHINE_STATUS_COLOR[m.status] ?? "#94a3b8" }} />
                      </div>
                    </div>
                  ))
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                <StatPill label="Overdue schedules" value={d.overdueSchedules} color={d.overdueSchedules > 0 ? "#ef4444" : "#16a34a"} />
                <StatPill label="Pending schedules" value={d.pendingSchedules} color={d.pendingSchedules > 0 ? "#f97316" : "#64748b"} />
                <StatPill label="Maintenance this month" value={d.maintenanceThisMonth} color="#8b5cf6" />
                <StatPill label="Health %" value={machineHealth} color={machineHealth >= 80 ? "#16a34a" : "#f97316"} />
              </div>
            </SectionCard>

            {/* Inventory */}
            <SectionCard title="Raw Material Inventory" icon={<Package size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".5rem", textAlign: "center" }}>
                {[
                  { label: "Total", value: d.totalRawMaterials, color: "#3b82f6" },
                  { label: "Low Stock", value: d.lowStockMaterials.length, color: "#f97316" },
                  { label: "Out of Stock", value: d.outOfStockCount, color: "#ef4444" },
                ].map((s) => (
                  <div key={s.label} style={{ borderRadius: 10, padding: ".65rem .4rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                    <p style={{ margin: "0 0 .2rem", fontSize: ".65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {d.lowStockMaterials.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                  <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>Low stock materials</p>
                  {d.lowStockMaterials.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".35rem .6rem", borderRadius: 7, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.15)" }}>
                      <span style={{ flex: 1, fontSize: ".78rem", fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: ".75rem", color: "#f97316", fontWeight: 700 }}>{fmt(m.currentQuantity, 1)} / {fmt(m.minQuantity, 1)} {m.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: ".83rem", color: "#16a34a", fontWeight: 600 }}>✓ All materials above minimum stock levels</p>
              )}
            </SectionCard>

          </div>

          {/* ── Row 3: Finance + Quality ────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>

            {/* Finance */}
            <SectionCard title="Finance — This Month" icon={<DollarSign size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                {[
                  { label: "Sales Revenue", value: d.salesThisMonth, color: "#10b981", icon: <ArrowUpRight size={13} /> },
                  { label: "Purchases", value: d.purchasesThisMonth, color: "#f97316", icon: <ArrowDownRight size={13} /> },
                  { label: "Expenses", value: d.expensesThisMonth, color: "#ef4444", icon: <ArrowDownRight size={13} /> },
                  { label: "Payroll", value: d.payrollThisMonth, color: "#8b5cf6", icon: <DollarSign size={13} /> },
                ].map((f) => (
                  <div key={f.label} style={{ padding: ".65rem .75rem", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".3rem", marginBottom: ".2rem" }}>
                      <span style={{ color: f.color }}>{f.icon}</span>
                      <span style={{ fontSize: ".67rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{f.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, color: f.color }}>SAR {fmtMoney(f.value)}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: ".7rem .9rem", borderRadius: 10, background: profit >= 0 ? "rgba(16,185,129,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${profit >= 0 ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)"}` }}>
                <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-secondary)" }}>Estimated Profit</span>
                <p style={{ margin: ".1rem 0 0", fontSize: "1.25rem", fontWeight: 900, color: profit >= 0 ? "#10b981" : "#ef4444" }}>
                  {profit >= 0 ? "+" : ""}SAR {fmtMoney(profit)}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".4rem" }}>
                <StatPill label="Invoices pending" value={d.invoicesPending} color={d.invoicesPending > 0 ? "#f97316" : "#64748b"} />
                <StatPill label="Overdue invoices" value={d.invoicesOverdue} color={d.invoicesOverdue > 0 ? "#ef4444" : "#64748b"} />
                <StatPill label="Pending expenses" value={d.expensesPending} color={d.expensesPending > 0 ? "#f97316" : "#64748b"} />
              </div>
            </SectionCard>

            {/* Quality */}
            <SectionCard title="Quality & Maintenance" icon={<CheckSquare size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>Quality Issues by Severity</p>
                {d.qualityBySeverity.length === 0
                  ? <p style={{ margin: 0, fontSize: ".85rem", color: "#16a34a", fontWeight: 600 }}>✓ No quality issues recorded</p>
                  : d.qualityBySeverity.map((q) => {
                    const maxQ = Math.max(...d.qualityBySeverity.map((x) => x.count), 1);
                    return (
                      <BarRow key={q.severity} label={q.severity} value={q.count} max={maxQ}
                        color={SEVERITY_COLOR[q.severity] ?? "#94a3b8"} />
                    );
                  })
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                <StatPill label="Open issues" value={d.openQualityIssues} color={d.openQualityIssues > 0 ? "#ef4444" : "#16a34a"} />
                <StatPill label="Checks this week" value={d.qualityThisWeek} color="#0ea5e9" />
                <StatPill label="Maint. this month" value={d.maintenanceThisMonth} color="#8b5cf6" />
                <StatPill label="Total shifts" value={d.totalShifts} color="#64748b" />
              </div>
            </SectionCard>

          </div>

          {/* ── Row 4: Recent Activity ──────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1rem" }}>

            {/* Recent Production */}
            <SectionCard title="Today's Production Records" icon={<Activity size={16} />}>
              {d.recentProduction.length === 0 ? (
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>No production records today.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                        {["Worker", "Machine", "Pieces", "Cartons", "Time"].map((h) => (
                          <th key={h} style={{ padding: ".35rem .5rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentProduction.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                          <td style={{ padding: ".4rem .5rem", fontWeight: 600 }}>{r.workerName}</td>
                          <td style={{ padding: ".4rem .5rem", color: "var(--text-secondary)" }}>{r.machineName}</td>
                          <td style={{ padding: ".4rem .5rem", fontWeight: 700, color: "#f97316" }}>{fmt(r.totalPieces)}</td>
                          <td style={{ padding: ".4rem .5rem", color: "var(--text-secondary)" }}>{fmt(r.cartonsCount)}</td>
                          <td style={{ padding: ".4rem .5rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{timeAgo(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Recent Maintenance */}
            <SectionCard title="Recent Maintenance" icon={<Wrench size={16} />}>
              {d.recentMaintenance.length === 0 ? (
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>No maintenance records this month.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {d.recentMaintenance.map((m) => (
                    <div key={m.id} style={{ padding: ".5rem .75rem", borderRadius: 9, background: "var(--bg-surface)", border: "1px solid var(--border-default)", display: "flex", gap: ".65rem", alignItems: "flex-start" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 700 }}>{m.machineName}</p>
                        <p style={{ margin: ".1rem 0 0", fontSize: ".73rem", color: "var(--text-secondary)" }}>
                          {m.engineerName} · {m.downtimeReason?.replace(/_/g, " ") ?? "N/A"}
                          {m.downtimeMinutes ? ` · ${m.downtimeMinutes}min` : ""}
                        </p>
                      </div>
                      <span style={{ fontSize: ".7rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{timeAgo(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

          </div>

          {/* ── Alerts Panel ────────────────────────────────── */}
          {totalAlerts > 0 && (
            <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 14, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem" }}>
                <AlertTriangle size={18} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 800, color: "#ef4444" }}>Action Required — {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: ".6rem" }}>
                {d.outOfStockCount > 0 && (
                  <AlertItem icon={<Package size={14} />} label={`${d.outOfStockCount} material${d.outOfStockCount !== 1 ? "s" : ""} out of stock`} color="#ef4444" />
                )}
                {d.overdueSchedules > 0 && (
                  <AlertItem icon={<Clock size={14} />} label={`${d.overdueSchedules} overdue maintenance schedule${d.overdueSchedules !== 1 ? "s" : ""}`} color="#ef4444" />
                )}
                {d.invoicesOverdue > 0 && (
                  <AlertItem icon={<BarChart2 size={14} />} label={`${d.invoicesOverdue} overdue invoice${d.invoicesOverdue !== 1 ? "s" : ""}`} color="#f97316" />
                )}
                {d.expensesPending > 0 && (
                  <AlertItem icon={<DollarSign size={14} />} label={`${d.expensesPending} expense${d.expensesPending !== 1 ? "s" : ""} awaiting approval`} color="#f97316" />
                )}
                {d.pendingRegistrations > 0 && (
                  <AlertItem icon={<UserPlus size={14} />} label={`${d.pendingRegistrations} user registration request${d.pendingRegistrations !== 1 ? "s" : ""} pending`} color="#3b82f6" />
                )}
                {d.openQualityIssues > 0 && (
                  <AlertItem icon={<CheckSquare size={14} />} label={`${d.openQualityIssues} unresolved quality issue${d.openQualityIssues !== 1 ? "s" : ""}`} color="#0ea5e9" />
                )}
              </div>
            </div>
          )}

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ModulePageShell>
  );
}

function AlertItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".5rem .75rem", borderRadius: 8, background: "#fff", border: `1px solid ${color}33` }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
    </div>
  );
}
