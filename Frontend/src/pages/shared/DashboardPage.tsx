import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Factory,
  Boxes,
  TrendingUp,
  Bell,
  ClipboardList,
  Wrench,
  CheckSquare,
  Target,
  AlertTriangle,
  Camera,
  Activity,
  DollarSign,
  ShoppingCart,
  FileText,
  RefreshCw,
  ArrowRight,
  UserCheck,
  Package,
  BarChart3,
  Cpu,
  Sparkles,
  ChevronRight,
  Calendar,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

/* ── helpers ─────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAuth<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fmtDate(isAr: boolean) {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Welcome Hero ─────────────────────────────────────────── */
function WelcomeHero({
  name,
  role,
  roleLabel,
  gradient,
  onRefresh,
  isAr,
}: {
  name: string;
  role: string;
  roleLabel: string;
  gradient: string;
  onRefresh: () => void;
  isAr: boolean;
}) {
  const greeting = `مرحباً، ${name}`;
  const dateStr = fmtDate(isAr);

  return (
    <div
      style={{
        borderRadius: "var(--radius-2xl)",
        background: gradient,
        padding: "2rem 2.25rem",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,.18)",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: "auto",
          left: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(255,255,255,.07)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          right: "auto",
          left: 60,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "rgba(255,255,255,.05)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          {/* Role badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: ".35rem",
              background: "rgba(255,255,255,.18)",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 999,
              padding: ".2rem .8rem",
              fontSize: ".72rem",
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              marginBottom: ".75rem",
            }}
          >
            <Sparkles size={11} />
            {roleLabel}
          </span>
          <h1
            style={{
              margin: "0 0 .35rem",
              fontSize: "1.75rem",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-.02em",
            }}
          >
            {greeting}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: ".875rem",
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
            }}
          >
            <Calendar size={13} />
            {dateStr}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
            padding: ".5rem 1.1rem",
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,.2)",
            border: "1px solid rgba(255,255,255,.3)",
            color: "#fff",
            fontSize: ".82rem",
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,.2)";
          }}
        >
          <RefreshCw size={14} />
          {"تحديث"}
        </button>
      </div>
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────── */
function KpiCard({
  icon,
  label,
  value,
  tileGradient,
  iconBg,
  iconColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tileGradient: string;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        background: tileGradient,
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        padding: "1.25rem 1.375rem",
        display: "flex",
        flexDirection: "column",
        gap: ".875rem",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        transition: "box-shadow .18s, transform .18s, border-color .18s",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "translateY(-3px)";
          el.style.boxShadow = "var(--shadow-lg)";
          el.style.borderColor = iconColor;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "var(--shadow-sm)";
          el.style.borderColor = "var(--border-default)";
        }
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "var(--radius-lg)",
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      {/* Value */}
      <div>
        <p
          style={{
            margin: "0 0 .2rem",
            fontSize: "1.6rem",
            fontWeight: 900,
            color: iconColor,
            lineHeight: 1,
            letterSpacing: "-.03em",
          }}
        >
          {value}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: ".72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </p>
      </div>
      {onClick && (
        <ArrowRight
          size={14}
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            color: iconColor,
            opacity: 0.5,
          }}
        />
      )}
    </button>
  );
}

/* ── Quick Action Tile ────────────────────────────────────── */
function ActionTile({
  icon,
  label,
  sub,
  to,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  to: string;
  iconBg: string;
  iconColor: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: ".875rem",
        padding: ".875rem 1rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all .18s",
        width: "100%",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = "var(--shadow-md)";
        el.style.borderColor = iconColor;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "var(--shadow-sm)";
        el.style.borderColor = "var(--border-default)";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "var(--radius-md)",
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: ".875rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              margin: 0,
              fontSize: ".75rem",
              color: "var(--text-secondary)",
              marginTop: ".1rem",
            }}
          >
            {sub}
          </p>
        )}
      </div>
      <ChevronRight size={15} style={{ color: "var(--text-secondary)", flexShrink: 0, opacity: 0.5 }} />
    </button>
  );
}

/* ── Section Header ───────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 1rem",
        fontSize: ".75rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".1em",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        gap: ".5rem",
      }}
    >
      {children}
    </h2>
  );
}

/* ── Machine Status Bar ───────────────────────────────────── */
function MachineBar({ label, count, pct, isOp }: { label: string; count: number; pct: number; isOp: boolean }) {
  return (
    <div style={{ marginBottom: ".75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: ".35rem",
          fontSize: ".8rem",
          fontWeight: 600,
        }}
      >
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ color: "var(--text-primary)" }}>{count} ({pct}%)</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: "var(--border-default)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: isOp
              ? "linear-gradient(90deg,#22c55e,#16a34a)"
              : "linear-gradient(90deg,#fb923c,#ea580c)",
            transition: "width .5s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ── Types ───────────────────────────────────────────────── */
type Analytics = {
  totalUsers: number;
  activeUsers: number;
  totalMachines: number;
  operationalMachines: number;
  productionToday: number;
  lowStockItems: number;
};
type QuickStats = {
  machineStatusBreakdown: Array<{ status: string; count: number }>;
};
type AttendanceRec = { id: number; checkIn: string; checkOut: string | null };
type PayrollRec = { id: number; month: string; totalSalary: number };
type ProdItem = { id: number; createdAt: string };
type InvTx = { id: number; createdAt: string };

/* ══════════════════════════════════════════════════════════
   ADMIN Dashboard
══════════════════════════════════════════════════════════ */
function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, u] = await Promise.all([
      fetchAuth<Analytics>("/dashboard/analytics"),
      fetchAuth<QuickStats>("/dashboard/stats"),
      fetchAuth<{ unreadCount?: number; count?: number }>("/notifications/unread-count"),
    ]);
    setAnalytics(a);
    setStats(s);
    setUnread(u?.unreadCount ?? u?.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total =
    stats?.machineStatusBreakdown.reduce((s, i) => s + i.count, 0) ?? 0;

  const firstName = user?.name?.split(" ")[0] ?? "المدير";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Hero */}
      <WelcomeHero
        name={firstName}
        role="ADMIN"
        roleLabel={"لوحة تحكم المدير"}
        gradient="linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#7c3aed 100%)"
        onRefresh={() => void load()}
        isAr={isAr}
      />

      {/* KPI row */}
      <div>
        <SectionTitle>
          <Activity size={13} />
          {"نظرة عامة"}
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
          }}
        >
          <KpiCard
            icon={<Users size={20} />}
            label={"المستخدمون النشطون"}
            value={
              loading
                ? "…"
                : `${analytics?.activeUsers ?? 0}/${analytics?.totalUsers ?? 0}`
            }
            tileGradient="linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            iconBg="rgba(59,130,246,.15)"
            iconColor="#2563eb"
            onClick={() => navigate("/admin/users")}
          />
          <KpiCard
            icon={<Cpu size={20} />}
            label={"الآلات التشغيلية"}
            value={
              loading
                ? "…"
                : `${analytics?.operationalMachines ?? 0}/${analytics?.totalMachines ?? 0}`
            }
            tileGradient="linear-gradient(135deg,rgba(34,197,94,.12) 0%,rgba(34,197,94,.04) 100%)"
            iconBg="rgba(34,197,94,.15)"
            iconColor="#16a34a"
            onClick={() => navigate("/admin/machines")}
          />
          <KpiCard
            icon={<Factory size={20} />}
            label={"إنتاج اليوم"}
            value={loading ? "…" : (analytics?.productionToday ?? 0)}
            tileGradient="linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
            iconBg="rgba(249,115,22,.15)"
            iconColor="#ea580c"
            onClick={() => navigate("/production")}
          />
          <KpiCard
            icon={<Package size={20} />}
            label={"مواد منخفضة المخزون"}
            value={loading ? "…" : (analytics?.lowStockItems ?? 0)}
            tileGradient={
              (analytics?.lowStockItems ?? 0) > 0
                ? "linear-gradient(135deg,rgba(239,68,68,.12) 0%,rgba(239,68,68,.04) 100%)"
                : "linear-gradient(135deg,rgba(34,197,94,.12) 0%,rgba(34,197,94,.04) 100%)"
            }
            iconBg={
              (analytics?.lowStockItems ?? 0) > 0
                ? "rgba(239,68,68,.15)"
                : "rgba(34,197,94,.15)"
            }
            iconColor={
              (analytics?.lowStockItems ?? 0) > 0 ? "#dc2626" : "#16a34a"
            }
            onClick={() => navigate("/inventory")}
          />
          <KpiCard
            icon={<Bell size={20} />}
            label={"إشعارات غير مقروءة"}
            value={loading ? "…" : unread}
            tileGradient={
              unread > 0
                ? "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
                : "linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            }
            iconBg={unread > 0 ? "rgba(249,115,22,.15)" : "rgba(59,130,246,.15)"}
            iconColor={unread > 0 ? "#ea580c" : "#2563eb"}
            onClick={() => navigate("/notifications")}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Machine breakdown */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              gap: ".625rem",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                background: "rgba(34,197,94,.12)",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={16} />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: ".95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {"توزيع حالة الآلات"}
            </h2>
          </div>
          <div style={{ padding: "1.5rem" }}>
            {stats?.machineStatusBreakdown && stats.machineStatusBreakdown.length > 0 ? (
              stats.machineStatusBreakdown.map((m) => {
                const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                return (
                  <MachineBar
                    key={m.status}
                    label={m.status.replace(/_/g, " ")}
                    count={m.count}
                    pct={pct}
                    isOp={m.status === "OPERATIONAL"}
                  />
                );
              })
            ) : (
              <div
                style={{
                  padding: "2.5rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <Cpu
                  size={36}
                  style={{ margin: "0 auto .75rem", display: "block", opacity: 0.3 }}
                />
                <p style={{ margin: 0, fontSize: ".875rem" }}>
                  {"لا توجد بيانات آلات"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: ".95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {"إجراءات سريعة"}
            </h2>
          </div>
          <div
            style={{
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: ".5rem",
            }}
          >
            {[
              { icon: <Users size={16} />, label: "إدارة المستخدمين", to: "/admin/users", iconBg: "rgba(59,130,246,.12)", iconColor: "#2563eb" },
              { icon: <Factory size={16} />, label: "الإنتاج", to: "/production", iconBg: "rgba(249,115,22,.12)", iconColor: "#ea580c" },
              { icon: <Boxes size={16} />, label: "المخزون", to: "/inventory", iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a" },
              { icon: <DollarSign size={16} />, label: "الرواتب", to: "/admin/payroll", iconBg: "rgba(16,185,129,.12)", iconColor: "#059669" },
              { icon: <BarChart3 size={16} />, label: "التحليلات", to: "/admin/dashboard-analytics", iconBg: "rgba(139,92,246,.12)", iconColor: "#7c3aed" },
              { icon: <UserCheck size={16} />, label: "الحضور", to: "/admin/attendance", iconBg: "rgba(6,182,212,.12)", iconColor: "#0891b2" },
              { icon: <FileText size={16} />, label: "التقارير", to: "/reports", iconBg: "rgba(236,72,153,.12)", iconColor: "#db2777" },
            ].map((a) => (
              <ActionTile key={a.to} {...a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ENGINEER Dashboard
══════════════════════════════════════════════════════════ */
function EngineerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [myProd, setMyProd] = useState<ProdItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, u, a] = await Promise.all([
      fetchAuth<ProdItem[]>("/production/me"),
      fetchAuth<{ unreadCount?: number; count?: number }>("/notifications/unread-count"),
      fetchAuth<AttendanceRec[]>("/attendance/me"),
    ]);
    setMyProd(p ?? []);
    setUnread(u?.unreadCount ?? u?.count ?? 0);
    setAttendance(a ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const todayProd = myProd.filter((p) => p.createdAt.slice(0, 10) === today).length;
  const openAtt = attendance.find((a) => !a.checkOut);
  const firstName = user?.name?.split(" ")[0] ?? "المهندس";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Hero */}
      <WelcomeHero
        name={firstName}
        role="ENGINEER"
        roleLabel={"لوحة تحكم المهندس"}
        gradient="linear-gradient(135deg,#064e3b 0%,#059669 50%,#0d9488 100%)"
        onRefresh={() => void load()}
        isAr={isAr}
      />

      {/* Check-in alert */}
      {!loading && !openAtt && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg,rgba(249,115,22,.1),rgba(234,88,12,.06))",
            border: "1px solid rgba(249,115,22,.3)",
            display: "flex",
            alignItems: "center",
            gap: ".875rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "rgba(249,115,22,.15)",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "#ea580c" }}>
              {"لم تسجل حضورك اليوم"}
            </p>
            <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)", marginTop: ".15rem" }}>
              {"سجل حضورك أولاً قبل إضافة أي سجلات."}
            </p>
          </div>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => navigate("/attendance")}
          >
            {"تسجيل حضور"}
          </button>
        </div>
      )}

      {/* KPI row */}
      <div>
        <SectionTitle>
          <Activity size={13} />
          {"إحصائياتي"}
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
          }}
        >
          <KpiCard
            icon={<Factory size={20} />}
            label={"إنتاجي اليوم"}
            value={loading ? "…" : todayProd}
            tileGradient="linear-gradient(135deg,rgba(5,150,105,.12) 0%,rgba(5,150,105,.04) 100%)"
            iconBg="rgba(5,150,105,.15)"
            iconColor="#059669"
            onClick={() => navigate("/production")}
          />
          <KpiCard
            icon={<UserCheck size={20} />}
            label={"حالة الحضور"}
            value={
              loading ? "…" : openAtt ? "داخل الدوام ✓" : "غير مسجل"
            }
            tileGradient={
              openAtt
                ? "linear-gradient(135deg,rgba(34,197,94,.12) 0%,rgba(34,197,94,.04) 100%)"
                : "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
            }
            iconBg={openAtt ? "rgba(34,197,94,.15)" : "rgba(249,115,22,.15)"}
            iconColor={openAtt ? "#16a34a" : "#ea580c"}
            onClick={() => navigate("/attendance")}
          />
          <KpiCard
            icon={<Bell size={20} />}
            label={"إشعارات غير مقروءة"}
            value={loading ? "…" : unread}
            tileGradient={
              unread > 0
                ? "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
                : "linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            }
            iconBg={unread > 0 ? "rgba(249,115,22,.15)" : "rgba(59,130,246,.15)"}
            iconColor={unread > 0 ? "#ea580c" : "#2563eb"}
            onClick={() => navigate("/notifications")}
          />
          <KpiCard
            icon={<ClipboardList size={20} />}
            label={"مخزون القطع"}
            value={"شهري"}
            tileGradient="linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            iconBg="rgba(59,130,246,.15)"
            iconColor="#2563eb"
            onClick={() => navigate("/engineer/inventory")}
          />
        </div>
      </div>

      {/* Tools + Personal grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Engineer Tools */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"أدوات المهندس"}
            </h2>
          </div>
          <div
            style={{
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              { icon: <Factory size={18} />, label: "سجلات الإنتاج", sub: "تسجيل إنتاج الوردية", to: "/production", iconBg: "rgba(59,130,246,.12)", iconColor: "#2563eb" },
              { icon: <CheckSquare size={18} />, label: "فحص الجودة", sub: "تفتيش الجودة", to: "/quality-checks", iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a" },
              { icon: <Wrench size={18} />, label: "الصيانة", sub: "الإبلاغ عن مشاكل", to: "/maintenance", iconBg: "rgba(249,115,22,.12)", iconColor: "#ea580c" },
              { icon: <ClipboardList size={18} />, label: "قطع الغيار", sub: "تقرير النقص الشهري", to: "/engineer/inventory", iconBg: "rgba(139,92,246,.12)", iconColor: "#7c3aed" },
            ].map((t) => (
              <ActionTile key={t.to} {...t} />
            ))}
          </div>
        </div>

        {/* My Info */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"معلوماتي"}
            </h2>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
            <ActionTile icon={<UserCheck size={16} />} label={"حضوري"} to="/attendance" iconBg="rgba(5,150,105,.12)" iconColor="#059669" />
            <ActionTile icon={<DollarSign size={16} />} label={"راتبي"} to="/my-payroll" iconBg="rgba(16,185,129,.12)" iconColor="#059669" />
            <ActionTile icon={<Bell size={16} />} label={"الإشعارات"} to="/notifications" iconBg="rgba(59,130,246,.12)" iconColor="#2563eb" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ACCOUNTANT Dashboard
══════════════════════════════════════════════════════════ */
function AccountantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [payroll, setPayroll] = useState<PayrollRec[]>([]);
  const [invTx, setInvTx] = useState<InvTx[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, p, i] = await Promise.all([
      fetchAuth<{ unreadCount?: number; count?: number }>("/notifications/unread-count"),
      fetchAuth<PayrollRec[]>("/payroll/me"),
      fetchAuth<InvTx[]>("/inventory/transactions/all"),
    ]);
    setUnread(u?.unreadCount ?? u?.count ?? 0);
    setPayroll(p ?? []);
    setInvTx(i ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const todayInv = invTx.filter((t) => t.createdAt.slice(0, 10) === today).length;
  const monthPayroll = payroll
    .filter((p) => p.month === thisMonth)
    .reduce((s, p) => s + p.totalSalary, 0);
  const firstName = user?.name?.split(" ")[0] ?? "المحاسب";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Hero */}
      <WelcomeHero
        name={firstName}
        role="ACCOUNTANT"
        roleLabel={"لوحة تحكم المحاسب"}
        gradient="linear-gradient(135deg,#1e1b4b 0%,#4f46e5 50%,#7c3aed 100%)"
        onRefresh={() => void load()}
        isAr={isAr}
      />

      {/* KPI row */}
      <div>
        <SectionTitle>
          <Activity size={13} />
          {"الملخص المالي"}
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
          }}
        >
          <KpiCard
            icon={<DollarSign size={20} />}
            label={"الرواتب الشهرية"}
            value={loading ? "…" : `₪${monthPayroll.toLocaleString()}`}
            tileGradient="linear-gradient(135deg,rgba(79,70,229,.12) 0%,rgba(79,70,229,.04) 100%)"
            iconBg="rgba(79,70,229,.15)"
            iconColor="#4f46e5"
            onClick={() => navigate("/admin/payroll")}
          />
          <KpiCard
            icon={<Activity size={20} />}
            label={"حركات المخزون اليوم"}
            value={loading ? "…" : todayInv}
            tileGradient="linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            iconBg="rgba(59,130,246,.15)"
            iconColor="#2563eb"
            onClick={() => navigate("/inventory")}
          />
          <KpiCard
            icon={<Bell size={20} />}
            label={"إشعارات غير مقروءة"}
            value={loading ? "…" : unread}
            tileGradient={
              unread > 0
                ? "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
                : "linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            }
            iconBg={unread > 0 ? "rgba(249,115,22,.15)" : "rgba(59,130,246,.15)"}
            iconColor={unread > 0 ? "#ea580c" : "#2563eb"}
            onClick={() => navigate("/notifications")}
          />
          <KpiCard
            icon={<ClipboardList size={20} />}
            label={"تسعير القطع"}
            value={"طلبات جديدة"}
            tileGradient="linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
            iconBg="rgba(249,115,22,.15)"
            iconColor="#ea580c"
            onClick={() => navigate("/accountant/parts-pricing")}
          />
        </div>
      </div>

      {/* Finance + HR grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Finance Modules */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"الوحدات المالية"}
            </h2>
          </div>
          <div
            style={{
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              { icon: <Boxes size={18} />, label: "المخزون", sub: "متابعة المواد الخام", to: "/inventory", iconBg: "rgba(59,130,246,.12)", iconColor: "#2563eb" },
              { icon: <ShoppingCart size={18} />, label: "المشتريات", sub: "الموردون والطلبات", to: "/purchases", iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a" },
              { icon: <TrendingUp size={18} />, label: "المبيعات", sub: "طلبات العملاء", to: "/sales", iconBg: "rgba(249,115,22,.12)", iconColor: "#ea580c" },
              { icon: <FileText size={18} />, label: "التقارير", sub: "التقارير المالية", to: "/reports", iconBg: "rgba(139,92,246,.12)", iconColor: "#7c3aed" },
              { icon: <DollarSign size={18} />, label: "الرواتب", sub: "احتساب الرواتب", to: "/admin/payroll", iconBg: "rgba(16,185,129,.12)", iconColor: "#059669" },
              { icon: <ClipboardList size={18} />, label: "تسعير القطع", sub: "تسعير قطع المهندسين", to: "/accountant/parts-pricing", iconBg: "rgba(249,115,22,.12)", iconColor: "#ea580c" },
            ].map((t) => (
              <ActionTile key={t.to} {...t} />
            ))}
          </div>
        </div>

        {/* HR Access */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"الموارد البشرية"}
            </h2>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
            <ActionTile icon={<UserCheck size={16} />} label={"إدارة الحضور"} to="/admin/attendance" iconBg="rgba(5,150,105,.12)" iconColor="#059669" />
            <ActionTile icon={<DollarSign size={16} />} label={"إدارة الرواتب"} to="/admin/payroll" iconBg="rgba(79,70,229,.12)" iconColor="#4f46e5" />
            <ActionTile icon={<BarChart3 size={16} />} label={"جميع التقارير"} to="/reports" iconBg="rgba(139,92,246,.12)" iconColor="#7c3aed" />
            <ActionTile icon={<Bell size={16} />} label={"الإشعارات"} to="/notifications" iconBg="rgba(59,130,246,.12)" iconColor="#2563eb" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WORKER Dashboard
══════════════════════════════════════════════════════════ */
function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [myProd, setMyProd] = useState<ProdItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, u, a] = await Promise.all([
      fetchAuth<ProdItem[]>("/production/me"),
      fetchAuth<{ unreadCount?: number; count?: number }>("/notifications/unread-count"),
      fetchAuth<AttendanceRec[]>("/attendance/me"),
    ]);
    setMyProd(p ?? []);
    setUnread(u?.unreadCount ?? u?.count ?? 0);
    setAttendance(a ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const todayProd = myProd.filter((p) => p.createdAt.slice(0, 10) === today).length;
  const openAtt = attendance.find((a) => !a.checkOut);
  const firstName = user?.name?.split(" ")[0] ?? ("العامل");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Hero */}
      <WelcomeHero
        name={firstName}
        role="WORKER"
        roleLabel={"لوحة العامل"}
        gradient="linear-gradient(135deg,#7c2d12 0%,#c2410c 50%,#f97316 100%)"
        onRefresh={() => void load()}
        isAr={isAr}
      />

      {/* Check-in alert */}
      {!loading && !openAtt && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg,rgba(249,115,22,.1),rgba(234,88,12,.06))",
            border: "1px solid rgba(249,115,22,.3)",
            display: "flex",
            alignItems: "center",
            gap: ".875rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "rgba(249,115,22,.15)",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "#ea580c" }}>
              {"لم تسجل حضورك اليوم"}
            </p>
            <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)", marginTop: ".15rem" }}>
              {"سجّل حضورك قبل تسجيل أي بيانات."}
            </p>
          </div>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => navigate("/attendance")}
          >
            {"تسجيل الدخول"}
          </button>
        </div>
      )}

      {/* KPI row */}
      <div>
        <SectionTitle>
          <Activity size={13} />
          {"إحصائياتي اليوم"}
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
          }}
        >
          <KpiCard
            icon={<Factory size={20} />}
            label={"إنتاجي اليوم"}
            value={loading ? "…" : todayProd}
            tileGradient="linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
            iconBg="rgba(249,115,22,.15)"
            iconColor="#ea580c"
            onClick={() => navigate("/production")}
          />
          <KpiCard
            icon={<UserCheck size={20} />}
            label={"الحضور"}
            value={
              loading ? "…" : openAtt ? ("داخل الدوام ✓") : ("غير مسجل")
            }
            tileGradient={
              openAtt
                ? "linear-gradient(135deg,rgba(34,197,94,.12) 0%,rgba(34,197,94,.04) 100%)"
                : "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
            }
            iconBg={openAtt ? "rgba(34,197,94,.15)" : "rgba(249,115,22,.15)"}
            iconColor={openAtt ? "#16a34a" : "#ea580c"}
            onClick={() => navigate("/attendance")}
          />
          <KpiCard
            icon={<Bell size={20} />}
            label={"إشعارات"}
            value={loading ? "…" : unread}
            tileGradient={
              unread > 0
                ? "linear-gradient(135deg,rgba(249,115,22,.12) 0%,rgba(249,115,22,.04) 100%)"
                : "linear-gradient(135deg,rgba(59,130,246,.12) 0%,rgba(59,130,246,.04) 100%)"
            }
            iconBg={unread > 0 ? "rgba(249,115,22,.15)" : "rgba(59,130,246,.15)"}
            iconColor={unread > 0 ? "#ea580c" : "#2563eb"}
            onClick={() => navigate("/notifications")}
          />
        </div>
      </div>

      {/* Tools + Personal grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Worker Tools */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"أدوات العامل"}
            </h2>
          </div>
          <div
            style={{
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              { icon: <Factory size={18} />, label: "سجلات الإنتاج", sub: "تسجيل إنتاج الوردية", to: "/production", iconBg: "rgba(249,115,22,.12)", iconColor: "#ea580c" },
              { icon: <Camera size={18} />, label: "قراءات الآلة", sub: "قراءات العداد", to: "/worker/snapshots", iconBg: "rgba(59,130,246,.12)", iconColor: "#2563eb" },
              { icon: <AlertTriangle size={18} />, label: "إيقاف الآلات", sub: "تسجيل التوقفات", to: "/worker/tools?tab=stops", iconBg: "rgba(239,68,68,.12)", iconColor: "#dc2626" },
              { icon: <CheckSquare size={18} />, label: "قائمة التحقق", sub: "قائمة الفحص اليومية", to: "/worker/tools?tab=checklist", iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a" },
              { icon: <Target size={18} />, label: "الأهداف اليومية", sub: "تتبع الأهداف", to: "/worker/tools?tab=target", iconBg: "rgba(139,92,246,.12)", iconColor: "#7c3aed" },
              { icon: <Wrench size={18} />, label: "هدر المواد", sub: "تسجيل الهدر", to: "/worker/tools?tab=waste", iconBg: "rgba(6,182,212,.12)", iconColor: "#0891b2" },
            ].map((t) => (
              <ActionTile key={t.to} {...t} />
            ))}
          </div>
        </div>

        {/* Personal */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"الشخصية"}
            </h2>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
            <ActionTile icon={<UserCheck size={16} />} label={"حضوري"} to="/attendance" iconBg="rgba(249,115,22,.12)" iconColor="#ea580c" />
            <ActionTile icon={<DollarSign size={16} />} label={"راتبي"} to="/my-payroll" iconBg="rgba(16,185,129,.12)" iconColor="#059669" />
            <ActionTile icon={<Bell size={16} />} label={"الإشعارات"} to="/notifications" iconBg="rgba(59,130,246,.12)" iconColor="#2563eb" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main DashboardPage
══════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? "WORKER").toUpperCase();

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "ENGINEER") return <EngineerDashboard />;
  if (role === "ACCOUNTANT") return <AccountantDashboard />;
  return <WorkerDashboard />;
}
