import { useEffect, useState } from "react";
import { Package, Zap, AlertTriangle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Machine {
  id: number;
  name: string;
  type: string;
  yearManufactured?: number;
  dateCommissioned?: string;
  status?: string;
}

export default function EquipmentLifecycleTracking() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMachines(Array.isArray(data) ? data : (data.items ?? data.data ?? []));
      }
    } catch { } finally { setLoading(false); }
  };

  const getEquipmentAge = (dateCommissioned?: string): string => {
    if (!dateCommissioned) return "—";
    const date = new Date(dateCommissioned);
    const now = new Date();
    const years = now.getFullYear() - date.getFullYear();
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const getLifecycleStatus = (machine: Machine): string => {
    if (!machine.dateCommissioned) return "Active";
    const date = new Date(machine.dateCommissioned);
    const now = new Date();
    const years = now.getFullYear() - date.getFullYear();

    if (machine.status?.toLowerCase().includes("inactive")) return "Deprecated";
    if (years > 10) return "Under Review";
    return "Active";
  };

  const activeCount = machines.filter(m => getLifecycleStatus(m) === "Active").length;
  const deprecatedCount = machines.filter(m => getLifecycleStatus(m) === "Deprecated").length;
  const reviewCount = machines.filter(m => getLifecycleStatus(m) === "Under Review").length;

  return (
    <ModulePageShell
      title="Equipment Lifecycle"
      subtitle="Monitor equipment status and lifecycle stages"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Active Equipment", "معدات نشطة")}</p>
              <Zap size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{activeCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Deprecated", "مستقطع")}</p>
              <Package size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{deprecatedCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Under Review", "قيد المراجعة")}</p>
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{reviewCount}</p>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : machines.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Package className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No equipment found", "لم يتم العثور على معدات")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Equipment", "المعدات")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Type", "النوع")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Age", "العمر")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {machines.map(machine => {
                    const status = getLifecycleStatus(machine);
                    return (
                      <tr key={machine.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{machine.name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{machine.type || "—"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{getEquipmentAge(machine.dateCommissioned)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : status === "Deprecated" ? "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
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
