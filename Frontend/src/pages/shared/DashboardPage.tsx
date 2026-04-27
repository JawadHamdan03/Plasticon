import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
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

function StatCard({
  icon,
  label,
  value,
  color = "blue",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: "blue" | "orange" | "green" | "red";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="stat-card"
      style={{
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        width: "100%",
        transition: "box-shadow .18s, transform .18s",
      }}
      onClick={onClick}
      disabled={!onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(-2px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "var(--shadow-lg)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "var(--shadow-card)";
      }}
    >
      <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
      <div>
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
      </div>
      {onClick && (
        <ArrowRight
          size={14}
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            opacity: 0.3,
          }}
        />
      )}
    </button>
  );
}

function QuickAction({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="quick-action-card"
      onClick={() => navigate(to)}
    >
      <span className="quick-action-card__icon">{icon}</span>
      <span className="quick-action-card__label">{label}</span>
      <ArrowRight size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
    </button>
  );
}

function ModuleCard({
  icon,
  label,
  desc,
  to,
  color,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  to: string;
  color: string;
  iconColor: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ".625rem",
        padding: "1.1rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all .18s",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "var(--shadow-lg)";
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(-1px)";
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--orange-300)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--border-default)";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: color,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: ".86rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: ".74rem",
            color: "var(--text-secondary)",
            marginTop: ".15rem",
          }}
        >
          {desc}
        </p>
      </div>
    </button>
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

/* ── ADMIN Dashboard ──────────────────────────────────────── */
function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, u] = await Promise.all([
      fetchAuth<Analytics>("/dashboard/analytics"),
      fetchAuth<QuickStats>("/dashboard/stats"),
      fetchAuth<{ unreadCount?: number; count?: number }>(
        "/notifications/unread-count",
      ),
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-header__title">Admin Dashboard</h1>
          <p className="page-header__sub">System overview and analytics</p>
        </div>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-stats">
        <StatCard
          icon={<Users size={22} />}
          label="Active Users"
          value={
            loading
              ? "…"
              : `${analytics?.activeUsers ?? 0} / ${analytics?.totalUsers ?? 0}`
          }
          color="blue"
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon={<Cpu size={22} />}
          label="Machines Running"
          value={
            loading
              ? "…"
              : `${analytics?.operationalMachines ?? 0} / ${analytics?.totalMachines ?? 0}`
          }
          color="green"
          onClick={() => navigate("/admin/machines")}
        />
        <StatCard
          icon={<Factory size={22} />}
          label="Production Today"
          value={loading ? "…" : (analytics?.productionToday ?? 0)}
          color="orange"
          onClick={() => navigate("/production")}
        />
        <StatCard
          icon={<Package size={22} />}
          label="Low Stock Items"
          value={loading ? "…" : (analytics?.lowStockItems ?? 0)}
          color={(analytics?.lowStockItems ?? 0 > 0) ? "red" : "green"}
          onClick={() => navigate("/inventory")}
        />
        <StatCard
          icon={<Bell size={22} />}
          label="Unread Notifications"
          value={unread}
          color={unread > 0 ? "orange" : "blue"}
          onClick={() => navigate("/notifications")}
        />
      </div>

      <div className="dashboard-side-layout">
        {/* Machine status breakdown */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Machine Status Breakdown
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            {stats?.machineStatusBreakdown &&
            stats.machineStatusBreakdown.length > 0 ? (
              stats.machineStatusBreakdown.map((m) => {
                const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
                const isOp = m.status === "OPERATIONAL";
                return (
                  <div key={m.status}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: ".3rem",
                        fontSize: ".8rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{m.status.replace(/_/g, " ")}</span>
                      <span>
                        {m.count} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 99,
                        background: "var(--gray-100)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 99,
                          background: isOp
                            ? "var(--green-600)"
                            : "var(--orange-500)",
                          transition: "width .4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Cpu size={28} style={{ color: "var(--gray-300)" }} />
                <p className="empty-state__desc">No machine data</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Quick Actions
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            <QuickAction
              icon={<Users size={16} />}
              label="Manage Users"
              to="/admin/users"
            />
            <QuickAction
              icon={<Factory size={16} />}
              label="Production"
              to="/production"
            />
            <QuickAction
              icon={<Boxes size={16} />}
              label="Inventory"
              to="/inventory"
            />
            <QuickAction
              icon={<DollarSign size={16} />}
              label="Payroll"
              to="/admin/payroll"
            />
            <QuickAction
              icon={<BarChart3 size={16} />}
              label="Analytics"
              to="/admin/dashboard-analytics"
            />
            <QuickAction
              icon={<FileText size={16} />}
              label="Reports"
              to="/reports"
            />
            <QuickAction
              icon={<UserCheck size={16} />}
              label="Attendance"
              to="/admin/attendance"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ENGINEER Dashboard ───────────────────────────────────── */
function EngineerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myProd, setMyProd] = useState<ProdItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, u, a] = await Promise.all([
      fetchAuth<ProdItem[]>("/production/me"),
      fetchAuth<{ unreadCount?: number; count?: number }>(
        "/notifications/unread-count",
      ),
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
  const todayProd = myProd.filter(
    (p) => p.createdAt.slice(0, 10) === today,
  ).length;
  const openAtt = attendance.find((a) => !a.checkOut);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-header__title">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="page-header__sub">
            Engineer workspace —{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          className="btn btn--outline btn--sm"
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid-cols-stats">
        <StatCard
          icon={<Factory size={22} />}
          label="My Production Today"
          value={loading ? "…" : todayProd}
          color="blue"
          onClick={() => navigate("/production")}
        />
        <StatCard
          icon={<UserCheck size={22} />}
          label="Attendance Status"
          value={loading ? "…" : openAtt ? "Checked In ✓" : "Not Checked In"}
          color={openAtt ? "green" : "orange"}
          onClick={() => navigate("/attendance")}
        />
        <StatCard
          icon={<Bell size={22} />}
          label="Unread Notifications"
          value={loading ? "…" : unread}
          color={unread > 0 ? "orange" : "blue"}
          onClick={() => navigate("/notifications")}
        />
        <StatCard
          icon={<ClipboardList size={22} />}
          label="Parts Inventory"
          value="Monthly"
          color="blue"
          onClick={() => navigate("/engineer/inventory")}
        />
      </div>

      <div className="dashboard-side-layout">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Engineer Tools
            </h2>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              {
                icon: <Factory size={18} />,
                label: "Production Records",
                desc: "Log hourly production data",
                to: "/production",
                color: "var(--blue-100)",
                iconColor: "var(--blue-700)",
              },
              {
                icon: <CheckSquare size={18} />,
                label: "Quality Checks",
                desc: "Cap & preform quality inspections",
                to: "/quality-checks",
                color: "var(--green-100)",
                iconColor: "var(--green-600)",
              },
              {
                icon: <Wrench size={18} />,
                label: "Maintenance",
                desc: "Report equipment issues",
                to: "/maintenance",
                color: "var(--orange-100)",
                iconColor: "var(--orange-600)",
              },
              {
                icon: <ClipboardList size={18} />,
                label: "Parts Inventory",
                desc: "Monthly parts shortage report",
                to: "/engineer/inventory",
                color: "var(--blue-100)",
                iconColor: "var(--blue-700)",
              },
            ].map((t) => (
              <ModuleCard key={t.to} {...t} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              My Info
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
          >
            <QuickAction
              icon={<UserCheck size={16} />}
              label="My Attendance"
              to="/attendance"
            />
            <QuickAction
              icon={<DollarSign size={16} />}
              label="My Payroll"
              to="/my-payroll"
            />
            <QuickAction
              icon={<Bell size={16} />}
              label="Notifications"
              to="/notifications"
            />

            {!openAtt && (
              <div
                style={{
                  padding: ".75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--orange-50)",
                  border: "1px solid var(--orange-100)",
                  fontSize: ".8rem",
                  color: "var(--orange-700)",
                  marginTop: ".5rem",
                }}
              >
                ⚠️ You haven't checked in today.{" "}
                <span style={{ fontWeight: 700 }}>Please check in.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ACCOUNTANT Dashboard ─────────────────────────────────── */
function AccountantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [payroll, setPayroll] = useState<PayrollRec[]>([]);
  const [invTx, setInvTx] = useState<InvTx[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, p, i] = await Promise.all([
      fetchAuth<{ unreadCount?: number; count?: number }>(
        "/notifications/unread-count",
      ),
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
  const todayInv = invTx.filter(
    (t) => t.createdAt.slice(0, 10) === today,
  ).length;
  const monthPayroll = payroll
    .filter((p) => p.month === thisMonth)
    .reduce((s, p) => s + p.totalSalary, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-header__title">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="page-header__sub">
            Accountant workspace —{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          className="btn btn--outline btn--sm"
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid-cols-stats">
        <StatCard
          icon={<Activity size={22} />}
          label="Inventory Moves Today"
          value={loading ? "…" : todayInv}
          color="blue"
          onClick={() => navigate("/inventory")}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          label="Monthly Payroll"
          value={loading ? "…" : `$${monthPayroll.toLocaleString()}`}
          color="green"
          onClick={() => navigate("/admin/payroll")}
        />
        <StatCard
          icon={<Bell size={22} />}
          label="Unread Notifications"
          value={loading ? "…" : unread}
          color={unread > 0 ? "orange" : "blue"}
          onClick={() => navigate("/notifications")}
        />
        <StatCard
          icon={<ClipboardList size={22} />}
          label="Parts Pricing"
          value="New Requests"
          color="orange"
          onClick={() => navigate("/accountant/parts-pricing")}
        />
      </div>

      <div className="dashboard-side-layout">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Finance Modules
            </h2>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              {
                icon: <Boxes size={18} />,
                label: "Inventory",
                desc: "Track raw materials stock",
                to: "/inventory",
                color: "var(--blue-100)",
                iconColor: "var(--blue-700)",
              },
              {
                icon: <ShoppingCart size={18} />,
                label: "Purchases",
                desc: "Manage suppliers & orders",
                to: "/purchases",
                color: "var(--green-100)",
                iconColor: "var(--green-600)",
              },
              {
                icon: <TrendingUp size={18} />,
                label: "Sales",
                desc: "Customer orders & invoices",
                to: "/sales",
                color: "var(--orange-100)",
                iconColor: "var(--orange-600)",
              },
              {
                icon: <FileText size={18} />,
                label: "Reports",
                desc: "Financial & production reports",
                to: "/reports",
                color: "var(--blue-100)",
                iconColor: "var(--blue-700)",
              },
              {
                icon: <DollarSign size={18} />,
                label: "Payroll",
                desc: "Calculate & manage salaries",
                to: "/admin/payroll",
                color: "var(--green-100)",
                iconColor: "var(--green-600)",
              },
              {
                icon: <ClipboardList size={18} />,
                label: "Parts Pricing",
                desc: "Price engineer inventory",
                to: "/accountant/parts-pricing",
                color: "var(--orange-100)",
                iconColor: "var(--orange-600)",
              },
            ].map((t) => (
              <ModuleCard key={t.to} {...t} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              HR Access
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            <QuickAction
              icon={<UserCheck size={16} />}
              label="Attendance Mgmt"
              to="/admin/attendance"
            />
            <QuickAction
              icon={<DollarSign size={16} />}
              label="Payroll Mgmt"
              to="/admin/payroll"
            />
            <QuickAction
              icon={<BarChart3 size={16} />}
              label="All Reports"
              to="/reports"
            />
            <QuickAction
              icon={<Bell size={16} />}
              label="Notifications"
              to="/notifications"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WORKER Dashboard ─────────────────────────────────────── */
function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myProd, setMyProd] = useState<ProdItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, u, a] = await Promise.all([
      fetchAuth<ProdItem[]>("/production/me"),
      fetchAuth<{ unreadCount?: number; count?: number }>(
        "/notifications/unread-count",
      ),
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
  const todayProd = myProd.filter(
    (p) => p.createdAt.slice(0, 10) === today,
  ).length;
  const openAtt = attendance.find((a) => !a.checkOut);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-header__title">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="page-header__sub">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          className="btn btn--outline btn--sm"
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {!openAtt && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--orange-50)",
            border: "1px solid var(--orange-100)",
            display: "flex",
            alignItems: "center",
            gap: ".75rem",
          }}
        >
          <AlertTriangle
            size={20}
            style={{ color: "var(--orange-600)", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: ".9rem",
                color: "var(--orange-700)",
              }}
            >
              You haven't checked in today
            </p>
            <p
              style={{
                margin: 0,
                fontSize: ".8rem",
                color: "var(--orange-600)",
              }}
            >
              Check in first before logging any records.
            </p>
          </div>
          <button
            className="btn btn--orange btn--sm"
            onClick={() => navigate("/attendance")}
          >
            Check In
          </button>
        </div>
      )}

      <div className="grid-cols-stats">
        <StatCard
          icon={<Factory size={22} />}
          label="Production Today"
          value={loading ? "…" : todayProd}
          color="blue"
          onClick={() => navigate("/production")}
        />
        <StatCard
          icon={<UserCheck size={22} />}
          label="Attendance"
          value={loading ? "…" : openAtt ? "Checked In ✓" : "Not Checked In"}
          color={openAtt ? "green" : "orange"}
          onClick={() => navigate("/attendance")}
        />
        <StatCard
          icon={<Bell size={22} />}
          label="Notifications"
          value={loading ? "…" : unread}
          color={unread > 0 ? "orange" : "blue"}
          onClick={() => navigate("/notifications")}
        />
      </div>

      <div className="dashboard-side-layout">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Worker Tools
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            <QuickAction
              icon={<Factory size={16} />}
              label="Production Records"
              to="/production"
            />
            <QuickAction
              icon={<Camera size={16} />}
              label="Machine Readings"
              to="/worker/snapshots"
            />
            <QuickAction
              icon={<AlertTriangle size={16} />}
              label="Machine Stops"
              to="/worker/tools?tab=stops"
            />
            <QuickAction
              icon={<CheckSquare size={16} />}
              label="Daily Checklist"
              to="/worker/tools?tab=checklist"
            />
            <QuickAction
              icon={<Target size={16} />}
              label="Daily Targets"
              to="/worker/tools?tab=target"
            />
            <QuickAction
              icon={<Wrench size={16} />}
              label="Material Waste"
              to="/worker/tools?tab=waste"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Personal
            </h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            <QuickAction
              icon={<UserCheck size={16} />}
              label="My Attendance"
              to="/attendance"
            />
            <QuickAction
              icon={<DollarSign size={16} />}
              label="My Payroll"
              to="/my-payroll"
            />
            <QuickAction
              icon={<Bell size={16} />}
              label="Notifications"
              to="/notifications"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main DashboardPage ───────────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? "WORKER").toUpperCase();

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "ENGINEER") return <EngineerDashboard />;
  if (role === "ACCOUNTANT") return <AccountantDashboard />;
  return <WorkerDashboard />;
}
