import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, FileText, MapPin, Target, CheckCircle } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type DashboardData = {
  customerCount: number;
  totalQuotationValue: number;
  acceptedQuotations: number;
  currentTarget: { targetAmount: number; achievedAmount: number } | null;
};

export function SalesRepDashboardPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/sales-rep/dashboard`, { headers: authHeader(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d as DashboardData))
      .finally(() => setLoading(false));
  }, []);

  const pct = data?.currentTarget
    ? Math.min(100, Math.round((data.currentTarget.achievedAmount / data.currentTarget.targetAmount) * 100))
    : 0;

  const pctColor = pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <main className="admin-shell" dir="rtl">
      <section className="admin-card">

        {/* ── Header ── */}
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={24} style={{ color: "var(--accent)" }} />
              {"لوحة المندوب"}
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
              {"نظرة عامة على أداء مبيعاتك"}
            </p>
          </div>
        </header>

        <div className="admin-section">
        {loading ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
            <p className="admin-muted">{"جارٍ التحميل..."}</p>
          </div>
        ) : data ? (
          <>
            {/* ── KPI Cards ── */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "1.5rem",
              }}
            >
              {/* Customers */}
              <div
                style={{
                  flex: "1 1 180px",
                  background: "linear-gradient(135deg, #8b5cf611 0%, #8b5cf622 100%)",
                  border: "1px solid #8b5cf633",
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "#8b5cf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Users size={22} color="#fff" />
                </div>
                <div>
                  <p className="admin-kpi-label" style={{ color: "#8b5cf6", fontWeight: 600, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {"عملائي"}
                  </p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, color: "#8b5cf6" }}>
                    {data.customerCount}
                  </p>
                </div>
              </div>

              {/* Accepted Quotes */}
              <div
                style={{
                  flex: "1 1 180px",
                  background: "linear-gradient(135deg, #10b98111 0%, #10b98122 100%)",
                  border: "1px solid #10b98133",
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={22} color="#fff" />
                </div>
                <div>
                  <p className="admin-kpi-label" style={{ color: "#10b981", fontWeight: 600, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {"عروض مقبولة"}
                  </p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, color: "#10b981" }}>
                    {data.acceptedQuotations}
                  </p>
                </div>
              </div>

              {/* Total Value */}
              <div
                style={{
                  flex: "1 1 180px",
                  background: "linear-gradient(135deg, #3b82f611 0%, #3b82f622 100%)",
                  border: "1px solid #3b82f633",
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <TrendingUp size={22} color="#fff" />
                </div>
                <div>
                  <p className="admin-kpi-label" style={{ color: "#3b82f6", fontWeight: 600, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {"إجمالي العروض"}
                  </p>
                  <p style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.1, color: "#3b82f6" }}>
                    ₪{data.totalQuotationValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Target Progress ── */}
            {data.currentTarget ? (
              <div
                style={{
                  background: "linear-gradient(135deg, #1e1e2e 0%, #16213e 100%)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Target size={18} style={{ color: pctColor }} />
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                      {"هدف الشهر الحالي"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 800,
                      color: pctColor,
                      lineHeight: 1,
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                <div style={{ marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "999px",
                      height: "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${pctColor}99, ${pctColor})`,
                        borderRadius: "999px",
                        height: "100%",
                        transition: "width .6s ease",
                        boxShadow: `0 0 12px ${pctColor}66`,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {"المحقق:"}{" "}
                    <strong style={{ color: pctColor }}>₪{data.currentTarget.achievedAmount.toLocaleString()}</strong>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {"الهدف:"}{" "}
                    <strong>₪{data.currentTarget.targetAmount.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            ) : null}

            {/* ── Navigation ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem" }}>
              {[
                { to: "/sales-rep/customers", icon: <Users size={22} color="#8b5cf6" />, bg: "#8b5cf622", border: "#8b5cf633", label: "عملائي", sub: "عرض قائمة العملاء" },
                { to: "/sales-rep/quotations", icon: <FileText size={22} color="#3b82f6" />, bg: "#3b82f622", border: "#3b82f633", label: "عروض الأسعار", sub: "إنشاء وإدارة العروض" },
                { to: "/sales-rep/visits", icon: <MapPin size={22} color="#f59e0b" />, bg: "#f59e0b22", border: "#f59e0b33", label: "سجل الزيارات", sub: "تسجيل وعرض الزيارات" },
                { to: "/sales-rep/targets", icon: <Target size={22} color="#10b981" />, bg: "#10b98122", border: "#10b98133", label: "أهداف المبيعات", sub: "عرض أهداف الأداء" },
                { to: "/sales", icon: <TrendingUp size={22} color="#0ea5e9" />, bg: "#0ea5e922", border: "#0ea5e933", label: "طلبات المبيعات", sub: "عرض وإدارة الطلبات" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1.1rem 1.25rem",
                    background: item.bg,
                    border: `1px solid ${item.border}`,
                    borderRadius: "12px",
                    transition: "opacity .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{ flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: ".9rem", margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", margin: 0 }}>{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : null}
        </div>
      </section>
    </main>
  );
}
