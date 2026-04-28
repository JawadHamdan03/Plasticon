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
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  efficiencyRating: number; maintenanceHours: number; recordedAt: string;
}

const STATUS_META = {
  Valid:   { color: "#059669", bg: "#d1fae5" },
  Pending: { color: "#d97706", bg: "#fef3c7" },
  Expired: { color: "#dc2626", bg: "#fee2e2" },
};

export default function EquipmentCalibration() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [calibrations, setCalibrations] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCalibrations(); }, []);

  const fetchCalibrations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, { headers: { ...authHeaders() }, credentials: "include" });
      if (res.ok) { const d = await res.json(); setCalibrations(Array.isArray(d) ? d : (d.data || [])); }
    } catch { } finally { setLoading(false); }
  };

  const getStatus = (efficiency: number) => {
    if (efficiency >= 95) return "Valid";
    if (efficiency >= 85) return "Pending";
    return "Expired";
  };

  const nextDue = (date: string) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString();
  };

  const validCount   = calibrations.filter(c => getStatus(c.efficiencyRating) === "Valid").length;
  const pendingCount = calibrations.filter(c => getStatus(c.efficiencyRating) === "Pending").length;
  const expiredCount = calibrations.filter(c => getStatus(c.efficiencyRating) === "Expired").length;

  return (
    <ModulePageShell
      title={nav("Equipment Calibration", "معايرة المعدات")}
      subtitle={nav("Manage equipment calibration schedules and records", "إدارة جداول وسجلات معايرة المعدات")}
      icon={<CheckCircle size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Valid", "صحيح"), value: validCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Pending", "قيد الانتظار"), value: pendingCount, icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Expired", "منتهي الصلاحية"), value: expiredCount, icon: "❌", color: "#dc2626", bg: "#fee2e2" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : calibrations.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No calibration records found", "لم يتم العثور على سجلات معايرة")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Equipment", "المعدات")}</th>
                  <th>{nav("Last Calibrated", "آخر معايرة")}</th>
                  <th>{nav("Next Due", "التالي المستحق")}</th>
                  <th>{nav("Efficiency", "الكفاءة")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {calibrations.map(cal => {
                  const status = getStatus(cal.efficiencyRating);
                  const meta = STATUS_META[status as keyof typeof STATUS_META];
                  const StatusIcon = status === "Valid" ? CheckCircle : status === "Pending" ? Clock : AlertTriangle;
                  return (
                    <tr key={cal.id}>
                      <td className="font-medium">{cal.machine?.name || `Machine #${cal.machineId}`}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{new Date(cal.recordedAt).toLocaleDateString()}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{nextDue(cal.recordedAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width: `${cal.efficiencyRating}%`, background: meta.color }} />
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">{cal.efficiencyRating}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: meta.bg, color: meta.color }}>
                          <StatusIcon size={10} />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
