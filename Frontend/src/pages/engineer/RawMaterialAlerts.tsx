import React, { useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
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
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [materials, setMaterials] = useState<MaterialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [thresholdInputs, setThresholdInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

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
      title={nav("Raw Material Alerts", "تنبيهات المواد الخام")}
      subtitle={nav("Monitor and manage raw material stock levels", "مراقبة وإدارة مستويات مخزون المواد الخام")}
      icon={<AlertTriangle size={22} />}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: "📦", label: nav("Total Materials", "إجمالي المواد"), value: totalMaterials, color: "#3b82f6", bg: "rgba(59,130,246,.1)" },
          { icon: "⚠️", label: nav("Low Stock", "مخزون منخفض"), value: lowCount, color: "#f97316", bg: "rgba(249,115,22,.1)" },
          { icon: "🚨", label: nav("Critical (0 stock)", "حرج (لا مخزون)"), value: criticalCount, color: "#ef4444", bg: "rgba(239,68,68,.1)" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                {kpi.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)" }}>{kpi.label}</p>
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: kpi.color }}>{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : materials.length === 0 ? (
            <div className="p-10 text-center text-(--text-secondary)">{nav("No materials found", "لا توجد مواد")}</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Material", "المادة")}</th>
                  <th>{nav("Unit", "الوحدة")}</th>
                  <th>{nav("Current Stock", "المخزون الحالي")}</th>
                  <th>{nav("Min Threshold", "الحد الأدنى")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                  {!isAdmin && <th>{nav("Update Stock", "تحديث المخزون")}</th>}
                  {!isAdmin && <th>{nav("Set Threshold", "تحديد الحد")}</th>}
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
                    {!isAdmin && (
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
                            disabled={saving[m.id]}
                          >
                            <Save size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                    {!isAdmin && (
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
                            disabled={saving[`t_${m.id}` as unknown as number]}
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
