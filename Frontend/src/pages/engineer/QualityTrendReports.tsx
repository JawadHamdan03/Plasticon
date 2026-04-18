import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface QualityCheck {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  checkType: string;
  result: "PASS" | "FAIL";
  severity?: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
  checkedAt: string;
  checkedBy?: { id: number; fullName: string };
}

export default function QualityTrendReports() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQualityChecks();
  }, [user?.role]);

  const fetchQualityChecks = async () => {
    const isAdmin = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";
    const endpoint = isAdmin ? "/quality-checks/all" : "/quality-checks/me";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setChecks(Array.isArray(data) ? data : (data.data || []));
      }
    } catch { } finally { setLoading(false); }
  };

  const passCount = checks.filter(c => c.result === "PASS").length;
  const failCount = checks.filter(c => c.result === "FAIL").length;
  const passRate = checks.length > 0 ? ((passCount / checks.length) * 100).toFixed(1) : "0.0";
  const criticalCount = checks.filter(c => c.severity === "HIGH" && c.result === "FAIL").length;

  return (
    <ModulePageShell
      title="Quality Trends"
      subtitle="Track quality metrics and trend analysis"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Pass Rate", "معدل النجاح")}</p>
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{passRate}%</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Defects Found", "العيوب المكتشفة")}</p>
              <TrendingUp size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{failCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Critical Issues", "مشاكل حرجة")}</p>
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{criticalCount}</p>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : checks.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <TrendingUp className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No quality checks found", "لم يتم العثور على فحوصات جودة")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Machine", "الآلة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Check Type", "نوع الفحص")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Result", "النتيجة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Severity", "الخطورة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Date", "التاريخ")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {checks.map(check => (
                    <tr key={check.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{check.machine?.name || `Machine #${check.machineId}`}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{check.checkType || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          check.result === "PASS" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {check.result}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          check.severity === "HIGH" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : check.severity === "MEDIUM" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        }`}>
                          {check.severity || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(check.checkedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
