import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  TrendingUp, Users, FileText, MapPin, Target,
  Plus, Trash2, ChevronRight, Search, Phone, Mail,
  Calendar, CheckCircle, Clock, UserCheck, Settings2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

/* ── Auth helper ─────────────────────────────────────────────── */
function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── Types ───────────────────────────────────────────────────── */
type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  assignedSalesRepId?: number | null;
  assignedSalesRep?: { id: number; fullName: string } | null;
};

type QuotationItem = {
  productType: string;
  size: string;
  quantity: number;
  pricePerUnit: number;
};

type Quotation = {
  id: number;
  status: string;
  totalAmount: number;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  items: QuotationItem[];
  createdBy?: { id: number; fullName: string };
};

type Visit = {
  id: number;
  visitDate: string;
  outcome: string | null;
  notes: string | null;
  nextVisitAt: string | null;
  customer: { id: number; name: string };
  loggedBy?: { id: number; fullName: string };
};

type SalesTarget = {
  id: number;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  notes: string | null;
  rep?: { id: number; fullName: string };
};

type DashboardData = {
  customerCount: number;
  totalQuotationValue: number;
  acceptedQuotations: number;
  recentQuotations: { id: number; status: string; totalAmount: number; createdAt: string }[];
  recentVisits: { id: number; visitDate: string; customer: { name: string } }[];
  currentTarget: { targetAmount: number; achievedAmount: number } | null;
};

type SalesRepUser = { id: number; fullName: string };

/* ── Constants ───────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  SENT: "#3b82f6",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  EXPIRED: "#f59e0b",
};

const STATUS_NEXT: Record<string, string[]> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["EXPIRED"],
  REJECTED: ["DRAFT"],
  EXPIRED: ["DRAFT"],
};

const AVATAR_COLORS = ["#0d9488", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

type Tab = "overview" | "customers" | "quotations" | "visits" | "targets";

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

/* ══════════════════════════════════════════════════════════════ */
/* Main Page Component                                            */
/* ══════════════════════════════════════════════════════════════ */
export function SalesRepPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegment = location.pathname.split('/')[2] as string | undefined;
  const userRole = (user?.role ?? "SALES_REP") as string;
  const isAdmin  = userRole === "ADMIN";
  const isAccountant = userRole === "ACCOUNTANT";

  const defaultTab: Tab = (isAdmin || isAccountant) ? "customers" : "overview";
  const tab: Tab = (["customers", "quotations", "visits", "targets", "overview"] as string[]).includes(pathSegment ?? "")
    ? (pathSegment as Tab)
    : defaultTab;

  function setTab(t: Tab) {
    navigate(t === "overview" ? "/sales-rep" : `/sales-rep/${t}`, { replace: false });
  }

  /* ── Shared data ── */
  const [dashData, setDashData]   = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [visits, setVisits]       = useState<Visit[]>([]);
  const [targets, setTargets]     = useState<SalesTarget[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepUser[]>([]);
  const [loading, setLoading]     = useState(true);

  /* ── Load data ── */
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const fetches: Promise<Response>[] = [
          fetch(`${API_BASE_URL}/sales-rep/dashboard`, { headers: authHeader(), credentials: "include" }),
          fetch(`${API_BASE_URL}/sales-rep/customers`, { headers: authHeader(), credentials: "include" }),
          fetch(`${API_BASE_URL}/sales-rep/quotations`, { headers: authHeader(), credentials: "include" }),
          fetch(`${API_BASE_URL}/sales-rep/visits`, { headers: authHeader(), credentials: "include" }),
          fetch(`${API_BASE_URL}/sales-rep/targets`, { headers: authHeader(), credentials: "include" }),
        ];
        if (isAdmin) {
          fetches.push(fetch(`${API_BASE_URL}/users/all?role=SALES_REP`, { headers: authHeader(), credentials: "include" }));
        }
        const results = await Promise.all(fetches);
        const [dRes, cRes, qRes, vRes, tRes, rRes] = results;
        if (dRes.ok) setDashData((await dRes.json()) as DashboardData);
        if (cRes.ok) setCustomers((await cRes.json()) as Customer[]);
        if (qRes.ok) setQuotations((await qRes.json()) as Quotation[]);
        if (vRes.ok) setVisits((await vRes.json()) as Visit[]);
        if (tRes.ok) setTargets((await tRes.json()) as SalesTarget[]);
        if (rRes?.ok) setSalesReps((await rRes.json()) as SalesRepUser[]);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    void loadAll();
  }, [isAdmin]);

  /* ── Target progress in hero ── */
  const heroPct = dashData?.currentTarget
    ? Math.min(100, Math.round((dashData.currentTarget.achievedAmount / dashData.currentTarget.targetAmount) * 100))
    : 0;
  const heroPctColor = heroPct >= 75 ? "#10b981" : heroPct >= 40 ? "#f59e0b" : "#ef4444";

  /* ── Tab definitions — overview only for SALES_REP ── */
  const TABS: { id: Tab; icon: React.ReactNode; labelEn: string; labelAr: string }[] = [
    ...(!isAdmin && !isAccountant
      ? [{ id: "overview" as Tab, icon: <TrendingUp size={16} />, labelEn: "Overview", labelAr: "نظرة عامة" }]
      : []),
    { id: "customers",  icon: <Users size={16} />,     labelEn: "Customers",  labelAr: "العملاء" },
    { id: "quotations", icon: <FileText size={16} />,  labelEn: "Quotations", labelAr: "عروض الأسعار" },
    { id: "visits",     icon: <MapPin size={16} />,    labelEn: "Visits",     labelAr: "الزيارات" },
    { id: "targets",    icon: <Target size={16} />,    labelEn: "Targets",    labelAr: "الأهداف" },
  ];

  /* ── Current date string ── */
  const today = new Date();
  const dateStr = isAr
    ? today.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  /* ── Role label for hero badge ── */
  const roleBadge = isAdmin
    ? ("مدير")
    : isAccountant
      ? ("محاسب")
      : ("مندوب مبيعات");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }} dir="rtl">

      {/* ══════════════════════════════════════════════════════ */}
      {/* HERO HEADER                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: isAdmin
            ? "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 40%, #3b82f6 100%)"
            : isAccountant
              ? "linear-gradient(135deg, #134e4a 0%, #0f766e 40%, #10b981 100%)"
              : "linear-gradient(135deg, #134e4a 0%, #0f766e 40%, #0d9488 100%)",
          borderRadius: "var(--radius-2xl)",
          padding: "1.75rem 2rem",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          marginBottom: "1.5rem",
          boxShadow: isAdmin ? "0 8px 32px rgba(59,130,246,.3)" : "0 8px 32px rgba(13,148,136,.3)",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-40px", right: "auto", left: "-40px", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "auto", right: "20%", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>

          {/* Left: user info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <div
                style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "rgba(255,255,255,.2)",
                  border: "2px solid rgba(255,255,255,.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".85rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                }}
              >
                {getInitials(user?.name ?? "SR")}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.2 }}>
                  {`مرحباً، ${user?.name ?? ""}`}
                </p>
                <span
                  style={{
                    display: "inline-block", fontSize: ".72rem", fontWeight: 700,
                    padding: "2px 10px", borderRadius: 999,
                    background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)",
                    color: "rgba(255,255,255,.9)", letterSpacing: ".04em", textTransform: "uppercase",
                  }}
                >
                  {roleBadge}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: ".82rem", color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Calendar size={13} />
              {dateStr}
            </p>

            {/* Target progress bar */}
            {dashData?.currentTarget && (
              <div style={{ marginTop: "1rem", maxWidth: 340 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: ".78rem", color: "rgba(255,255,255,.8)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Target size={12} />
                    {isAdmin
                      ? ("إجمالي أهداف الشهر")
                      : ("هدف الشهر")}
                  </span>
                  <span style={{ fontWeight: 700, color: heroPctColor }}>{heroPct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${heroPct}%`, height: "100%", borderRadius: 999,
                      background: `linear-gradient(90deg, ${heroPctColor}cc, ${heroPctColor})`,
                      transition: "width .6s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem", fontSize: ".72rem", color: "rgba(255,255,255,.6)" }}>
                  <span>₪{dashData.currentTarget.achievedAmount.toLocaleString()}</span>
                  <span>₪{dashData.currentTarget.targetAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: KPI tiles */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "0.75rem 1rem", minWidth: 90, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                {loading ? "–" : (dashData?.customerCount ?? "–")}
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: ".7rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {"عملاء"}
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "0.75rem 1rem", minWidth: 90, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#10b981", lineHeight: 1 }}>
                {loading ? "–" : (dashData?.acceptedQuotations ?? "–")}
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: ".7rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {"مقبولة"}
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "0.75rem 1rem", minWidth: 110, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#93c5fd", lineHeight: 1 }}>
                {loading ? "–" : `₪${Math.round(dashData?.totalQuotationValue ?? 0).toLocaleString()}`}
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: ".7rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {"إجمالي العروض"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB BAR                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--border-default)",
          marginBottom: "1.5rem",
          overflowX: "auto",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          padding: "0 1.5rem",
          boxShadow: "var(--shadow-sm)",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const accentColor = isAdmin ? "#3b82f6" : "#0d9488";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.875rem 1.25rem",
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${accentColor}` : "2px solid transparent",
                marginBottom: "-2px",
                color: active ? accentColor : "var(--text-secondary)",
                fontWeight: active ? 700 : 500,
                fontSize: ".88rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color .15s, border-color .15s",
              }}
            >
              {t.icon}
              {t.labelAr}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        {tab === "overview" && (
          <OverviewTab
            dashData={dashData}
            loading={loading}
            isAr={isAr}
            setTab={setTab}
            userRole={userRole}
          />
        )}
        {tab === "customers" && (
          <CustomersTab
            customers={customers}
            salesReps={salesReps}
            loading={loading}
            isAr={isAr}
            userRole={userRole}
            onRefresh={async () => {
              const res = await fetch(`${API_BASE_URL}/sales-rep/customers`, { headers: authHeader(), credentials: "include" });
              if (res.ok) setCustomers((await res.json()) as Customer[]);
            }}
          />
        )}
        {tab === "quotations" && (
          <QuotationsTab
            customers={customers}
            quotations={quotations}
            loading={loading}
            isAr={isAr}
            userRole={userRole}
            onRefresh={async () => {
              const [cRes, qRes] = await Promise.all([
                fetch(`${API_BASE_URL}/sales-rep/customers`, { headers: authHeader(), credentials: "include" }),
                fetch(`${API_BASE_URL}/sales-rep/quotations`, { headers: authHeader(), credentials: "include" }),
              ]);
              if (cRes.ok) setCustomers((await cRes.json()) as Customer[]);
              if (qRes.ok) setQuotations((await qRes.json()) as Quotation[]);
            }}
          />
        )}
        {tab === "visits" && (
          <VisitsTab
            customers={customers}
            visits={visits}
            loading={loading}
            isAr={isAr}
            userRole={userRole}
            onRefresh={async () => {
              const vRes = await fetch(`${API_BASE_URL}/sales-rep/visits`, { headers: authHeader(), credentials: "include" });
              if (vRes.ok) setVisits((await vRes.json()) as Visit[]);
            }}
          />
        )}
        {tab === "targets" && (
          <TargetsTab
            targets={targets}
            salesReps={salesReps}
            loading={loading}
            isAr={isAr}
            userRole={userRole}
            onRefresh={async () => {
              const tRes = await fetch(`${API_BASE_URL}/sales-rep/targets`, { headers: authHeader(), credentials: "include" });
              if (tRes.ok) setTargets((await tRes.json()) as SalesTarget[]);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* OVERVIEW TAB                                                   */
/* ══════════════════════════════════════════════════════════════ */
function OverviewTab({
  dashData, loading, isAr, setTab, userRole,
}: {
  dashData: DashboardData | null;
  loading: boolean;
  isAr: boolean;
  setTab: (t: Tab) => void;
  userRole: string;
}) {
  if (loading) return <TabLoader isAr={isAr} />;

  const isAdmin = userRole === "ADMIN";
  const isAccountant = userRole === "ACCOUNTANT";

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Recent activity grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>

        {/* Recent Quotations */}
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: ".9rem" }}>
              <FileText size={15} style={{ color: "#0d9488" }} />
              {"آخر العروض"}
            </span>
            <button
              type="button"
              onClick={() => setTab("quotations")}
              style={{ background: "none", border: "none", color: "#0d9488", fontSize: ".8rem", cursor: "pointer", fontWeight: 600 }}
            >
              {"عرض الكل ←"}
            </button>
          </div>
          <div>
            {!dashData || dashData.recentQuotations.length === 0 ? (
              <p style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-secondary)", fontSize: ".85rem" }}>
                {"لا توجد عروض بعد"}
              </p>
            ) : (
              dashData.recentQuotations.map((q) => {
                const sc = STATUS_COLORS[q.status] ?? "#6b7280";
                return (
                  <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: ".7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: sc + "22", color: sc, border: `1px solid ${sc}44`, textTransform: "uppercase" }}>
                        {q.status}
                      </span>
                      <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: ".9rem" }}>₪{q.totalAmount.toLocaleString()}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Visits */}
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: ".9rem" }}>
              <MapPin size={15} style={{ color: "#f59e0b" }} />
              {"آخر الزيارات"}
            </span>
            <button
              type="button"
              onClick={() => setTab("visits")}
              style={{ background: "none", border: "none", color: "#0d9488", fontSize: ".8rem", cursor: "pointer", fontWeight: 600 }}
            >
              {"عرض الكل ←"}
            </button>
          </div>
          <div>
            {!dashData || dashData.recentVisits.length === 0 ? (
              <p style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-secondary)", fontSize: ".85rem" }}>
                {"لا توجد زيارات بعد"}
              </p>
            ) : (
              dashData.recentVisits.map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f59e0b22", border: "1px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MapPin size={12} color="#f59e0b" />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: ".9rem" }}>{v.customer.name}</span>
                  </div>
                  <span style={{ fontSize: ".78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Clock size={11} />
                    {new Date(v.visitDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions — only for SALES_REP and ADMIN */}
      {!isAccountant && (
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {"إجراءات سريعة"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {[
              { tab: "quotations" as Tab, icon: <Plus size={16} />, labelEn: "New Quotation", labelAr: "عرض جديد", color: "#0d9488" },
              { tab: "visits" as Tab, icon: <MapPin size={16} />, labelEn: "Log Visit", labelAr: "تسجيل زيارة", color: "#f59e0b" },
              { tab: "customers" as Tab, icon: <Users size={16} />, labelEn: isAdmin ? "All Customers" : "My Customers", labelAr: isAdmin ? "كل العملاء" : "عملائي", color: "#3b82f6" },
              { tab: "targets" as Tab, icon: <Target size={16} />, labelEn: isAdmin ? "Set Targets" : "My Targets", labelAr: isAdmin ? "ضبط الأهداف" : "أهدافي", color: "#10b981" },
            ].map((a) => (
              <button
                key={a.tab}
                type="button"
                onClick={() => setTab(a.tab)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.875rem 1rem",
                  background: a.color + "12",
                  border: `1px solid ${a.color}33`,
                  borderRadius: 10,
                  color: a.color,
                  fontWeight: 600,
                  fontSize: ".85rem",
                  cursor: "pointer",
                  transition: "background .15s, transform .1s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = a.color + "22"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = a.color + "12"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                {a.icon}
                {a.labelAr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Accountant: quick access to approve quotations */}
      {isAccountant && (
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {"موافقة العروض"}
          </p>
          <button
            type="button"
            onClick={() => setTab("quotations")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.875rem 1.25rem",
              background: "#10b98112", border: "1px solid #10b98133",
              borderRadius: 10, color: "#10b981",
              fontWeight: 600, fontSize: ".875rem", cursor: "pointer",
            }}
          >
            <CheckCircle size={16} />
            {"عرض العروض للموافقة"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* CUSTOMERS TAB                                                  */
/* ══════════════════════════════════════════════════════════════ */
function CustomersTab({
  customers, salesReps, loading, isAr, userRole, onRefresh,
}: {
  customers: Customer[];
  salesReps: SalesRepUser[];
  loading: boolean;
  isAr: boolean;
  userRole: string;
  onRefresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignRepId, setAssignRepId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");
  const isAdmin = userRole === "ADMIN";

  const filtered = customers.filter((c) =>
    `${c.name} ${c.phone ?? ""} ${c.email ?? ""} ${c.address ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const handleAssign = async (customerId: number) => {
    if (!assignRepId) { setAssignMsg("اختر مندوباً"); return; }
    setAssigning(true); setAssignMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/customers/${customerId}/assign`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repId: Number(assignRepId) }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setAssignMsg("تم التعيين بنجاح");
      setAssigningId(null);
      setAssignRepId("");
      await onRefresh();
    } catch (err) {
      setAssignMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <TabLoader isAr={isAr} />;

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <Search size={15} style={{ position: "absolute", top: "50%", ["right"]: "0.875rem", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
        <input
          className="admin-input"
          placeholder={"بحث عن عميل..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ paddingLeft: "0.875rem", paddingRight: "2.5rem", width: "100%" }}
        />
      </div>

      {assignMsg && (
        <div style={{ marginBottom: "1rem", padding: "0.6rem 1rem", borderRadius: 8, background: assignMsg.includes("نجاح") || assignMsg.toLowerCase().includes("success") ? "#10b98122" : "#ef444422", color: assignMsg.includes("نجاح") || assignMsg.toLowerCase().includes("success") ? "#10b981" : "#ef4444", fontSize: ".875rem" }}>
          {assignMsg}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title={"لا يوجد عملاء"} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {filtered.map((c) => {
            const color = getAvatarColor(c.name);
            const isAssigning = assigningId === c.id;
            return (
              <div
                key={c.id}
                style={{
                  border: "1px solid var(--border-default)",
                  borderRadius: 14,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  transition: "box-shadow .2s, border-color .2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${color}33`;
                  (e.currentTarget as HTMLElement).style.borderColor = color + "66";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: ".9rem", flexShrink: 0,
                    }}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                      #{c.id}
                      {c.assignedSalesRep && (
                        <span style={{ marginInlineStart: "0.5rem", padding: "1px 6px", background: "#3b82f622", color: "#3b82f6", borderRadius: 999, fontSize: ".68rem", fontWeight: 700 }}>
                          {c.assignedSalesRep.fullName}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {c.phone && (
                    <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Phone size={12} style={{ color, flexShrink: 0 }} /> {c.phone}
                    </p>
                  )}
                  {c.email && (
                    <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Mail size={12} style={{ color, flexShrink: 0 }} /> {c.email}
                    </p>
                  )}
                  {c.address && (
                    <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <MapPin size={12} style={{ color, flexShrink: 0 }} /> {c.address}
                    </p>
                  )}
                </div>

                {/* Admin: assign to rep */}
                {isAdmin && (
                  <div>
                    {!isAssigning ? (
                      <button
                        type="button"
                        onClick={() => { setAssigningId(c.id); setAssignRepId(""); setAssignMsg(""); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.35rem",
                          padding: "0.35rem 0.75rem", fontSize: ".78rem", fontWeight: 600,
                          background: "#3b82f612", border: "1px solid #3b82f633",
                          borderRadius: 8, color: "#3b82f6", cursor: "pointer",
                        }}
                      >
                        <UserCheck size={13} />
                        {"تعيين لمندوب"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <select
                          value={assignRepId}
                          onChange={(e) => setAssignRepId(e.target.value)}
                          className="admin-input"
                          style={{ flex: 1, fontSize: ".8rem" }}
                        >
                          <option value="">{"اختر مندوباً..."}</option>
                          {salesReps.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleAssign(c.id)}
                          disabled={assigning}
                          style={{ padding: "0.35rem 0.7rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 7, fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {assigning ? "..." : ("حفظ")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningId(null)}
                          style={{ padding: "0.35rem 0.6rem", background: "none", border: "1px solid var(--border-default)", borderRadius: 7, cursor: "pointer", color: "var(--text-secondary)" }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* QUOTATIONS TAB                                                 */
/* ══════════════════════════════════════════════════════════════ */
function QuotationsTab({
  customers, quotations, loading, isAr, userRole, onRefresh,
}: {
  customers: Customer[];
  quotations: Quotation[];
  loading: boolean;
  isAr: boolean;
  userRole: string;
  onRefresh: () => Promise<void>;
}) {
  const isAdmin      = userRole === "ADMIN";
  const isAccountant = userRole === "ACCOUNTANT";
  const isSalesRep   = userRole === "SALES_REP";

  const canCreate  = isAdmin || isSalesRep;
  const canDelete  = isAdmin || isSalesRep;
  const canApprove = isAdmin || isAccountant;

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes]           = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([
    { productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 },
  ]);

  const addItem = () => setItems((p) => [...p, { productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = <K extends keyof QuotationItem>(idx: number, key: K, value: QuotationItem[K]) =>
    setItems((p) => p.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));

  const total = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setMsg("اختر عميلاً"); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/quotations`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId: Number(customerId), notes, validUntil: validUntil || undefined, items }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg("تم إنشاء العرض بنجاح");
      setCustomerId(""); setNotes(""); setValidUntil("");
      setItems([{ productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 }]);
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: number, status: string) => {
    await fetch(`${API_BASE_URL}/sales-rep/quotations/${id}/status`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    await onRefresh();
  };

  const deleteQ = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا العرض؟")) return;
    await fetch(`${API_BASE_URL}/sales-rep/quotations/${id}`, {
      method: "DELETE", headers: authHeader(), credentials: "include",
    });
    await onRefresh();
  };

  if (loading) return <TabLoader isAr={isAr} />;

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {"عروض الأسعار"} ({quotations.length})
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {isAccountant && (
            <span style={{ fontSize: ".78rem", padding: "3px 10px", borderRadius: 999, background: "#10b98122", color: "#10b981", border: "1px solid #10b98133", fontWeight: 600 }}>
              {"صلاحية الموافقة / الرفض"}
            </span>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => { setShowForm((v) => !v); setMsg(""); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.5rem 1rem",
                background: showForm ? "var(--border-default)" : "#0d9488",
                color: showForm ? "var(--text-primary)" : "#fff",
                border: "none", borderRadius: 8,
                fontWeight: 600, fontSize: ".85rem", cursor: "pointer",
              }}
            >
              <Plus size={15} />
              {showForm ? ("إلغاء") : ("عرض جديد")}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible create form (SALES_REP + ADMIN only) */}
      {canCreate && showForm && (
        <div style={{ border: "1px solid #0d948844", borderRadius: 14, marginBottom: "1.5rem", overflow: "hidden", background: "#0d948806" }}>
          <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #0d948822", display: "flex", alignItems: "center", gap: "0.5rem", background: "#0d948811" }}>
            <FileText size={16} style={{ color: "#0d9488" }} />
            <span style={{ fontWeight: 700, fontSize: ".95rem", color: "#0d9488" }}>
              {"إنشاء عرض أسعار جديد"}
            </span>
          </div>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"العميل *"}
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="admin-input">
                  <option value="">{"اختر عميلاً..."}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"صالح حتى"}
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="admin-input" />
              </label>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{"البنود"}</span>
                <button type="button" onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", background: "none", border: "1px solid var(--border-default)", borderRadius: 7, fontSize: ".8rem", cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>
                  <Plus size={13} /> {"إضافة بند"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 80px 110px 36px", gap: 6, marginBottom: 4 }}>
                {["نوع المنتج", "الحجم", "الكمية", "السعر", ""].map((h, i) => (
                  <span key={i} style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-secondary)" }}>{h}</span>
                ))}
              </div>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 80px 110px 36px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <select value={item.productType} onChange={(e) => updateItem(idx, "productType", e.target.value)} className="admin-input" style={{ fontSize: ".875rem" }}>
                    <option value="CAPS">CAPS</option>
                    <option value="PREFORMS">PREFORMS</option>
                    <option value="PIPES">PIPES</option>
                  </select>
                  <input placeholder={"الحجم"} value={item.size} onChange={(e) => updateItem(idx, "size", e.target.value)} className="admin-input" style={{ fontSize: ".875rem" }} />
                  <input type="number" placeholder={"الكمية"} value={item.quantity} min={0} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="admin-input" style={{ fontSize: ".875rem" }} />
                  <input type="number" placeholder={"السعر"} value={item.pricePerUnit} min={0} step="0.01" onChange={(e) => updateItem(idx, "pricePerUnit", Number(e.target.value))} className="admin-input" style={{ fontSize: ".875rem" }} />
                  <button
                    type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                    style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid var(--border-default)", borderRadius: 8, cursor: items.length === 1 ? "not-allowed" : "pointer", color: items.length === 1 ? "var(--text-secondary)" : "#ef4444" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "#0d948811", border: "1px solid #0d948833", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: ".875rem", fontWeight: 600, color: "var(--text-secondary)" }}>{"الإجمالي"}</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0d9488" }}>₪{total.toFixed(2)}</span>
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
              {"ملاحظات"}
              <textarea placeholder={"ملاحظات اختيارية..."} value={notes} onChange={(e) => setNotes(e.target.value)} className="admin-input" rows={3} style={{ resize: "vertical" }} />
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="auth-button" disabled={saving} style={{ background: "#0d9488", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                {saving ? <><Spinner />{"جارٍ الحفظ..."}</> : <><Plus size={15} />{"إنشاء العرض"}</>}
              </button>
              {msg && <FeedbackBadge msg={msg} isAr={isAr} />}
            </div>
          </form>
        </div>
      )}

      {/* Quotations list */}
      {quotations.length === 0 ? (
        <EmptyState icon={<FileText size={36} />} title={"لا توجد عروض بعد"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {quotations.map((q) => {
            const sc = STATUS_COLORS[q.status] ?? "#6b7280";
            const next = STATUS_NEXT[q.status] ?? [];

            // Accountant sees only Approve / Reject buttons on DRAFT or SENT
            const approvalTargets = isAccountant
              ? next.filter((s) => s === "ACCEPTED" || s === "REJECTED")
              : isAdmin
                ? next
                : [];

            return (
              <article
                key={q.id}
                style={{ border: `1px solid var(--border-default)`, borderLeft: `4px solid ${sc}`, borderRadius: "0 12px 12px 0", overflow: "hidden" }}
              >
                <div style={{ padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: sc + "22", border: `1px solid ${sc}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={15} style={{ color: sc }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{q.customer.name}</p>
                      <p style={{ margin: "1px 0 0", fontSize: ".77rem", color: "var(--text-secondary)" }}>
                        {new Date(q.createdAt).toLocaleDateString()}
                        {q.validUntil && ` · ${"صالح حتى"} ${new Date(q.validUntil).toLocaleDateString()}`}
                        {q.createdBy && ` · ${"بواسطة"} ${q.createdBy.fullName}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: ".75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: sc + "22", color: sc, border: `1px solid ${sc}44`, textTransform: "uppercase" }}>
                      {q.status}
                    </span>
                    <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0d9488" }}>₪{q.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {q.notes && (
                  <div style={{ padding: "0.5rem 1.25rem", borderTop: "1px solid var(--border-default)" }}>
                    <p style={{ margin: 0, fontSize: ".83rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{q.notes}</p>
                  </div>
                )}

                {/* Action footer — only for admin/accountant */}
                {canApprove && approvalTargets.length > 0 && (
                  <div style={{ padding: "0.625rem 1.25rem", borderTop: "1px solid var(--border-default)", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                      {isAccountant ? ("موافقة على:") : ("تغيير إلى:")}
                    </span>
                    {approvalTargets.map((s) => {
                      const bc = STATUS_COLORS[s] ?? "#6b7280";
                      return (
                        <button key={s} type="button" onClick={() => void patchStatus(q.id, s)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 8, border: `1px solid ${bc}44`, background: bc + "11", color: bc, cursor: "pointer" }}
                        >
                          <ChevronRight size={11} /> {s}
                        </button>
                      );
                    })}
                    {canDelete && (
                      <button type="button" onClick={() => void deleteQ(q.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 8, border: "1px solid #ef444444", background: "#ef444411", color: "#ef4444", cursor: "pointer", marginInlineStart: "auto" }}
                      >
                        <Trash2 size={11} /> {"حذف"}
                      </button>
                    )}
                  </div>
                )}

                {/* Sales rep: delete only, no status change */}
                {isSalesRep && canDelete && (
                  <div style={{ padding: "0.625rem 1.25rem", borderTop: "1px solid var(--border-default)", display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => void deleteQ(q.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 8, border: "1px solid #ef444444", background: "#ef444411", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 size={11} /> {"حذف"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* VISITS TAB                                                     */
/* ══════════════════════════════════════════════════════════════ */
function VisitsTab({
  customers, visits, loading, isAr, userRole, onRefresh,
}: {
  customers: Customer[];
  visits: Visit[];
  loading: boolean;
  isAr: boolean;
  userRole: string;
  onRefresh: () => Promise<void>;
}) {
  const canCreate = userRole === "ADMIN" || userRole === "SALES_REP";
  const canDelete = userRole === "ADMIN" || userRole === "SALES_REP";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  const [customerId, setCustomerId] = useState("");
  const [visitDate, setVisitDate]   = useState("");
  const [outcome, setOutcome]       = useState("");
  const [notes, setNotes]           = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !visitDate) { setMsg("اختر العميل والتاريخ"); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/visits`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: Number(customerId),
          visitDate,
          outcome: outcome || undefined,
          notes: notes || undefined,
          nextVisitAt: nextVisitAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg("تم تسجيل الزيارة بنجاح");
      setCustomerId(""); setVisitDate(""); setOutcome(""); setNotes(""); setNextVisitAt("");
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const deleteVisit = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الزيارة؟")) return;
    await fetch(`${API_BASE_URL}/sales-rep/visits/${id}`, {
      method: "DELETE", headers: authHeader(), credentials: "include",
    });
    await onRefresh();
  };

  if (loading) return <TabLoader isAr={isAr} />;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {"سجل الزيارات"} ({visits.length})
        </h3>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setMsg(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem",
              background: showForm ? "var(--border-default)" : "#f59e0b",
              color: showForm ? "var(--text-primary)" : "#fff",
              border: "none", borderRadius: 8,
              fontWeight: 600, fontSize: ".85rem", cursor: "pointer",
            }}
          >
            <Plus size={15} />
            {showForm ? ("إلغاء") : ("تسجيل زيارة")}
          </button>
        )}
      </div>

      {canCreate && showForm && (
        <div style={{ border: "1px solid #f59e0b44", borderRadius: 14, marginBottom: "1.5rem", overflow: "hidden", background: "#f59e0b06" }}>
          <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #f59e0b22", display: "flex", alignItems: "center", gap: "0.5rem", background: "#f59e0b11" }}>
            <MapPin size={16} style={{ color: "#f59e0b" }} />
            <span style={{ fontWeight: 700, fontSize: ".95rem", color: "#f59e0b" }}>
              {"تسجيل زيارة جديدة"}
            </span>
          </div>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"العميل *"}
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="admin-input">
                  <option value="">{"اختر عميلاً..."}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"تاريخ الزيارة *"}
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="admin-input" />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"النتيجة"}
                <input placeholder={"نتيجة الزيارة..."} value={outcome} onChange={(e) => setOutcome(e.target.value)} className="admin-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"موعد الزيارة القادمة"}
                <input type="date" value={nextVisitAt} onChange={(e) => setNextVisitAt(e.target.value)} className="admin-input" />
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
              {"ملاحظات"}
              <textarea placeholder={"ملاحظات اختيارية..."} value={notes} onChange={(e) => setNotes(e.target.value)} className="admin-input" rows={3} style={{ resize: "vertical" }} />
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="auth-button" disabled={saving} style={{ background: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                {saving ? <><Spinner />{"جارٍ الحفظ..."}</> : <><MapPin size={15} />{"تسجيل الزيارة"}</>}
              </button>
              {msg && <FeedbackBadge msg={msg} isAr={isAr} />}
            </div>
          </form>
        </div>
      )}

      {visits.length === 0 ? (
        <EmptyState icon={<MapPin size={36} />} title={"لا توجد زيارات بعد"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {visits.map((v) => (
            <div key={v.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0.25rem" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", border: "2px solid #f59e0b44", boxShadow: "0 0 8px #f59e0b44" }} />
                <div style={{ width: 2, background: "var(--border-default)", flex: 1, minHeight: 24, marginTop: 4 }} />
              </div>
              <div style={{ flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden", marginBottom: "0.25rem" }}>
                <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{v.customer.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: ".77rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Calendar size={11} />
                      {new Date(v.visitDate).toLocaleDateString()}
                      {v.nextVisitAt && (
                        <span style={{ marginLeft: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Clock size={11} style={{ color: "#0d9488" }} />
                          <span style={{ color: "#0d9488" }}>{"القادمة:"} {new Date(v.nextVisitAt).toLocaleDateString()}</span>
                        </span>
                      )}
                      {v.loggedBy && (
                        <span style={{ marginInlineStart: "0.5rem", color: "var(--text-secondary)" }}>· {v.loggedBy.fullName}</span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {v.outcome && (
                      <span style={{ fontSize: ".75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#10b98122", color: "#10b981", border: "1px solid #10b98133" }}>
                        {v.outcome}
                      </span>
                    )}
                    {canDelete && (
                      <button type="button" onClick={() => void deleteVisit(v.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".75rem", fontWeight: 600, padding: "3px 8px", borderRadius: 7, border: "1px solid #ef444433", background: "#ef444411", color: "#ef4444", cursor: "pointer" }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
                {v.notes && (
                  <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid var(--border-default)" }}>
                    <p style={{ margin: 0, fontSize: ".83rem", color: "var(--text-secondary)", fontStyle: "italic" }}>{v.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* TARGETS TAB                                                    */
/* ══════════════════════════════════════════════════════════════ */
function TargetsTab({
  targets, salesReps, loading, isAr, userRole, onRefresh,
}: {
  targets: SalesTarget[];
  salesReps: SalesRepUser[];
  loading: boolean;
  isAr: boolean;
  userRole: string;
  onRefresh: () => Promise<void>;
}) {
  const isAdmin = userRole === "ADMIN";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  const now = new Date();
  const [repId, setRepId]           = useState("");
  const [month, setMonth]           = useState(String(now.getMonth() + 1));
  const [year, setYear]             = useState(String(now.getFullYear()));
  const [targetAmount, setTargetAmount] = useState("");
  const [targetNotes, setTargetNotes]   = useState("");

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repId || !targetAmount) { setMsg("اختر المندوب والمبلغ"); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/targets`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repId: Number(repId), month: Number(month), year: Number(year), targetAmount: Number(targetAmount), notes: targetNotes || undefined }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg("تم تعيين الهدف بنجاح");
      setRepId(""); setTargetAmount(""); setTargetNotes("");
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TabLoader isAr={isAr} />;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {"أهداف المبيعات"}
          <span style={{ marginInlineStart: "0.5rem", fontSize: ".8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
            ({targets.length} {"هدف"})
          </span>
        </h3>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setMsg(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem",
              background: showForm ? "var(--border-default)" : "#10b981",
              color: showForm ? "var(--text-primary)" : "#fff",
              border: "none", borderRadius: 8,
              fontWeight: 600, fontSize: ".85rem", cursor: "pointer",
            }}
          >
            <Settings2 size={15} />
            {showForm ? ("إلغاء") : ("تعيين هدف")}
          </button>
        )}
      </div>

      {/* Admin: Set Target form */}
      {isAdmin && showForm && (
        <div style={{ border: "1px solid #10b98144", borderRadius: 14, marginBottom: "1.5rem", overflow: "hidden", background: "#10b98106" }}>
          <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #10b98122", display: "flex", alignItems: "center", gap: "0.5rem", background: "#10b98111" }}>
            <Target size={16} style={{ color: "#10b981" }} />
            <span style={{ fontWeight: 700, fontSize: ".95rem", color: "#10b981" }}>
              {"تعيين هدف مبيعات جديد"}
            </span>
          </div>
          <form onSubmit={(e) => { void handleSetTarget(e); }} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"المندوب *"}
                <select value={repId} onChange={(e) => setRepId(e.target.value)} className="admin-input">
                  <option value="">{"اختر مندوباً..."}</option>
                  {salesReps.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"الشهر"}
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="admin-input">
                  {MONTH_NAMES_EN.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{MONTH_NAMES_AR[i]}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"السنة"}
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="admin-input" min={2024} max={2030} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"مبلغ الهدف (₪) *"}
                <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="admin-input" min={0} placeholder="0" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {"ملاحظات"}
                <input value={targetNotes} onChange={(e) => setTargetNotes(e.target.value)} className="admin-input" placeholder={"ملاحظات اختيارية..."} />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button type="submit" className="auth-button" disabled={saving} style={{ background: "#10b981", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                {saving ? <><Spinner />{"جارٍ الحفظ..."}</> : <><Target size={15} />{"تعيين الهدف"}</>}
              </button>
              {msg && <FeedbackBadge msg={msg} isAr={isAr} />}
            </div>
          </form>
        </div>
      )}

      {targets.length === 0 ? (
        <EmptyState icon={<Target size={36} />} title={"لا توجد أهداف بعد"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {targets.map((t) => {
            const pct = t.targetAmount > 0 ? Math.min(100, Math.round((t.achievedAmount / t.targetAmount) * 100)) : 0;
            const pctColor = pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
            const monthName = MONTH_NAMES_AR[t.month - 1];

            return (
              <div
                key={t.id}
                style={{ border: "1px solid var(--border-default)", borderRadius: 14, padding: "1.25rem" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>
                      {monthName} {t.year}
                    </p>
                    {t.rep && (
                      <p style={{ margin: "2px 0 0", fontSize: ".77rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <UserCheck size={11} />
                        {t.rep.fullName}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: pctColor + "22",
                      border: `3px solid ${pctColor}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: ".85rem", fontWeight: 800, color: pctColor, lineHeight: 1 }}>{pct}%</span>
                  </div>
                </div>

                <div style={{ height: 10, borderRadius: 999, background: "var(--border-default)", overflow: "hidden", marginBottom: "0.625rem" }}>
                  <div
                    style={{
                      width: `${pct}%`, height: "100%",
                      background: `linear-gradient(90deg, ${pctColor}88, ${pctColor})`,
                      borderRadius: 999, transition: "width .6s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {"المحقق:"}{" "}
                    <strong style={{ color: pctColor }}>₪{t.achievedAmount.toLocaleString()}</strong>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {"الهدف:"}{" "}
                    <strong>₪{t.targetAmount.toLocaleString()}</strong>
                  </span>
                </div>

                {t.notes && (
                  <p style={{ margin: "0.625rem 0 0", fontSize: ".8rem", color: "var(--text-secondary)", fontStyle: "italic", borderTop: "1px solid var(--border-default)", paddingTop: "0.5rem" }}>
                    {t.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* HELPER COMPONENTS                                             */
/* ══════════════════════════════════════════════════════════════ */
function TabLoader({ isAr }: { isAr: boolean }) {
  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <div className="spinner" style={{ margin: "0 auto 0.75rem", width: 28, height: 28, borderWidth: 3 }} />
      <p style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>
        {"جارٍ التحميل..."}
      </p>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center", border: "1px dashed var(--border-default)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{icon}</div>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".9rem" }}>{title}</p>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
  );
}

function FeedbackBadge({ msg, isAr: _isAr }: { msg: string; isAr: boolean }) {
  const ok = msg.toLowerCase().includes("success") || msg.includes("تم") || msg.includes("نجاح");
  return (
    <span style={{ fontSize: ".875rem", padding: "4px 12px", borderRadius: 8, background: ok ? "#10b98122" : "#ef444422", color: ok ? "#10b981" : "#ef4444", border: `1px solid ${ok ? "#10b98144" : "#ef444444"}` }}>
      {msg}
    </span>
  );
}
