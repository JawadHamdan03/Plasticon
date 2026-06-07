import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Target, RefreshCw, BarChart3, Settings, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface DashboardData {
  revenue: number;
  paidRevenue: number;
  expenses: number;
  approvedExpenses: number;
  profit: number;
  profitMargin: number;
  cashBalance: number;
  // Factory KPIs
  salesRevenue: number;
  rawMaterialCost: number;
  electricityCost: number;
  salaryCost: number;
  netProfit: number;
  netProfitMargin: number;
  targets: { revenueTarget: number; expenseLimit: number; profitMarginTarget: number };
}

interface FinancialSettings {
  revenueTarget: number;
  expenseLimit: number;
  profitMarginTarget: number;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: color + "22" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function FinancialDashboard() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<FinancialSettings>({ revenueTarget: 0, expenseLimit: 0, profitMarginTarget: 0 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const fetchDashboard = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/financial/dashboard`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) {
        const result = await res.json();
        const d: DashboardData = result.data ?? result;
        setData(d);
        setSettings({
          revenueTarget: d.targets?.revenueTarget ?? 0,
          expenseLimit: d.targets?.expenseLimit ?? 0,
          profitMarginTarget: d.targets?.profitMarginTarget ?? 0,
        });
      } else {
        setFetchError(nav("Failed to load financial data", "فشل تحميل البيانات المالية"));
      }
    } catch {
      setFetchError(nav("Network error — please check your connection", "خطأ في الاتصال، يرجى التحقق من الشبكة"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboard(); }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/financial/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsMsg(nav("Settings saved successfully", "تم حفظ الإعدادات بنجاح"));
        fetchDashboard(true);
        setTimeout(() => setSettingsMsg(""), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSettingsMsg(err.message || nav("Failed to save", "فشل الحفظ"));
      }
    } catch {
      setSettingsMsg(nav("Network error", "خطأ في الاتصال"));
    } finally {
      setSavingSettings(false);
    }
  };

  const pct = (v: number, t: number) => t > 0 ? Math.min((v / t) * 100, 100) : 0;
  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ModulePageShell
      title={nav("Financial Dashboard", "لوحة القيادة المالية")}
      subtitle={nav("Overview of financial metrics and performance", "نظرة عامة على المقاييس المالية والأداء")}
      icon={<BarChart3 size={22} />}
    >
      {/* Error banner */}
      {fetchError && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <span>{fetchError}</span>
          <button onClick={() => setFetchError("")} className="ms-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {!isAdmin && (
          <Button size="sm" variant="outline" onClick={() => { setShowSettings(!showSettings); setSettingsMsg(""); }}>
            <Settings size={14} className="me-1" />
            {nav("Set Targets", "تعيين الأهداف")}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => fetchDashboard(true)} disabled={refreshing}>
          <RefreshCw size={14} className={`me-1 ${refreshing ? "animate-spin" : ""}`} />
          {nav("Refresh", "تحديث")}
        </Button>
      </div>

      {/* Settings Panel */}
      {!isAdmin && showSettings && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">{nav("Financial Targets", "الأهداف المالية")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Set revenue, expense, and profit goals", "حدد أهداف الإيرادات والمصروفات والربح")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowSettings(false)}>
              <X size={18} />
            </button>
          </div>
          {settingsMsg && (
            <p className={`text-sm mb-3 p-2 rounded-lg ${settingsMsg.includes("success") || settingsMsg.includes("نجاح") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {settingsMsg}
            </p>
          )}
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Target Values", "قيم الأهداف")}</p>
          <form onSubmit={saveSettings}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="label">{nav("Revenue Target (₪)", "هدف الإيرادات ($)")}</label>
                <input type="number" min={0} step={0.01} className="input" value={settings.revenueTarget}
                  onChange={(e) => setSettings({ ...settings, revenueTarget: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">{nav("Expense Limit (₪)", "حد المصروفات ($)")}</label>
                <input type="number" min={0} step={0.01} className="input" value={settings.expenseLimit}
                  onChange={(e) => setSettings({ ...settings, expenseLimit: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">{nav("Profit Margin Target (%)", "هدف هامش الربح (%)")}</label>
                <input type="number" min={0} max={100} step={0.1} className="input" value={settings.profitMarginTarget}
                  onChange={(e) => setSettings({ ...settings, profitMarginTarget: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
              <Button size="sm" type="submit" disabled={savingSettings}>
                <Save size={14} className="me-1" />
                {savingSettings ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Targets", "حفظ الأهداف")}
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setShowSettings(false)}>
                {nav("Cancel", "إلغاء")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ borderRadius: 14, height: 80, background: "var(--bg-surface-2,#f1f5f9)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
            {[
              { label: nav("Total Revenue",  "إجمالي الإيرادات"),  value: fmtMoney(data.revenue),      gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
              { label: nav("Total Expenses", "إجمالي المصروفات"), value: fmtMoney(data.expenses),     gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
              { label: nav("Net Profit",     "صافي الربح"),        value: fmtMoney(data.profit),       gradient: data.profit >= 0 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f87171,#dc2626)" },
              { label: nav("Cash Balance",   "رصيد النقد"),        value: fmtMoney(data.cashBalance),  gradient: data.cashBalance >= 0 ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "linear-gradient(135deg,#f87171,#dc2626)" },
            ].map((k) => (
              <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
                <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
                <p style={{ margin: ".25rem 0 0", fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Factory Cost Breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-(--text-primary) mb-3">{nav("Factory Cost Breakdown — Net Profit Formula", "تفصيل تكاليف المصنع — معادلة صافي الربح")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: ".65rem" }}>
              {[
                { label: nav("Sales Revenue", "إيرادات المبيعات"),  value: fmtMoney(data.salesRevenue ?? 0),     gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
                { label: nav("Raw Materials", "المواد الخام"),       value: fmtMoney(data.rawMaterialCost ?? 0),  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
                { label: nav("Electricity",   "الكهرباء"),           value: fmtMoney(data.electricityCost ?? 0),  gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
                { label: nav("Salaries",      "الرواتب"),            value: fmtMoney(data.salaryCost ?? 0),       gradient: "linear-gradient(135deg,#06b6d4,#0891b2)" },
                { label: nav("Other Expenses","مصروفات أخرى"),       value: fmtMoney(data.approvedExpenses ?? 0), gradient: "linear-gradient(135deg,#94a3b8,#64748b)" },
                { label: nav("Net Profit",    "صافي الربح"),         value: fmtMoney(data.netProfit ?? 0),        gradient: (data.netProfit ?? 0) >= 0 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f87171,#dc2626)" },
              ].map((k) => (
                <div key={k.label} style={{ borderRadius: 12, padding: ".8rem 1rem", background: k.gradient, color: "#fff", boxShadow: "0 3px 10px rgba(0,0,0,.12)" }}>
                  <p style={{ margin: 0, fontSize: ".68rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".05em" }}>{k.label}</p>
                  <p style={{ margin: ".2rem 0 0", fontSize: "1.1rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-(--text-secondary) mt-2">
              {nav("Net Profit = Sales − (Raw Materials + Electricity + Salaries + Other Expenses)", "صافي الربح = المبيعات − (المواد الخام + الكهرباء + الرواتب + المصروفات الأخرى)")}
              {" · "}{nav("Margin", "الهامش")}: <strong style={{ color: (data.netProfit ?? 0) >= 0 ? "#059669" : "#dc2626" }}>{(data.netProfitMargin ?? 0).toFixed(1)}%</strong>
            </p>
          </div>

          {/* Metric Detail Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Revenue */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <DollarSign size={18} style={{ color: "#1d4ed8" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{nav("Revenue", "الإيرادات")}</p>
                  <p className="text-2xl font-bold" style={{ color: "#1d4ed8" }}>{fmtMoney(data.revenue)}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                {nav("Paid", "مدفوع")}: <span className="font-semibold" style={{ color: "#1d4ed8" }}>{fmtMoney(data.paidRevenue)}</span>
              </p>
              {data.targets.revenueTarget > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>{nav("Target", "الهدف")}: {fmtMoney(data.targets.revenueTarget)}</span>
                    <span className="font-semibold" style={{ color: "#1d4ed8" }}>{pct(data.revenue, data.targets.revenueTarget).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pct(data.revenue, data.targets.revenueTarget)} color="#1d4ed8" />
                </div>
              )}
            </Card>

            {/* Expenses */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingDown size={18} style={{ color: "#d97706" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{nav("Expenses", "المصروفات")}</p>
                  <p className="text-2xl font-bold" style={{ color: "#d97706" }}>{fmtMoney(data.expenses)}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                {nav("Approved", "معتمد")}: <span className="font-semibold" style={{ color: "#d97706" }}>{fmtMoney(data.approvedExpenses)}</span>
              </p>
              {data.targets.expenseLimit > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>{nav("Limit", "الحد")}: {fmtMoney(data.targets.expenseLimit)}</span>
                    <span className="font-semibold" style={{ color: "#d97706" }}>{pct(data.expenses, data.targets.expenseLimit).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pct(data.expenses, data.targets.expenseLimit)} color="#d97706" />
                </div>
              )}
            </Card>

            {/* Profit */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: data.profit >= 0 ? "#d1fae5" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingUp size={18} style={{ color: data.profit >= 0 ? "#059669" : "#dc2626" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{nav("Net Profit", "صافي الربح")}</p>
                  <p className="text-2xl font-bold" style={{ color: data.profit >= 0 ? "#059669" : "#dc2626" }}>{fmtMoney(data.profit)}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                {nav("Margin", "الهامش")}: <span className="font-semibold" style={{ color: "#059669" }}>{data.profitMargin.toFixed(2)}%</span>
              </p>
              {data.targets.profitMarginTarget > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>{nav("Target Margin", "هامش الهدف")}: {data.targets.profitMarginTarget.toFixed(1)}%</span>
                    <span className="font-semibold" style={{ color: "#059669" }}>{pct(data.profitMargin, data.targets.profitMarginTarget).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pct(data.profitMargin, data.targets.profitMarginTarget)} color="#059669" />
                </div>
              )}
            </Card>

            {/* Cash Balance */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: data.cashBalance >= 0 ? "#ede9fe" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Target size={18} style={{ color: data.cashBalance >= 0 ? "#7c3aed" : "#dc2626" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{nav("Cash Balance", "رصيد النقد")}</p>
                  <p className="text-2xl font-bold" style={{ color: data.cashBalance >= 0 ? "#7c3aed" : "#dc2626" }}>{fmtMoney(data.cashBalance)}</p>
                </div>
              </div>
              <span className="inline-block text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: data.cashBalance >= 0 ? "#d1fae5" : "#fee2e2", color: data.cashBalance >= 0 ? "#059669" : "#dc2626" }}>
                {data.cashBalance >= 0 ? nav("Positive", "موجب") : nav("Negative", "سالب")}
              </span>
            </Card>
          </div>

          {/* Summary Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">{nav("Financial Summary", "الملخص المالي")}</h3>
            </div>
            <table className="data-table w-full">
              <tbody>
                {[
                  { label: nav("Total Revenue", "إجمالي الإيرادات"), value: fmtMoney(data.revenue), color: "#1d4ed8" },
                  { label: nav("Paid Revenue", "الإيرادات المدفوعة"), value: fmtMoney(data.paidRevenue), color: "#1d4ed8" },
                  { label: nav("Total Expenses", "إجمالي المصروفات"), value: fmtMoney(data.expenses), color: "#d97706" },
                  { label: nav("Approved Expenses", "المصروفات المعتمدة"), value: fmtMoney(data.approvedExpenses), color: "#d97706" },
                  { label: nav("Net Profit", "صافي الربح"), value: fmtMoney(data.profit), color: data.profit >= 0 ? "#059669" : "#dc2626" },
                  { label: nav("Profit Margin", "هامش الربح"), value: `${data.profitMargin.toFixed(2)}%`, color: "#059669" },
                  { label: nav("Cash Balance", "رصيد النقد"), value: fmtMoney(data.cashBalance), color: data.cashBalance >= 0 ? "#7c3aed" : "#dc2626" },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="text-[var(--text-secondary)]">{row.label}</td>
                    <td className="text-right font-semibold" style={{ color: row.color }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No financial data available yet", "لا توجد بيانات مالية متاحة بعد")}</p>
        </Card>
      )}
    </ModulePageShell>
  );
}
