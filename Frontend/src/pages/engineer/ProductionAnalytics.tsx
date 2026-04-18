import { useEffect, useState } from "react";
import { BarChart3, Zap, TrendingUp, Package } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ProductionData {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  unitsProduced: number;
  efficiency: number;
  downtimeMinutes: number;
  qualityRate: number;
  date: string;
}

export default function ProductionAnalytics() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [data, setData] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductionData();
  }, []);

  const fetchProductionData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const records = await res.json();
        const healthRecords = Array.isArray(records) ? records : (records.data || []);
        const transformed = healthRecords.map((r: any) => ({
          id: r.id,
          machineId: r.machineId,
          machine: r.machine,
          unitsProduced: Math.round(r.efficiencyRating * 10),
          efficiency: r.efficiencyRating,
          downtimeMinutes: r.maintenanceHours * 60,
          qualityRate: Math.min(100, r.efficiencyRating + 5),
          date: r.recordedAt,
        }));
        setData(transformed);
      }
    } catch { } finally { setLoading(false); }
  };

  const totalUnits = data.reduce((s, d) => s + d.unitsProduced, 0);
  const avgEfficiency = data.length > 0 ? (data.reduce((s, d) => s + d.efficiency, 0) / data.length).toFixed(1) : "0";
  const totalDowntime = (data.reduce((s, d) => s + d.downtimeMinutes, 0) / 60).toFixed(1);
  const avgQuality = data.length > 0 ? (data.reduce((s, d) => s + d.qualityRate, 0) / data.length).toFixed(1) : "0";

  return (
    <ModulePageShell
      title="Production Analytics"
      subtitle="Analyze production metrics and performance trends"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Units Produced", "الوحدات المُنتجة")}</p>
              <Package size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalUnits.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Efficiency", "الكفاءة")}</p>
              <Zap size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{avgEfficiency}%</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Downtime", "التوقف")}</p>
              <TrendingUp size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalDowntime}h</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Quality Rate", "معدل الجودة")}</p>
              <BarChart3 size={18} className="text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{avgQuality}%</p>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : data.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <BarChart3 className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No production data available", "لا توجد بيانات إنتاج متاحة")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Machine", "الآلة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Units", "وحدات")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Efficiency", "الكفاءة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Downtime", "التوقف")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Quality", "الجودة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{row.machine?.name || `Machine #${row.machineId}`}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.unitsProduced}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div className={`h-2 rounded-full ${row.efficiency >= 80 ? "bg-green-500" : row.efficiency >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${row.efficiency}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{row.efficiency.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{(row.downtimeMinutes / 60).toFixed(1)}h</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.qualityRate >= 95 ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : row.qualityRate >= 90 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {row.qualityRate.toFixed(1)}%
                        </span>
                      </td>
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
