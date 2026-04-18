import { useEffect, useState } from "react";
import { DollarSign, Target } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface DashboardData {
  revenue: number;
  paidRevenue: number;
  expenses: number;
  approvedExpenses: number;
  profit: number;
  profitMargin: number;
  cashBalance: number;
  targets: {
    revenueTarget: number;
    expenseLimit: number;
    profitMarginTarget: number;
  };
}

export default function FinancialDashboard() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/financial/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModulePageShell
        title="Financial Dashboard"
        subtitle="Overview of financial metrics and performance"
      >
        <p>{nav("Loading...", "جاري التحميل...")}</p>
      </ModulePageShell>
    );
  }

  if (!data) {
    return (
      <ModulePageShell
        title="Financial Dashboard"
        subtitle="Overview of financial metrics and performance"
      >
        <Card className="p-8 text-center text-slate-500">
          {nav("Failed to load dashboard", "فشل تحميل لوحة القيادة")}
        </Card>
      </ModulePageShell>
    );
  }

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <ModulePageShell
      title="Financial Dashboard"
      subtitle="Overview of financial metrics and performance"
    >
      <div className="space-y-6">
        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {nav("Total Revenue", "إجمالي الإيرادات")}
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  ${data.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {nav("Paid", "مدفوع")}: ${data.paidRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-lg">
                <DollarSign className="text-blue-700 dark:text-blue-300" size={24} />
              </div>
            </div>

            {data.targets.revenueTarget > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{nav("Target", "الهدف")}:</span>
                  <span>${data.targets.revenueTarget.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${getProgressPercentage(data.revenue, data.targets.revenueTarget)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getProgressPercentage(data.revenue, data.targets.revenueTarget).toFixed(0)}%{" "}
                  {nav("of target", "من الهدف")}
                </p>
              </div>
            )}
          </Card>

          {/* Expenses */}
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {nav("Total Expenses", "إجمالي المصروفات")}
                </p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                  ${data.expenses.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {nav("Approved", "معتمد")}: ${data.approvedExpenses.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-red-200 dark:bg-red-700 rounded-lg">
                <DollarSign className="text-red-700 dark:text-red-300" size={24} />
              </div>
            </div>

            {data.targets.expenseLimit > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{nav("Limit", "الحد")}:</span>
                  <span>${data.targets.expenseLimit.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-red-600 dark:bg-red-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((data.expenses / data.targets.expenseLimit) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {Math.min((data.expenses / data.targets.expenseLimit) * 100, 100).toFixed(0)}%{" "}
                  {nav("of limit", "من الحد")}
                </p>
              </div>
            )}
          </Card>

          {/* Profit */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {nav("Net Profit", "صافي الربح")}
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  ${data.profit.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {nav("Margin", "الهامش")}: {data.profitMargin.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-700 rounded-lg">
                <TrendingUp className="text-green-700 dark:text-green-300" size={24} />
              </div>
            </div>

            {data.targets.profitMarginTarget > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{nav("Target Margin", "هامش الهدف")}:</span>
                  <span>{data.targets.profitMarginTarget.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((data.profitMargin / data.targets.profitMarginTarget) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </Card>

          {/* Cash Balance */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {nav("Cash Balance", "رصيد النقد")}
                </p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  ${data.cashBalance.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {data.cashBalance >= 0
                    ? nav("Positive", "موجب")
                    : nav("Negative", "سالب")}
                </p>
              </div>
              <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-lg">
                <Target className="text-purple-700 dark:text-purple-300" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Summary Table */}
        <Card className="p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-4">{nav("Financial Summary", "الملخص المالي")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-3 px-4 font-medium">{nav("Total Revenue", "إجمالي الإيرادات")}</td>
                  <td className="py-3 px-4 text-right">${data.revenue.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-3 px-4 font-medium">{nav("Paid Revenue", "الإيرادات المدفوعة")}</td>
                  <td className="py-3 px-4 text-right">${data.paidRevenue.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-3 px-4 font-medium">{nav("Total Expenses", "إجمالي المصروفات")}</td>
                  <td className="py-3 px-4 text-right">${data.expenses.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-3 px-4 font-medium">{nav("Approved Expenses", "المصروفات المعتمدة")}</td>
                  <td className="py-3 px-4 text-right">${data.approvedExpenses.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-700">
                  <td className="py-3 px-4 font-bold">{nav("Net Profit", "صافي الربح")}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-700 dark:text-green-300">
                    ${data.profit.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">{nav("Profit Margin", "هامش الربح")}</td>
                  <td className="py-3 px-4 text-right">{data.profitMargin.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ModulePageShell>
  );
}
