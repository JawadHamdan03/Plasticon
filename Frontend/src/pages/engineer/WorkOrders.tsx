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
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  partsUsed: string; downtimeMinutes: number | null;
  downtimeReason: string; reportText?: string;
  createdAt: string;
  engineer?: { id: number; fullName: string };
}

const PRIORITY_META = {
  High:   { color: "#dc2626", bg: "#fee2e2" },
  Medium: { color: "#d97706", bg: "#fef3c7" },
  Low:    { color: "#059669", bg: "#d1fae5" },
};

export default function WorkOrders() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [orders, setOrders] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, [user?.role]);

  const fetchOrders = async () => {
    const isAdmin = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";
    const endpoint = isAdmin ? "/maintenance/all" : "/maintenance/me";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { ...authHeaders() }, credentials: "include" });
      if (res.ok) { const d = await res.json(); setOrders(Array.isArray(d) ? d : (d.data || [])); }
    } catch { } finally { setLoading(false); }
  };

  const priorityFromDowntime = (mins: number | null): keyof typeof PRIORITY_META => {
    if (!mins || mins < 30) return "Low";
    if (mins < 90) return "Medium";
    return "High";
  };

  const inProgressCount = orders.filter(o => o.reportText && !o.reportText.toLowerCase().includes("completed")).length;
  const completedCount  = orders.filter(o => o.reportText?.toLowerCase().includes("completed")).length;

  return (
    <ModulePageShell
      title={nav("Work Orders", "أوامر العمل")}
      subtitle={nav("Track and manage maintenance work orders", "تتبع وإدارة أوامر عمل الصيانة")}
      icon={<Wrench size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Orders", "إجمالي الطلبات"), value: orders.length, icon: "🔧", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("In Progress", "قيد التنفيذ"),     value: inProgressCount, icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Completed", "مكتمل"),             value: completedCount,  icon: "✅", color: "#059669", bg: "#d1fae5" },
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
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <Wrench size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No work orders yet", "لا توجد أوامر عمل حتى الآن")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Parts Used", "الأجزاء المستخدمة")}</th>
                  <th>{nav("Downtime", "التوقف")}</th>
                  <th>{nav("Priority", "الأولوية")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const priority = priorityFromDowntime(order.downtimeMinutes);
                  const pMeta = PRIORITY_META[priority];
                  return (
                    <tr key={order.id}>
                      <td className="font-medium">{order.machine?.name || `Machine #${order.machineId}`}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{order.partsUsed || "—"}</td>
                      <td>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: pMeta.bg, color: pMeta.color }}>
                          {order.downtimeMinutes ? `${order.downtimeMinutes}m` : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: pMeta.bg, color: pMeta.color }}>
                          {priority === "High" ? <AlertTriangle size={10} /> : priority === "Medium" ? <Clock size={10} /> : <CheckCircle size={10} />}
                          {priority}
                        </span>
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString()}</td>
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
