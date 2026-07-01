import { useCallback, useEffect, useState } from "react";
import {
  Users, Factory, Cpu, TrendingUp, AlertTriangle, RefreshCw,
  Wrench, CheckSquare, ShoppingCart, DollarSign, Package,
  UserCheck, Clock, BarChart2, Activity, UserPlus,
  ArrowUpRight, ArrowDownRight, BarChart,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { API_BASE_URL, readApiError } from "../../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Overview = {
  totalUsers: number; activeUsers: number;
  usersByRole: { role: string; count: number }[];
  attendanceToday: number; lateToday: number; pendingRegistrations: number;
  production: { todayRecords: number; todayCartons: number; todayPieces: number; weekPieces: number; weekCartons: number; monthPieces: number; monthCartons: number };
  totalMachines: number; operationalMachines: number;
  machinesByStatus: { status: string; count: number }[];
  totalRawMaterials: number; outOfStockCount: number;
  lowStockMaterials: { id: number; name: string; currentQuantity: number; unit: string; minQuantity: number }[];
  maintenanceThisMonth: number; overdueSchedules: number; pendingSchedules: number;
  qualityThisWeek: number; openQualityIssues: number;
  qualityBySeverity: { severity: string; count: number }[];
  salesThisMonth: number; salesCountThisMonth: number;
  purchasesThisMonth: number; purchasesCountThisMonth: number;
  expensesPending: number; expensesThisMonth: number;
  invoicesPending: number; invoicesOverdue: number;
  payrollThisMonth: number; totalShifts: number;
  recentProduction: { id: number; workerName: string; machineName: string; totalPieces: number; cartonsCount: number; createdAt: string }[];
  recentMaintenance: { id: number; engineerName: string; machineName: string; downtimeReason: string; downtimeMinutes: number | null; createdAt: string }[];
};

type ChartData = {
  productionByDay:  { date: string; pieces: number; cartons: number }[];
  electricityByDay: { date: string; kwh: number }[];
  salesByMonth:     { month: string; amount: number }[];
  expensesByMonth:  { month: string; amount: number }[];
  attendanceByDay:  { date: string; present: number; late: number }[];
  maintenanceByMonth: { month: string; count: number }[];
  quotationsByStatus: { status: string; count: number }[];
  qualityBySeverity:  { severity: string; count: number }[];
  machinesByStatus:   { status: string; count: number }[];
  usersByRole:        { role: string; count: number }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) { return n.toLocaleString("en-US", { maximumFractionDigits: dec }); }
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن"; if (m < 60) return `${m}د`;
  if (m < 1440) return `${Math.floor(m / 60)}س`;
  return `${Math.floor(m / 1440)}ي`;
}
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Color Maps ───────────────────────────────────────────────────────────────

const MACHINE_STATUS_COLOR: Record<string, string> = {
  OPERATIONAL: "#22c55e", UNDER_MAINTENANCE: "#f97316", BROKEN: "#ef4444", OFFLINE: "#94a3b8", DECOMMISSIONED: "#64748b",
};
const SEVERITY_COLOR: Record<string, string> = { LOW: "#22c55e", MEDIUM: "#f97316", HIGH: "#ef4444", CRITICAL: "#7c3aed" };
const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: "linear-gradient(135deg,#f97316,#ea580c)", ENGINEER: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  ACCOUNTANT: "linear-gradient(135deg,#10b981,#059669)", WORKER: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
};
const ROLE_COLOR: Record<string, string> = { ADMIN: "#f97316", ENGINEER: "#8b5cf6", ACCOUNTANT: "#10b981", WORKER: "#3b82f6", SALES_REP: "#0ea5e9" };
const QUOTATION_COLOR: Record<string, string> = { PENDING: "#f59e0b", APPROVED: "#22c55e", REJECTED: "#ef4444", SENT: "#3b82f6", DRAFT: "#94a3b8" };

// ─── Overview Sub-components ─────────────────────────────────────────────────

function HeroCard({ icon, label, value, sub, gradient, alert }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; gradient: string; alert?: boolean;
}) {
  const color = gradient.includes("3b82f6") ? "#3b82f6"
    : gradient.includes("10b981") ? "#10b981"
    : gradient.includes("f97316") || gradient.includes("f59e0b") ? "#f97316"
    : gradient.includes("8b5cf6") ? "#8b5cf6"
    : gradient.includes("ef4444") ? "#ef4444"
    : gradient.includes("0ea5e9") ? "#0ea5e9"
    : "#f97316";
  return (
    <div className="kpi-cell" style={{ "--kpi-color": color, "--kpi-bg": `${color}14` } as React.CSSProperties}>
      <div className="kpi-cell__icon-wrap">{icon}</div>
      <div className="kpi-cell__label">{label}</div>
      <div className="kpi-cell__value">{value}</div>
      {sub && <div className="kpi-cell__sub">{sub}</div>}
      {alert && <div className="kpi-cell__alert" />}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="cell-group">
      <div className="cell-group__header">
        <div className="cell-group__header-icon">{icon}</div>
        <span className="cell-group__title">{title}</span>
      </div>
      <div className="cell-group__body">{children}</div>
    </div>
  );
}

function BarRow({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="cell">
      <div className="cell__content">
        <div className="cell-progress">
          <div className="cell-progress__labels">
            <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: ".8rem" }}>{label}</span>
            <strong style={{ color, fontSize: ".82rem" }}>{fmt(value)}{suffix}</strong>
          </div>
          <div className="cell-progress__track">
            <div className="cell-progress__fill" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="cell">
      <div className="cell__content">
        <span className="cell__label">{label}</span>
      </div>
      <div className="cell__end">
        <span className="cell__value" style={{ color, fontSize: "1rem", fontWeight: 900 }}>{value}</span>
      </div>
    </div>
  );
}

function AlertItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="cell cell--accent" style={{ "--cell-accent": color } as React.CSSProperties}>
      <div className="cell__icon" style={{ background: `${color}14`, color }}>{icon}</div>
      <div className="cell__content">
        <span className="cell__label">{label}</span>
      </div>
    </div>
  );
}

// ─── SVG Chart Components ─────────────────────────────────────────────────────

function ChartCard({ title, icon, children, fullWidth = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className="cell-group" style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div className="cell-group__header">
        {icon && <div className="cell-group__header-icon">{icon}</div>}
        <span className="cell-group__title">{title}</span>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>{children}</div>
    </div>
  );
}

function SvgBar({ data, color, height = 150, yFmt }: {
  data: { label: string; value: number }[];
  color: string; height?: number;
  yFmt?: (v: number) => string;
}) {
  if (!data.length) return <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: ".82rem", padding: "2rem 0" }}>لا توجد بيانات</p>;
  const vw = 500; const padL = 10; const padR = 10; const padT = 22; const padB = 26;
  const iW = vw - padL - padR; const iH = height - padT - padB;
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;
  const slotW = iW / n;
  const barW = Math.min(slotW * 0.65, 40);
  const fmt2 = yFmt ?? ((v: number) => v > 999 ? `${(v / 1000).toFixed(0)}k` : String(v));
  return (
    <svg viewBox={`0 0 ${vw} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padT + iH * (1 - pct);
        return <line key={pct} x1={padL} y1={y} x2={vw - padR} y2={y} stroke="currentColor" strokeOpacity={0.07} />;
      })}
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * iH, d.value > 0 ? 2 : 0);
        const cx = padL + i * slotW + slotW / 2;
        const x = cx - barW / 2;
        const y = padT + iH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
            {d.value > 0 && (
              <text x={cx} y={y - 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.75}>{fmt2(d.value)}</text>
            )}
            <text x={cx} y={height - 5} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SvgGroupedBar({ data, series, height = 160 }: {
  data: { label: string; [key: string]: number | string }[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: ".82rem", padding: "2rem 0" }}>لا توجد بيانات</p>;
  const vw = 520; const padL = 10; const padR = 10; const padT = 22; const padB = 26;
  const iW = vw - padL - padR; const iH = height - padT - padB;
  const allVals = series.flatMap(s => data.map(d => Number(d[s.key]) || 0));
  const max = Math.max(...allVals, 1);
  const n = data.length; const ns = series.length;
  const groupW = iW / n;
  const barW = Math.min((groupW * 0.8) / ns, 35);
  const groupPad = (groupW - barW * ns) / 2;
  return (
    <svg viewBox={`0 0 ${vw} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map(pct => {
        const y = padT + iH * (1 - pct);
        return <line key={pct} x1={padL} y1={y} x2={vw - padR} y2={y} stroke="currentColor" strokeOpacity={0.07} />;
      })}
      {data.map((d, i) => {
        const gx = padL + i * groupW;
        return (
          <g key={i}>
            {series.map((s, si) => {
              const v = Number(d[s.key]) || 0;
              const bH = Math.max((v / max) * iH, v > 0 ? 2 : 0);
              const bx = gx + groupPad + si * barW;
              const by = padT + iH - bH;
              return (
                <g key={s.key}>
                  <rect x={bx} y={by} width={barW - 2} height={bH} rx={2} fill={s.color} opacity={0.85} />
                  {v > 0 && <text x={bx + (barW - 2) / 2} y={by - 3} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.7}>{v > 999 ? `${(v / 1000).toFixed(0)}k` : v}</text>}
                </g>
              );
            })}
            <text x={gx + groupW / 2} y={height - 5} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SvgLine({ data, series, height = 160 }: {
  data: { label: string; [key: string]: number | string }[];
  series: { key: string; color: string; label: string }[];
  height?: number;
}) {
  if (!data.length) return <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: ".82rem", padding: "2rem 0" }}>لا توجد بيانات</p>;
  const vw = 520; const padL = 40; const padR = 10; const padT = 18; const padB = 26;
  const iW = vw - padL - padR; const iH = height - padT - padB;
  const allVals = series.flatMap(s => data.map(d => Number(d[s.key]) || 0));
  const max = Math.max(...allVals, 1);
  const n = data.length;
  const toX = (i: number) => padL + (n <= 1 ? iW / 2 : (i / (n - 1)) * iW);
  const toY = (v: number) => padT + iH - (v / max) * iH;
  return (
    <svg viewBox={`0 0 ${vw} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padT + iH * (1 - pct);
        const v = max * pct;
        return (
          <g key={pct}>
            <line x1={padL} y1={y} x2={vw - padR} y2={y} stroke="currentColor" strokeOpacity={0.07} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.5}>{v > 999 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={height - 5} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>{d.label}</text>
      ))}
      {series.map(s => {
        const pts = data.map((d, i) => `${toX(i)},${toY(Number(d[s.key]) || 0)}`).join(" ");
        return (
          <g key={s.key}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={toX(i)} cy={toY(Number(d[s.key]) || 0)} r={3.5} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function SvgDonut({ segments, size = 110 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: ".82rem", padding: "1rem 0" }}>لا توجد بيانات</p>;
  const cx = size / 2; const cy = size / 2; const R = size * 0.4; const r = size * 0.22;
  let angle = -Math.PI / 2;
  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const slice = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle);
    angle += slice;
    const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle);
    const big = slice > Math.PI ? 1 : 0;
    const xi1 = cx + r * Math.cos(angle - slice); const yi1 = cy + r * Math.sin(angle - slice);
    const xi2 = cx + r * Math.cos(angle); const yi2 = cy + r * Math.sin(angle);
    return { d: `M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${xi2} ${yi2} A${r} ${r} 0 ${big} 0 ${xi1} ${yi1}Z`, color: seg.color, label: seg.label, value: seg.value };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flexShrink: 0 }}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="currentColor">{total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: ".28rem", minWidth: 0, flex: 1 }}>
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: ".73rem", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.label.replace(/_/g, " ")}</span>
            <span style={{ fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>{seg.value}</span>
            <span style={{ fontSize: ".67rem", color: "var(--text-secondary)", flexShrink: 0 }}>({Math.round(seg.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginTop: ".5rem" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
          <span style={{ width: 10, height: 3, borderRadius: 99, background: item.color, display: "block" }} />
          <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Day Range Selector ───────────────────────────────────────────────────────

const DAY_PRESETS = [1, 3, 7, 14, 30, 90];

function DayRangeSelector({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const [custom, setCustom] = useState("");
  const isPreset = DAY_PRESETS.includes(days);

  const applyCustom = () => {
    const v = parseInt(custom, 10);
    if (v >= 1 && v <= 365) { onChange(v); setCustom(""); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem", padding: ".75rem 1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
      <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>النطاق الزمني:</span>
      <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
        {DAY_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            style={{
              padding: ".3rem .7rem", borderRadius: 8, fontSize: ".78rem", fontWeight: 700, cursor: "pointer",
              border: days === d ? "2px solid #f97316" : "2px solid var(--border-default)",
              background: days === d ? "rgba(249,115,22,.1)" : "var(--bg-card)",
              color: days === d ? "#f97316" : "var(--text-secondary)",
              transition: "all .12s",
            }}
          >
            {d === 1 ? "اليوم" : `${d}ي`}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: ".3rem", marginLeft: "auto" }}>
        <input
          type="number"
          min={1} max={365}
          placeholder="أيام مخصصة"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyCustom()}
          style={{
            width: 110, padding: ".3rem .6rem", borderRadius: 8, fontSize: ".78rem",
            border: !isPreset ? "2px solid #f97316" : "2px solid var(--border-default)",
            background: "var(--bg-card)", color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={applyCustom}
          disabled={!custom || parseInt(custom, 10) < 1}
          style={{
            padding: ".3rem .75rem", borderRadius: 8, fontSize: ".78rem", fontWeight: 700,
            cursor: "pointer", border: "none",
            background: custom ? "#f97316" : "var(--border-default)",
            color: custom ? "#fff" : "var(--text-secondary)",
            transition: "all .12s",
          }}
        >
          تطبيق
        </button>
      </div>
      {!isPreset && (
        <span style={{ fontSize: ".75rem", color: "#f97316", fontWeight: 700, marginLeft: ".25rem" }}>
          آخر {days} يوم
        </span>
      )}
    </div>
  );
}

// ─── Charts Tab ───────────────────────────────────────────────────────────────

function ChartsTab({ cd, days }: { cd: ChartData; days: number }) {
  const salesMap = new Map(cd.salesByMonth.map(d => [d.month, d.amount]));
  const expMap = new Map(cd.expensesByMonth.map(d => [d.month, d.amount]));
  const allMonths = [...new Set([...cd.salesByMonth.map(d => d.month), ...cd.expensesByMonth.map(d => d.month)])];
  const financeData = allMonths.map(m => ({ label: m, sales: salesMap.get(m) ?? 0, expenses: expMap.get(m) ?? 0 }));

  const maintMap = new Map(cd.maintenanceByMonth.map(d => [d.month, d.count]));
  const maintData = allMonths.map(m => ({ label: m, count: maintMap.get(m) ?? 0 }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Row 1: Production + Electricity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
        <ChartCard title={`الإنتاج — آخر ${days} يوم (قطع)`} icon={<Factory size={15} />}>
          <SvgBar
            data={cd.productionByDay.map(d => ({ label: d.date, value: d.pieces }))}
            color="#f97316"
            yFmt={fmtMoney}
          />
          <ChartLegend items={[{ label: "قطع منتجة", color: "#f97316" }]} />
        </ChartCard>

        <ChartCard title={`الكهرباء — آخر ${days} يوم (كيلوواط)`} icon={<Activity size={15} />}>
          <SvgBar
            data={cd.electricityByDay.map(d => ({ label: d.date, value: Math.round(d.kwh) }))}
            color="#0ea5e9"
            yFmt={(v) => `${v}`}
          />
          <ChartLegend items={[{ label: "كيلوواط مستهلك", color: "#0ea5e9" }]} />
        </ChartCard>
      </div>

      {/* Row 2: Cartons + Attendance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
        <ChartCard title={`الإنتاج — آخر ${days} يوم (كراتين)`} icon={<Package size={15} />}>
          <SvgBar
            data={cd.productionByDay.map(d => ({ label: d.date, value: d.cartons }))}
            color="#8b5cf6"
          />
          <ChartLegend items={[{ label: "كراتين مغلفة", color: "#8b5cf6" }]} />
        </ChartCard>

        <ChartCard title={`الحضور — آخر ${days} يوم`} icon={<Users size={15} />}>
          <SvgGroupedBar
            data={cd.attendanceByDay.map(d => ({ label: d.date, present: d.present, late: d.late }))}
            series={[
              { key: "present", color: "#22c55e", label: "حاضر" },
              { key: "late",    color: "#f97316", label: "متأخر" },
            ]}
          />
          <ChartLegend items={[{ label: "حاضر", color: "#22c55e" }, { label: "متأخر", color: "#f97316" }]} />
        </ChartCard>
      </div>

      {/* Row 3: Sales vs Expenses Line — full width */}
      <ChartCard title="المبيعات مقابل المصاريف — آخر 6 أشهر (شيكل)" icon={<TrendingUp size={15} />} fullWidth>
        <SvgLine
          data={financeData}
          series={[
            { key: "sales",    color: "#10b981", label: "إيرادات المبيعات" },
            { key: "expenses", color: "#ef4444", label: "المصاريف" },
          ]}
          height={180}
        />
        <ChartLegend items={[{ label: "إيرادات المبيعات", color: "#10b981" }, { label: "المصاريف", color: "#ef4444" }]} />
      </ChartCard>

      {/* Row 4: Maintenance */}
      <ChartCard title="أحداث الصيانة — آخر 6 أشهر" icon={<Wrench size={15} />} fullWidth>
        <SvgBar
          data={maintData.map(d => ({ label: d.label, value: d.count }))}
          color="#8b5cf6"
          height={140}
        />
        <ChartLegend items={[{ label: "أحداث صيانة", color: "#8b5cf6" }]} />
      </ChartCard>

      {/* Row 5: Three Donuts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
        <ChartCard title="الآلات حسب الحالة" icon={<Cpu size={15} />}>
          <SvgDonut
            segments={cd.machinesByStatus.map(m => ({
              label: m.status, value: m.count, color: MACHINE_STATUS_COLOR[m.status] ?? "#94a3b8",
            }))}
          />
        </ChartCard>

        <ChartCard title="مشكلات الجودة حسب الخطورة" icon={<CheckSquare size={15} />}>
          <SvgDonut
            segments={cd.qualityBySeverity.map(q => ({
              label: q.severity, value: q.count, color: SEVERITY_COLOR[q.severity] ?? "#94a3b8",
            }))}
          />
        </ChartCard>

        <ChartCard title="المستخدمون حسب الدور" icon={<Users size={15} />}>
          <SvgDonut
            segments={cd.usersByRole.map(u => ({
              label: u.role, value: u.count, color: ROLE_COLOR[u.role] ?? "#94a3b8",
            }))}
          />
        </ChartCard>
      </div>

      {/* Row 6: Quotations by Status */}
      <ChartCard title="العروض حسب الحالة" icon={<BarChart size={15} />}>
        <SvgBar
          data={cd.quotationsByStatus.map(q => ({ label: q.status, value: q.count }))}
          color="#3b82f6"
          height={140}
        />
      </ChartCard>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardAnalyticsPage() {
  const [data, setData]           = useState<Overview | null>(null);
  const [charts, setCharts]       = useState<ChartData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError]         = useState("");
  const [chartsError, setChartsError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "charts">("overview");
  const [days, setDays]           = useState(7);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/overview`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res));
      setData((await res.json()) as Overview);
    } catch (e) { setError(e instanceof Error ? e.message : "فشل التحميل"); }
    finally { setLoading(false); }
  }, []);

  const loadCharts = useCallback(async (d: number) => {
    setChartsLoading(true); setChartsError("");
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/charts?days=${d}`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res));
      setCharts((await res.json()) as ChartData);
    } catch (e) { setChartsError(e instanceof Error ? e.message : "فشل تحميل الرسوم البيانية"); }
    finally { setChartsLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (activeTab === "charts") void loadCharts(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    void loadCharts(newDays);
  };

  const d = data;
  const totalAlerts = d ? d.outOfStockCount + d.overdueSchedules + d.invoicesOverdue + d.expensesPending + d.pendingRegistrations : 0;
  const attendanceRate = d && d.activeUsers > 0 ? Math.round((d.attendanceToday / d.activeUsers) * 100) : 0;
  const machineHealth = d && d.totalMachines > 0 ? Math.round((d.operationalMachines / d.totalMachines) * 100) : 0;
  const profit = d ? d.salesThisMonth - d.purchasesThisMonth - d.expensesThisMonth : 0;
  const COL2 = "repeat(auto-fit, minmax(140px, 1fr))";

  const refreshCurrent = () => activeTab === "charts" ? void loadCharts(days) : void load();
  const isCurrentLoading = activeTab === "charts" ? chartsLoading : loading;

  return (
    <ModulePageShell
      title="تحليلات لوحة التحكم"
      subtitle="نظرة مباشرة على كل وحدات النظام"
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={refreshCurrent} disabled={isCurrentLoading}>
          <RefreshCw size={14} style={{ marginRight: ".35rem", animation: isCurrentLoading ? "spin 1s linear infinite" : "none" }} />
          {isCurrentLoading ? "جارٍ التحميل..." : "تحديث"}
        </button>
      }
    >
      {/* ── Tab navigation ── */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-default)", paddingBottom: ".75rem" }}>
        {(["overview", "charts"] as const).map((tab) => {
          const active = activeTab === tab;
          const label = tab === "overview" ? "نظرة عامة" : "الرسوم البيانية";
          const icon = tab === "overview" ? <Activity size={14} /> : <BarChart size={14} />;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex", alignItems: "center", gap: ".4rem",
                padding: ".45rem 1rem", borderRadius: "var(--radius-lg,8px)",
                border: active ? "2px solid #f97316" : "2px solid transparent",
                background: active ? "rgba(249,115,22,.08)" : "var(--bg-surface)",
                color: active ? "#f97316" : "var(--text-secondary)",
                fontWeight: active ? 700 : 500, fontSize: ".85rem", cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {icon}{label}
            </button>
          );
        })}
      </div>

      {/* ── Error banners ── */}
      {(activeTab === "overview" ? error : chartsError) && (
        <div style={{ padding: ".75rem 1rem", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#dc2626", marginBottom: "1rem", fontWeight: 600 }}>
          {activeTab === "overview" ? error : chartsError}
        </div>
      )}

      {/* ── Loading spinner ── */}
      {isCurrentLoading && (
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <span className="spinner" style={{ margin: "0 auto", width: 36, height: 36 }} />
        </div>
      )}

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && !loading && d && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Row 0: Hero KPI Strip */}
          <div className="kpi-strip">
            <HeroCard icon={<Users size={18} />} label="المستخدمون النشطون" value={d.activeUsers}
              sub={`${d.totalUsers} إجمالي · ${d.pendingRegistrations} معلق`}
              gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" alert={d.pendingRegistrations > 0} />
            <HeroCard icon={<Factory size={18} />} label="إنتاج اليوم" value={fmt(d.production.todayPieces)}
              sub={`${fmt(d.production.todayCartons)} كرتون`}
              gradient="linear-gradient(135deg,#f97316,#ea580c)" />
            <HeroCard icon={<Cpu size={18} />} label="الآلات" value={`${d.operationalMachines}/${d.totalMachines}`}
              sub={`${machineHealth}% تشغيلي`}
              gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)" alert={d.overdueSchedules > 0} />
            <HeroCard icon={<TrendingUp size={18} />} label="الإيرادات / الشهر" value={`₪${fmtMoney(d.salesThisMonth)}`}
              sub={`${d.salesCountThisMonth} مبيعة`}
              gradient={profit >= 0 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)"} />
            <HeroCard icon={<CheckSquare size={18} />} label="مشاكل الجودة" value={d.openQualityIssues}
              sub={`${d.qualityThisWeek} فحص هذا الأسبوع`}
              gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" alert={d.openQualityIssues > 0} />
            <HeroCard icon={<AlertTriangle size={18} />} label="التنبيهات النشطة" value={totalAlerts}
              sub={`${d.outOfStockCount} نفد من المخزون`}
              gradient={totalAlerts > 0 ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "linear-gradient(135deg,#64748b,#475569)"}
              alert={totalAlerts > 0} />
          </div>

          {/* Row 1: People + Production */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
            <SectionCard title="الأفراد والحضور" icon={<Users size={15} />}>
              <div className="stat-grid">
                {(["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"] as const).map((role) => {
                  const count = d.usersByRole.find((r) => r.role === role)?.count ?? 0;
                  return (
                    <div key={role} className="stat-tile">
                      <span className="stat-tile__value" style={{ color: ROLE_COLOR[role] }}>{count}</span>
                      <span className="stat-tile__label">{role}</span>
                    </div>
                  );
                })}
              </div>
              <StatPill label="حاضرون اليوم" value={d.attendanceToday} color="#16a34a" />
              <StatPill label="متأخرون" value={d.lateToday} color={d.lateToday > 0 ? "#f97316" : "#16a34a"} />
              <StatPill label="نسبة الحضور %" value={attendanceRate} color={attendanceRate >= 80 ? "#16a34a" : "#f97316"} />
              <StatPill label="طلبات تسجيل معلقة" value={d.pendingRegistrations} color={d.pendingRegistrations > 0 ? "#f97316" : "#64748b"} />
            </SectionCard>

            <SectionCard title="مخرجات الإنتاج" icon={<Factory size={15} />}>
              <div className="stat-grid">
                {[
                  { label: "اليوم", pieces: d.production.todayPieces, cartons: d.production.todayCartons },
                  { label: "الأسبوع", pieces: d.production.weekPieces, cartons: d.production.weekCartons },
                  { label: "الشهر", pieces: d.production.monthPieces, cartons: d.production.monthCartons },
                ].map((p) => (
                  <div key={p.label} className="stat-tile">
                    <span className="stat-tile__value" style={{ color: "#f97316" }}>{fmtMoney(p.pieces)}</span>
                    <span className="stat-tile__label">{p.label} · {fmtMoney(p.cartons)} كرتون</span>
                  </div>
                ))}
              </div>
              <BarRow label="اليوم مقابل المتوسط الأسبوعي" value={d.production.todayPieces} max={d.production.weekPieces || 1} color="#f97316" />
              <BarRow label="الأسبوع مقابل المتوسط الشهري" value={d.production.weekPieces} max={d.production.monthPieces || 1} color="#fb923c" />
            </SectionCard>
          </div>

          {/* Row 2: Machines + Inventory */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
            <SectionCard title="حالة الآلات" icon={<Cpu size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                {d.machinesByStatus.length === 0
                  ? <p style={{ margin: 0, fontSize: ".85rem", color: "var(--text-secondary)" }}>لا توجد آلات مسجلة.</p>
                  : d.machinesByStatus.map((m) => (
                    <div key={m.status} style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".5rem .75rem", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: MACHINE_STATUS_COLOR[m.status] ?? "#94a3b8", flexShrink: 0 }} />
                      <span style={{ fontSize: ".82rem", fontWeight: 600, flex: 1 }}>{m.status.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: ".88rem", fontWeight: 800, color: MACHINE_STATUS_COLOR[m.status] ?? "inherit" }}>{m.count}</span>
                      <div style={{ width: 70, height: 6, borderRadius: 999, background: "var(--border-default)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(m.count / (d.totalMachines || 1)) * 100}%`, background: MACHINE_STATUS_COLOR[m.status] ?? "#94a3b8" }} />
                      </div>
                    </div>
                  ))
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: COL2, gap: ".5rem" }}>
                <StatPill label="جداول متأخرة" value={d.overdueSchedules} color={d.overdueSchedules > 0 ? "#ef4444" : "#16a34a"} />
                <StatPill label="جداول معلقة" value={d.pendingSchedules} color={d.pendingSchedules > 0 ? "#f97316" : "#64748b"} />
                <StatPill label="صيانة هذا الشهر" value={d.maintenanceThisMonth} color="#8b5cf6" />
                <StatPill label="نسبة الصحة %" value={machineHealth} color={machineHealth >= 80 ? "#16a34a" : "#f97316"} />
              </div>
            </SectionCard>

            <SectionCard title="مخزون المواد الخام" icon={<Package size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: ".5rem" }}>
                {[
                  { label: "إجمالي المواد", value: d.totalRawMaterials, color: "#3b82f6", bg: "rgba(59,130,246,.06)" },
                  { label: "مخزون منخفض", value: d.lowStockMaterials.length, color: "#f97316", bg: "rgba(249,115,22,.06)" },
                  { label: "نفد من المخزون", value: d.outOfStockCount, color: "#ef4444", bg: "rgba(239,68,68,.06)" },
                ].map((s) => (
                  <div key={s.label} style={{ borderRadius: 10, padding: ".75rem .5rem", background: s.bg, border: `1px solid ${s.color}22`, textAlign: "center" }}>
                    <p style={{ margin: "0 0 .25rem", fontSize: ".62rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {d.lowStockMaterials.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                  <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>مواد منخفضة المخزون</p>
                  {d.lowStockMaterials.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".4rem .65rem", borderRadius: 7, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.15)" }}>
                      <span style={{ flex: 1, fontSize: ".8rem", fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: ".75rem", color: "#f97316", fontWeight: 700 }}>{fmt(m.currentQuantity, 1)}/{fmt(m.minQuantity, 1)} {m.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: ".83rem", color: "#16a34a", fontWeight: 600 }}>✓ جميع المواد فوق الحد الأدنى للمخزون</p>
              )}
            </SectionCard>
          </div>

          {/* Row 3: Finance — full width */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 14, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem" }}>
              <span style={{ color: "var(--orange-500,#f97316)" }}><DollarSign size={16} /></span>
              <h3 style={{ margin: 0, fontSize: ".9rem", fontWeight: 800 }}>الملخص المالي - هذا الشهر</h3>
              <div style={{ marginLeft: "auto", padding: ".3rem .85rem", borderRadius: 999, background: profit >= 0 ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${profit >= 0 ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}` }}>
                <span style={{ fontSize: ".78rem", fontWeight: 800, color: profit >= 0 ? "#10b981" : "#ef4444" }}>
                  الصافي {profit >= 0 ? "+" : ""}₪{fmtMoney(profit)}
                </span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div style={{ borderRadius: 12, background: "linear-gradient(135deg,#10b981,#059669)", padding: "1.25rem 1.5rem", color: "#fff", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -12, top: -12, opacity: .12, transform: "scale(3.5)" }}><TrendingUp size={40} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".75rem" }}>
                  <ArrowUpRight size={16} />
                  <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", opacity: .9 }}>إيرادات المبيعات</span>
                </div>
                <p style={{ margin: "0 0 .25rem", fontSize: "2.4rem", fontWeight: 900, lineHeight: 1 }}>₪{fmtMoney(d.salesThisMonth)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: ".75rem", flexWrap: "wrap" }}>
                  {[
                    { label: "المعاملات", value: d.salesCountThisMonth },
                    { label: "المتوسط / بيع", value: `₪${d.salesCountThisMonth > 0 ? fmtMoney(d.salesThisMonth / d.salesCountThisMonth) : "0"}` },
                    { label: "فواتير معلقة", value: d.invoicesPending },
                  ].map(item => (
                    <div key={item.label} style={{ background: "rgba(255,255,255,.18)", borderRadius: 8, padding: ".4rem .75rem", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: ".62rem", opacity: .85, fontWeight: 600 }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: 12, background: "linear-gradient(135deg,#f97316,#ea580c)", padding: "1.25rem 1.5rem", color: "#fff", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -12, top: -12, opacity: .12, transform: "scale(3.5)" }}><ShoppingCart size={40} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".75rem" }}>
                  <ShoppingCart size={16} />
                  <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", opacity: .9 }}>المشتريات</span>
                </div>
                <p style={{ margin: "0 0 .25rem", fontSize: "2.4rem", fontWeight: 900, lineHeight: 1 }}>₪{fmtMoney(d.purchasesThisMonth)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: ".75rem", flexWrap: "wrap" }}>
                  {[
                    { label: "الطلبات", value: d.purchasesCountThisMonth },
                    { label: "المتوسط / طلب", value: `₪${d.purchasesCountThisMonth > 0 ? fmtMoney(d.purchasesThisMonth / d.purchasesCountThisMonth) : "0"}` },
                    { label: "فواتير متأخرة", value: d.invoicesOverdue },
                  ].map(item => (
                    <div key={item.label} style={{ background: "rgba(255,255,255,.18)", borderRadius: 8, padding: ".4rem .75rem", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: ".62rem", opacity: .85, fontWeight: 600 }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: ".75rem" }}>
              {[
                { label: "مصاريف هذا الشهر", value: d.expensesThisMonth, color: "#ef4444", icon: <ArrowDownRight size={14} />, sub: `${d.expensesPending} في انتظار الموافقة`, money: true },
                { label: "رواتب هذا الشهر", value: d.payrollThisMonth, color: "#8b5cf6", icon: <UserCheck size={14} />, sub: `${d.totalShifts} وردية إجمالي`, money: true },
                { label: "فواتير معلقة", value: d.invoicesPending, color: "#f97316", icon: <BarChart2 size={14} />, sub: `${d.invoicesOverdue} متأخرة`, money: false },
                { label: "مصاريف معلقة", value: d.expensesPending, color: "#ef4444", icon: <Clock size={14} />, sub: "في انتظار الموافقة", money: false },
              ].map((item) => (
                <div key={item.label} style={{ padding: ".85rem 1rem", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".35rem", marginBottom: ".3rem" }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span style={{ fontSize: ".65rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{item.label}</span>
                  </div>
                  <p style={{ margin: "0 0 .15rem", fontSize: "1.25rem", fontWeight: 900, color: item.color }}>
                    {item.money ? `₪${fmtMoney(item.value)}` : item.value}
                  </p>
                  <p style={{ margin: 0, fontSize: ".7rem", color: "var(--text-secondary)" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Quality + Recent Maintenance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
            <SectionCard title="الجودة والصيانة" icon={<CheckSquare size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>المشكلات حسب الخطورة</p>
                {d.qualityBySeverity.length === 0
                  ? <p style={{ margin: 0, fontSize: ".85rem", color: "#16a34a", fontWeight: 600 }}>✓ لا توجد مشاكل جودة مسجلة</p>
                  : d.qualityBySeverity.map((q) => {
                    const maxQ = Math.max(...d.qualityBySeverity.map((x) => x.count), 1);
                    return <BarRow key={q.severity} label={q.severity} value={q.count} max={maxQ} color={SEVERITY_COLOR[q.severity] ?? "#94a3b8"} />;
                  })
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: COL2, gap: ".5rem" }}>
                <StatPill label="مشكلات مفتوحة" value={d.openQualityIssues} color={d.openQualityIssues > 0 ? "#ef4444" : "#16a34a"} />
                <StatPill label="فحوصات هذا الأسبوع" value={d.qualityThisWeek} color="#0ea5e9" />
                <StatPill label="صيانة هذا الشهر" value={d.maintenanceThisMonth} color="#8b5cf6" />
                <StatPill label="إجمالي الورديات" value={d.totalShifts} color="#64748b" />
              </div>
            </SectionCard>

            <SectionCard title="أحدث الصيانات" icon={<Wrench size={16} />}>
              {d.recentMaintenance.length === 0 ? (
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>لا توجد سجلات صيانة هذا الشهر.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {d.recentMaintenance.map((m) => (
                    <div key={m.id} style={{ padding: ".55rem .75rem", borderRadius: 9, background: "var(--bg-surface)", border: "1px solid var(--border-default)", display: "flex", gap: ".65rem", alignItems: "flex-start" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: ".82rem", fontWeight: 700 }}>{m.machineName}</p>
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

          {/* Row 5: Production Records table */}
          <SectionCard title="سجلات إنتاج اليوم" icon={<Activity size={16} />}>
            {d.recentProduction.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".85rem" }}>لا توجد سجلات إنتاج اليوم.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                      {["العامل", "الآلة", "القطع", "الكراتين", "الوقت"].map((h) => (
                        <th key={h} style={{ padding: ".45rem .75rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentProduction.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface)" }}>
                        <td style={{ padding: ".5rem .75rem", fontWeight: 700 }}>{r.workerName}</td>
                        <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)" }}>{r.machineName}</td>
                        <td style={{ padding: ".5rem .75rem", fontWeight: 800, color: "#f97316" }}>{fmt(r.totalPieces)}</td>
                        <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)" }}>{fmt(r.cartonsCount)}</td>
                        <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{timeAgo(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Alerts Panel */}
          {totalAlerts > 0 && (
            <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 14, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem" }}>
                <AlertTriangle size={18} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 800, color: "#ef4444" }}>إجراء مطلوب — {totalAlerts} تنبيه</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: ".6rem" }}>
                {d.outOfStockCount > 0 && <AlertItem icon={<Package size={14} />} label={`${d.outOfStockCount} مادة نفدت من المخزون`} color="#ef4444" />}
                {d.overdueSchedules > 0 && <AlertItem icon={<Clock size={14} />} label={`${d.overdueSchedules} جدول صيانة متأخر`} color="#ef4444" />}
                {d.invoicesOverdue > 0 && <AlertItem icon={<BarChart2 size={14} />} label={`${d.invoicesOverdue} فاتورة متأخرة`} color="#f97316" />}
                {d.expensesPending > 0 && <AlertItem icon={<DollarSign size={14} />} label={`${d.expensesPending} مصروف في انتظار الموافقة`} color="#f97316" />}
                {d.pendingRegistrations > 0 && <AlertItem icon={<UserPlus size={14} />} label={`${d.pendingRegistrations} طلب تسجيل معلق`} color="#3b82f6" />}
                {d.openQualityIssues > 0 && <AlertItem icon={<CheckSquare size={14} />} label={`${d.openQualityIssues} مشكلة جودة غير محلولة`} color="#0ea5e9" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Charts Tab ── */}
      {activeTab === "charts" && !chartsLoading && (
        <>
          <DayRangeSelector days={days} onChange={handleDaysChange} />
          {charts && <ChartsTab cd={charts} days={days} />}
        </>
      )}

      {/* ── Charts empty state ── */}
      {activeTab === "charts" && !chartsLoading && !charts && !chartsError && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          <BarChart size={40} style={{ margin: "0 auto .75rem", opacity: .4 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>اضغط تحديث لتحميل بيانات الرسوم البيانية</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ModulePageShell>
  );
}
