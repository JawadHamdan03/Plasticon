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
  id: number; name: string; type: string;
  yearManufactured?: number; dateCommissioned?: string; status?: string;
}

const STATUS_META = {
  Active:       { color: "#059669", bg: "#d1fae5" },
  "Under Review": { color: "#d97706", bg: "#fef3c7" },
  Deprecated:   { color: "#6b7280", bg: "#f3f4f6" },
};

export default function EquipmentLifecycleTracking() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMachines(); }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, { headers: { ...authHeaders() }, credentials: "include" });
      if (res.ok) { const d = await res.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const getAge = (dateCommissioned?: string) => {
    if (!dateCommissioned) return "—";
    const years = new Date().getFullYear() - new Date(dateCommissioned).getFullYear();
    return `${years} yr${years !== 1 ? "s" : ""}`;
  };

  const getStatus = (m: Machine) => {
    if (!m.dateCommissioned) return "Active";
    if (m.status?.toLowerCase().includes("inactive")) return "Deprecated";
    if (new Date().getFullYear() - new Date(m.dateCommissioned).getFullYear() > 10) return "Under Review";
    return "Active";
  };

  const activeCount = machines.filter(m => getStatus(m) === "Active").length;
  const reviewCount = machines.filter(m => getStatus(m) === "Under Review").length;
  const deprecatedCount = machines.filter(m => getStatus(m) === "Deprecated").length;

  return (
    <ModulePageShell
      title={nav("Equipment Lifecycle", "دورة حياة المعدات")}
      subtitle={nav("Monitor equipment status and lifecycle stages", "مراقبة حالة المعدات ومراحل دورة الحياة")}
      icon={<Zap size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Active Equipment", "معدات نشطة"), value: activeCount, icon: "⚡", color: "#059669", bg: "#d1fae5" },
          { label: nav("Under Review", "قيد المراجعة"), value: reviewCount, icon: "🔍", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Deprecated", "مستقطع"), value: deprecatedCount, icon: "📦", color: "#6b7280", bg: "#f3f4f6" },
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
          ) : machines.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No equipment found", "لم يتم العثور على معدات")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Equipment", "المعدات")}</th>
                  <th>{nav("Type", "النوع")}</th>
                  <th>{nav("Age", "العمر")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(m => {
                  const status = getStatus(m);
                  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.Active;
                  return (
                    <tr key={m.id}>
                      <td className="font-medium">{m.name}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{m.type || "—"}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{getAge(m.dateCommissioned)}</td>
                      <td>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: meta.bg, color: meta.color }}>{status}</span>
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
