import { useEffect, useState } from "react";
import { AlertTriangle, Package, TrendingDown, Save } from "lucide-react";
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

  const statusBadge = (status: string) => {
    if (status === "CRITICAL") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    if (status === "LOW") return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
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
        <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{nav("Total Materials", "إجمالي المواد")}</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalMaterials}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20">
          <div className="flex items-center gap-3">
            <TrendingDown size={20} className="text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{nav("Low Stock", "مخزون منخفض")}</p>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{lowCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{nav("Critical (0 stock)", "حرج (لا مخزون)")}</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200">{criticalCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : materials.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">{nav("No materials found", "لا توجد مواد")}</div>
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
                      <span className={`badge ${statusBadge(m.status)}`}>{m.status}</span>
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
