import { useEffect, useState } from "react";
import { BarChart3, Box, ShoppingCart, Clock, Cpu } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { LoadingCenter } from "../../components/ui/spinner";
import { EmptyState } from "../../components/ui/empty-state";
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
    } catch { } finally { setLoading(false); }
  };

  const totalPieces    = data.reduce((s, r) => s + (r.totalPieces ?? 0), 0);
  const totalCartons   = data.reduce((s, r) => s + (r.cartonsCount ?? 0), 0);
  const totalDowntime  = data.reduce((s, r) => s + (r.downtimeMinutes ?? 0), 0);
  const uniqueMachines = new Set(data.map((r) => r.machine?.id).filter(Boolean)).size;

  return (
    <ModulePageShell
      title={"تحليلات الإنتاج"}
      subtitle={"سجلات الإنتاج واتجاهات المخرجات"}
      icon={<BarChart3 size={22} />}
    >
      {/* KPI strip */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <KpiCard label="إجمالي القطع"    value={totalPieces.toLocaleString()}          icon={<Box size={16} />}         color="blue" />
        <KpiCard label="إجمالي الكراتين"  value={totalCartons.toLocaleString()}          icon={<ShoppingCart size={16} />} color="green" />
        <KpiCard label="إجمالي التوقف"   value={`${(totalDowntime / 60).toFixed(1)}h`} icon={<Clock size={16} />}        color="orange" />
        <KpiCard label="الآلات النشطة"    value={String(uniqueMachines)}                 icon={<Cpu size={16} />}          color="purple" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingCenter />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={24} />}
              title="لا توجد سجلات إنتاج"
              description="لم يتم تسجيل أي بيانات إنتاج حتى الآن"
            />
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
                    <td className="font-bold text-(--blue-700)">{(row.totalPieces ?? 0).toLocaleString()}</td>
                    <td>{(row.cartonsCount ?? 0).toLocaleString()}</td>
                    <td className="text-sm text-(--text-secondary)">
                      {row.downtimeMinutes ? `${row.downtimeMinutes}min` : "—"}
                    </td>
                    <td className="text-sm text-(--text-secondary)">
                      {row.downtimeReason ? row.downtimeReason.replace(/_/g, " ") : "—"}
                    </td>
                    <td className="text-sm text-(--text-secondary)">
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
