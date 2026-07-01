import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
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
    { label: "إجمالي القطع",    value: totalPieces.toLocaleString(),           gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
    { label: "إجمالي الكراتين",  value: totalCartons.toLocaleString(),           gradient: "linear-gradient(135deg,#10b981,#059669)" },
    { label: "إجمالي التوقف",   value: `${(totalDowntime / 60).toFixed(1)}h`,  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { label: "الآلات النشطة",    value: String(uniqueMachines),                  gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
  ];

  return (
    <ModulePageShell
      title={"تحليلات الإنتاج"}
      subtitle={"سجلات الإنتاج واتجاهات المخرجات"}
      icon={<BarChart3 size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{"لا توجد سجلات إنتاج"}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{"العامل"}</th>
                  <th>{"الآلة"}</th>
                  <th>{"الشفت"}</th>
                  <th>{"القطع"}</th>
                  <th>{"الكراتين"}</th>
                  <th>{"التوقف"}</th>
                  <th>{"السبب"}</th>
                  <th>{"التاريخ"}</th>
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
