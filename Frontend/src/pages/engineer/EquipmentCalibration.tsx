import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface HealthRecord {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  efficiencyRating: number;
  maintenanceHours: number;
  recordedAt: string;
}

export default function EquipmentCalibration() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [calibrations, setCalibrations] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalibrations();
  }, []);

  const fetchCalibrations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCalibrations(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const getCalibrationStatus = (efficiency: number): string => {
    if (efficiency >= 95) return "Valid";
    if (efficiency >= 85) return "Pending";
    return "Expired";
  };

  const validCount = calibrations.filter(c => getCalibrationStatus(c.efficiencyRating) === "Valid").length;
  const pendingCount = calibrations.filter(c => getCalibrationStatus(c.efficiencyRating) === "Pending").length;
  const expiredCount = calibrations.filter(c => getCalibrationStatus(c.efficiencyRating) === "Expired").length;

  const nextDueDate = (date: string): string => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString();
  };

  return (
    <ModulePageShell
      title="Equipment Calibration"
      subtitle="Manage equipment calibration schedules and records"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Valid", "صحيح")}</p>
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{validCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Pending", "قيد الانتظار")}</p>
              <Clock size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{pendingCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Expired", "منتهي الصلاحية")}</p>
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{expiredCount}</p>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : calibrations.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <CheckCircle className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No calibration records found", "لم يتم العثور على سجلات معايرة")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Equipment", "المعدات")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Last Calibrated", "آخر معايرة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Next Due", "التالي المستحق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {calibrations.map(cal => {
                    const status = getCalibrationStatus(cal.efficiencyRating);
                    return (
                      <tr key={cal.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{cal.machine?.name || `Machine #${cal.machineId}`}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{new Date(cal.recordedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{nextDueDate(cal.recordedAt)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === "Valid" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : status === "Pending" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
