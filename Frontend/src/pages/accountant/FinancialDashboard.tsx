import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Target, RefreshCw, BarChart3, Settings } from "lucide-react";
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
  targets: { revenueTarget: number; expenseLimit: number; profitMarginTarget: number };
}

interface FinancialSettings {
  revenueTarget: number;
  expenseLimit: number;
  profitMarginTarget: number;
}

function SkeletonCard() {
  return <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />;
}

function ProgressBar({ value, color }: { value: number; color: "blue" | "red" | "green" | "purple" }) {
  const colorClass = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  }[color];
  return (
    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(value, 100)}%` }}
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
      const res = await fetch(`${API_BASE_URL}/financial/dashboard`, {
        headers: authHeaders(),
        credentials: "include",
      });
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
        const err = await res.json().catch(() => ({}));
        setFetchError(err.message || nav("Failed to load financial data", "فشل تحميل البيانات المالية"));
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
        const err = await res.json();
        setSettingsMsg(err.message || nav("Failed to save", "فشل الحفظ"));
      }
    } catch { setSettingsMsg(nav("Network error", "خطأ في الاتصال")); }
    finally { setSavingSettings(false); }
  };

  const pct = (v: number, t: number) => t > 0 ? Math.min((v / t) * 100, 100) : 0;

  return (
    <ModulePageShell
      title={nav("Financial Dashboard", "لوحة القيادة المالية")}
      subtitle={nav("Overview of financial metrics and performance", "نظرة عامة على المقاييس المالية والأداء")}
    >
      <div className="space-y-6">
        {/* Fetch error */}
        {fetchError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            <span>{fetchError}</span>
            <button onClick={() => setFetchError("")} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-end gap-2">
          {!isAdmin && (
            <Button variant="ghost" onClick={() => { setShowSettings(!showSettings); setSettingsMsg(""); }} className="gap-2 text-slate-500 text-sm px-3 py-1.5">
              <Settings size={14} />
              {nav("Targets", "الأهداف")}
            </Button>
          )}
          <Button variant="ghost" onClick={() => fetchDashboard(true)} disabled={refreshing} className="gap-2 text-slate-500 text-sm px-3 py-1.5">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {nav("Refresh", "تحديث")}
          </Button>
        </div>

        {/* Settings Panel */}
        {!isAdmin && showSettings && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("Financial Targets", "الأهداف المالية")}</h3>
            {settingsMsg && (
              <p className={`text-sm mb-3 p-2 rounded ${settingsMsg.includes("success") || settingsMsg.includes("نجاح") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {settingsMsg}
              </p>
            )}
            <form onSubmit={saveSettings}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Revenue Target ($)", "هدف الإيرادات ($)")}</label>
                  <input type="number" min={0} step={0.01} value={settings.revenueTarget}
                    onChange={e => setSettings({ ...settings, revenueTarget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Expense Limit ($)", "حد المصروفات ($)")}</label>
                  <input type="number" min={0} step={0.01} value={settings.expenseLimit}
                    onChange={e => setSettings({ ...settings, expenseLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Profit Margin Target (%)", "هدف هامش الربح (%)")}</label>
                  <input type="number" min={0} max={100} step={0.1} value={settings.profitMarginTarget}
                    onChange={e => setSettings({ ...settings, profitMarginTarget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? nav("Saving...", "جاري الحفظ...") : nav("Save Targets", "حفظ الأهداف")}
                </Button>
                <button type="button" onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : !data ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <BarChart3 className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No financial data available yet.", "لا توجد بيانات مالية متاحة بعد.")}</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Revenue */}
              <Card className="p-6 bg-linear-to-br from-blue-50 to-blue-100/60 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                      {nav("Total Revenue", "إجمالي الإيرادات")}
                    </p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">${data.revenue.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {nav("Paid", "مدفوع")}: <span className="font-semibold text-blue-600">${data.paidRevenue.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-xl">
                    <DollarSign className="text-blue-700 dark:text-blue-200" size={22} />
                  </div>
                </div>
                {data.targets.revenueTarget > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{nav("Target", "الهدف")}: ${data.targets.revenueTarget.toFixed(2)}</span>
                      <span className="font-semibold text-blue-600">{pct(data.revenue, data.targets.revenueTarget).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={pct(data.revenue, data.targets.revenueTarget)} color="blue" />
                  </div>
                )}
              </Card>

              {/* Expenses */}
              <Card className="p-6 bg-linear-to-br from-orange-50 to-orange-100/60 dark:from-orange-900/30 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1">
                      {nav("Total Expenses", "إجمالي المصروفات")}
                    </p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">${data.expenses.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {nav("Approved", "معتمد")}: <span className="font-semibold text-orange-600">${data.approvedExpenses.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 dark:bg-orange-700 rounded-xl">
                    <TrendingDown className="text-orange-700 dark:text-orange-200" size={22} />
                  </div>
                </div>
                {data.targets.expenseLimit > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{nav("Limit", "الحد")}: ${data.targets.expenseLimit.toFixed(2)}</span>
                      <span className="font-semibold text-orange-600">{pct(data.expenses, data.targets.expenseLimit).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={pct(data.expenses, data.targets.expenseLimit)} color="red" />
                  </div>
                )}
              </Card>

              {/* Profit */}
              <Card className="p-6 bg-linear-to-br from-green-50 to-green-100/60 dark:from-green-900/30 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                      {nav("Net Profit", "صافي الربح")}
                    </p>
                    <p className={`text-3xl font-bold ${data.profit >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      ${data.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {nav("Margin", "الهامش")}: <span className="font-semibold text-green-600">{data.profitMargin.toFixed(2)}%</span>
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-700 rounded-xl">
                    <TrendingUp className="text-green-700 dark:text-green-200" size={22} />
                  </div>
                </div>
                {data.targets.profitMarginTarget > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{nav("Target Margin", "هامش الهدف")}: {data.targets.profitMarginTarget.toFixed(1)}%</span>
                      <span className="font-semibold text-green-600">{pct(data.profitMargin, data.targets.profitMarginTarget).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={pct(data.profitMargin, data.targets.profitMarginTarget)} color="green" />
                  </div>
                )}
              </Card>

              {/* Cash Balance */}
              <Card className="p-6 bg-linear-to-br from-purple-50 to-purple-100/60 dark:from-purple-900/30 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">
                      {nav("Cash Balance", "رصيد النقد")}
                    </p>
                    <p className={`text-3xl font-bold ${data.cashBalance >= 0 ? "text-purple-700 dark:text-purple-300" : "text-red-700 dark:text-red-300"}`}>
                      ${data.cashBalance.toFixed(2)}
                    </p>
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${data.cashBalance >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                      {data.cashBalance >= 0 ? nav("Positive", "موجب") : nav("Negative", "سالب")}
                    </span>
                  </div>
                  <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-xl">
                    <Target className="text-purple-700 dark:text-purple-200" size={22} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Summary Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{nav("Financial Summary", "الملخص المالي")}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    [nav("Total Revenue", "إجمالي الإيرادات"), `$${data.revenue.toFixed(2)}`, "text-blue-700 dark:text-blue-300"],
                    [nav("Paid Revenue", "الإيرادات المدفوعة"), `$${data.paidRevenue.toFixed(2)}`, "text-blue-500 dark:text-blue-400"],
                    [nav("Total Expenses", "إجمالي المصروفات"), `$${data.expenses.toFixed(2)}`, "text-orange-700 dark:text-orange-300"],
                    [nav("Approved Expenses", "المصروفات المعتمدة"), `$${data.approvedExpenses.toFixed(2)}`, "text-orange-500 dark:text-orange-400"],
                    [nav("Net Profit", "صافي الربح"), `$${data.profit.toFixed(2)}`, data.profit >= 0 ? "text-green-700 dark:text-green-300 font-bold" : "text-red-700 dark:text-red-300 font-bold"],
                    [nav("Profit Margin", "هامش الربح"), `${data.profitMargin.toFixed(2)}%`, "text-green-600 dark:text-green-400"],
                    [nav("Cash Balance", "رصيد النقد"), `$${data.cashBalance.toFixed(2)}`, data.cashBalance >= 0 ? "text-purple-700 dark:text-purple-300 font-bold" : "text-red-700 dark:text-red-300 font-bold"],
                  ].map(([label, value, cls]) => (
                    <tr key={label} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-5 text-slate-600 dark:text-slate-400">{label}</td>
                      <td className={`py-3 px-5 text-right ${cls}`}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </ModulePageShell>
  );
}
