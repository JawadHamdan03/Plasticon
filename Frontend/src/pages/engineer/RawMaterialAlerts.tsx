import React, { useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin    = user?.role === "ADMIN";
  const isEngineer = user?.role === "ENGINEER";
  const canEdit    = isAdmin || isEngineer;
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

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
  const lowCount = materials.filter((m) => m.status === "LOW").length;
  const criticalCount = materials.filter((m) => m.status === "CRITICAL").length;

  const statusBadge = (status: string): React.CSSProperties => {
    if (status === "CRITICAL") return { background: "rgba(239,68,68,.12)", color: "#dc2626" };
    if (status === "LOW") return { background: "rgba(249,115,22,.12)", color: "#ea580c" };
    return { background: "rgba(34,197,94,.12)", color: "#16a34a" };
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
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "إجمالي المواد",       value: totalMaterials, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: "مخزون منخفض",          value: lowCount,       gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: "حرج (لا مخزون)",       value: criticalCount,  gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: kpi.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{kpi.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : materials.length === 0 ? (
            <div className="p-10 text-center text-(--text-secondary)">{"لا توجد مواد"}</div>
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
                      <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, ...statusBadge(m.status) }}>{m.status}</span>
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input w-24 text-sm"
                            value={stockInputs[m.id] ?? ""}
                            onChange={(e) => setStockInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveStock(m.id)}
                            disabled={!!saving[m.id]}
                          >
                            <Save size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input w-24 text-sm"
                            value={thresholdInputs[m.id] ?? ""}
                            onChange={(e) => setThresholdInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveThreshold(m.id)}
                            disabled={!!saving[`t_${m.id}`]}
                          >
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
