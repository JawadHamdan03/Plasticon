import { useEffect, useState } from "react";
import { Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Maintenance {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  partsUsed: string;
  downtimeMinutes: number | null;
  downtimeReason: string;
  reportText?: string;
  createdAt: string;
  engineer?: { id: number; fullName: string };
}

export default function WorkOrders() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [orders, setOrders] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [user?.role]);

  const fetchOrders = async () => {
    const isAdmin = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";
    const endpoint = isAdmin ? "/maintenance/all" : "/maintenance/me";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : (data.data || []));
      }
    } catch { } finally { setLoading(false); }
  };

  const priorityFromDowntime = (mins: number | null): string => {
    if (!mins || mins < 30) return "Low";
    if (mins < 90) return "Medium";
    return "High";
  };

  const inProgressCount = orders.filter(o => o.reportText && !o.reportText.includes("completed")).length;
  const completedCount = orders.filter(o => o.reportText?.toLowerCase().includes("completed")).length;

  return (
    <ModulePageShell
      title="Work Orders"
      subtitle="Track and manage maintenance work orders"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Orders", "إجمالي الطلبات")}</p>
              <Wrench size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{orders.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("In Progress", "قيد التنفيذ")}</p>
              <Clock size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{inProgressCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Completed", "اكتمل")}</p>
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{completedCount}</p>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Wrench className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No work orders yet", "لا توجد طلبات عمل حتى الآن")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Machine", "الآلة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Parts Used", "الأجزاء المستخدمة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Downtime", "التوقف")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Priority", "الأولوية")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Date", "التاريخ")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{order.machine?.name || `Machine #${order.machineId}`}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{order.partsUsed || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !order.downtimeMinutes || order.downtimeMinutes < 30 ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : order.downtimeMinutes < 90 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {order.downtimeMinutes ? `${order.downtimeMinutes}m` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          priorityFromDowntime(order.downtimeMinutes) === "High" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : priorityFromDowntime(order.downtimeMinutes) === "Medium" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        }`}>
                          {priorityFromDowntime(order.downtimeMinutes)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
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
