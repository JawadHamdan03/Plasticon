import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ProductionRecord {
  id: number;
  cartonsCount: number;
  totalPieces: number;
  downtimeMinutes: number | null;
  downtimeReason: string | null;
  notes: string | null;
  createdAt: string;
  worker?: { id: number; fullName: string };
  machine?: { id: number; name: string; type: string };
  shift?: { id: number; name: string };
}

export default function ProductionAnalytics() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [data, setData] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/production/all`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const raw: ProductionRecord[] = Array.isArray(json) ? json : (json.data ?? []);
        setData(raw);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const totalPieces  = data.reduce((s, r) => s + (r.totalPieces ?? 0), 0);
  const totalCartons = data.reduce((s, r) => s + (r.cartonsCount ?? 0), 0);
  const totalDowntime = data.reduce((s, r) => s + (r.downtimeMinutes ?? 0), 0);
  const uniqueMachines = new Set(data.map((r) => r.machine?.id).filter(Boolean)).size;

  const kpis = [
    { label: nav("Total Pieces", "إجمالي القطع"),   value: totalPieces.toLocaleString(),           icon: "📦", color: "#1d4ed8", bg: "#dbeafe" },
    { label: nav("Total Cartons", "إجمالي الكراتين"), value: totalCartons.toLocaleString(),         icon: "🗃️", color: "#059669", bg: "#d1fae5" },
    { label: nav("Total Downtime", "إجمالي التوقف"), value: `${(totalDowntime / 60).toFixed(1)}h`, icon: "⏱️", color: "#d97706", bg: "#fef3c7" },
    { label: nav("Machines Active", "الآلات النشطة"), value: String(uniqueMachines),               icon: "⚙️", color: "#7c3aed", bg: "#ede9fe" },
  ];

  return (
    <ModulePageShell
      title={nav("Production Analytics", "تحليلات الإنتاج")}
      subtitle={nav("Production records and output trends", "سجلات الإنتاج واتجاهات المخرجات")}
      icon={<BarChart3 size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight truncate">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No production records found", "لا توجد سجلات إنتاج")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Worker", "العامل")}</th>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Shift", "الشفت")}</th>
                  <th>{nav("Pieces", "القطع")}</th>
                  <th>{nav("Cartons", "الكراتين")}</th>
                  <th>{nav("Downtime", "التوقف")}</th>
                  <th>{nav("Reason", "السبب")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.worker?.fullName ?? "—"}</td>
                    <td>{row.machine?.name ?? "—"}</td>
                    <td>{row.shift?.name ?? "—"}</td>
                    <td className="font-bold" style={{ color: "#1d4ed8" }}>{(row.totalPieces ?? 0).toLocaleString()}</td>
                    <td>{(row.cartonsCount ?? 0).toLocaleString()}</td>
                    <td className="text-sm text-[var(--text-secondary)]">
                      {row.downtimeMinutes ? `${row.downtimeMinutes}min` : "—"}
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">
                      {row.downtimeReason ? row.downtimeReason.replace(/_/g, " ") : "—"}
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
