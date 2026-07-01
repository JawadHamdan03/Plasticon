import React, { useEffect, useState } from "react";
import { AlertTriangle, Save, Package, TrendingDown, ShieldAlert } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { Badge } from "../../components/ui/badge";
import { LoadingCenter } from "../../components/ui/spinner";
import { EmptyState } from "../../components/ui/empty-state";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MaterialAlert {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  alertId: number | null;
  alertActive: boolean;
  status: "OK" | "LOW" | "CRITICAL";
}

export default function RawMaterialAlerts() {
  const { user } = useAuth();
  const isAdmin    = user?.role === "ADMIN";
  const isEngineer = user?.role === "ENGINEER";
  const canEdit    = isAdmin || isEngineer;

  const [materials, setMaterials] = useState<MaterialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [thresholdInputs, setThresholdInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<string | number, boolean>>({});

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/raw-material-alerts`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data: MaterialAlert[] = await res.json();
        setMaterials(data || []);
        const stocks: Record<number, string> = {};
        const thresholds: Record<number, string> = {};
        data.forEach((m) => {
          stocks[m.id] = String(m.currentQuantity);
          thresholds[m.id] = String(m.minQuantity);
        });
        setStockInputs(stocks);
        setThresholdInputs(thresholds);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSaveStock = async (id: number) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/raw-material-alerts/${id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ currentQuantity: parseFloat(stockInputs[id] || "0") }),
      });
      if (res.ok) fetchMaterials();
    } catch { } finally { setSaving((prev) => ({ ...prev, [id]: false })); }
  };

  const handleSaveThreshold = async (id: number) => {
    setSaving((prev) => ({ ...prev, [`t_${id}`]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/raw-material-alerts/threshold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ materialId: id, minQuantity: parseFloat(thresholdInputs[id] || "0") }),
      });
      if (res.ok) fetchMaterials();
    } catch { } finally { setSaving((prev) => ({ ...prev, [`t_${id}`]: false })); }
  };

  const totalMaterials = materials.length;
  const lowCount      = materials.filter((m) => m.status === "LOW").length;
  const criticalCount = materials.filter((m) => m.status === "CRITICAL").length;

  const statusTone = (status: string) => {
    if (status === "CRITICAL") return "red" as const;
    if (status === "LOW") return "orange" as const;
    return "green" as const;
  };

  const statusLabel = (status: string) => {
    if (status === "CRITICAL") return "حرج";
    if (status === "LOW") return "منخفض";
    return "طبيعي";
  };

  const rowClass = (status: string) => {
    if (status === "CRITICAL") return "bg-red-50/60 dark:bg-red-900/10";
    if (status === "LOW") return "bg-orange-50/60 dark:bg-orange-900/10";
    return "";
  };

  return (
    <ModulePageShell
      title={"تنبيهات المواد الخام"}
      subtitle={"مراقبة وإدارة مستويات مخزون المواد الخام"}
      icon={<AlertTriangle size={22} />}
    >
      {/* KPI strip */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <KpiCard label="إجمالي المواد"    value={totalMaterials} icon={<Package size={16} />}      color="blue" />
        <KpiCard label="مخزون منخفض"     value={lowCount}       icon={<TrendingDown size={16} />}  color="orange" />
        <KpiCard label="حرج (لا مخزون)"  value={criticalCount}  icon={<ShieldAlert size={16} />}   color="red" />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingCenter />
          ) : materials.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={22} />} title="لا توجد مواد" description="لم يتم العثور على مواد خام في النظام" />
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{"المادة"}</th>
                  <th>{"الوحدة"}</th>
                  <th>{"المخزون الحالي"}</th>
                  <th>{"الحد الأدنى"}</th>
                  <th>{"الحالة"}</th>
                  {canEdit && <th>{"تحديث المخزون"}</th>}
                  {canEdit && <th>{"تحديد الحد"}</th>}
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className={rowClass(m.status)}>
                    <td className="font-medium">{m.name}</td>
                    <td>{m.unit}</td>
                    <td>{m.currentQuantity.toFixed(2)}</td>
                    <td>{m.minQuantity.toFixed(2)}</td>
                    <td>
                      <Badge tone={statusTone(m.status)} dot>{statusLabel(m.status)}</Badge>
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" step="0.01" className="input w-24 text-sm"
                            value={stockInputs[m.id] ?? ""}
                            onChange={(e) => setStockInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" onClick={() => handleSaveStock(m.id)} disabled={!!saving[m.id]}>
                            <Save size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" step="0.01" className="input w-24 text-sm"
                            value={thresholdInputs[m.id] ?? ""}
                            onChange={(e) => setThresholdInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" onClick={() => handleSaveThreshold(m.id)} disabled={!!saving[`t_${m.id}`]}>
                            <Save size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
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
