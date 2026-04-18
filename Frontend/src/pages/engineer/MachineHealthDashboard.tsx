import { useEffect, useState } from "react";
import { Plus, Activity, TrendingDown, Zap } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";


interface Machine { id: number; name: string; type: string; }
interface HealthRecord {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  operationalStatus: string;
  downtimePercentage: number;
  maintenanceHours: number;
  efficiencyRating: number;
  notes?: string;
  recordedAt: string;
  recordedBy?: { id: number; fullName: string };
}

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MAINTENANCE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DOWNTIME: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MachineHealthDashboard() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    machineId: "",
    operationalStatus: "OPERATIONAL",
    downtimePercentage: 0,
    maintenanceHours: 0,
    efficiencyRating: 100,
    notes: "",
  });

  useEffect(() => {
    fetchRecords();
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMachines(Array.isArray(data) ? data : (data.items ?? data.data ?? []));
      }
    } catch { }
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId) { setError(nav("Please select a machine", "الرجاء اختيار آلة")); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          machineId: parseInt(form.machineId),
          operationalStatus: form.operationalStatus,
          downtimePercentage: parseFloat(String(form.downtimePercentage)),
          maintenanceHours: parseFloat(String(form.maintenanceHours)),
          efficiencyRating: parseFloat(String(form.efficiencyRating)),
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        setForm({ machineId: "", operationalStatus: "OPERATIONAL", downtimePercentage: 0, maintenanceHours: 0, efficiencyRating: 100, notes: "" });
        setShowForm(false);
        fetchRecords();
      } else {
        const err = await res.json();
        setError(err.message || nav("Failed to save", "فشل الحفظ"));
      }
    } catch { setError(nav("Network error", "خطأ في الاتصال")); }
    finally { setSaving(false); }
  };

  const avgEfficiency = records.length > 0 ? records.reduce((s, r) => s + r.efficiencyRating, 0) / records.length : 0;
  const operationalCount = records.filter(r => r.operationalStatus === "OPERATIONAL").length;

  return (
    <ModulePageShell title="Machine Health Dashboard" subtitle="View and track machine operational status">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Records", "إجمالي السجلات")}</p>
              <Activity size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{records.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Avg Efficiency", "متوسط الكفاءة")}</p>
              <Zap size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{avgEfficiency.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Operational", "تشغيلي")}</p>
              <TrendingDown size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{operationalCount} / {records.length}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Health Records", "سجلات الصحة")}</h2>
          {!isAdmin && (
            <Button onClick={() => { setShowForm(!showForm); setError(""); }} className="gap-2">
              <Plus size={16} />
              {nav("Add Record", "إضافة سجل")}
            </Button>
          )}
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("New Health Record", "سجل صحة جديد")}</h3>
            {error && <p className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Machine", "الآلة")} *</label>
                  <select value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required>
                    <option value="">{nav("Select machine...", "اختر آلة...")}</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Operational Status", "الحالة التشغيلية")}</label>
                  <select value={form.operationalStatus} onChange={e => setForm({ ...form, operationalStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DOWNTIME">Downtime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Downtime %", "نسبة التوقف %")}</label>
                  <input type="number" min={0} max={100} step={0.1} value={form.downtimePercentage}
                    onChange={e => setForm({ ...form, downtimePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Maintenance Hours", "ساعات الصيانة")}</label>
                  <input type="number" min={0} step={0.5} value={form.maintenanceHours}
                    onChange={e => setForm({ ...form, maintenanceHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Efficiency Rating %", "تقييم الكفاءة %")}</label>
                  <input type="number" min={0} max={100} step={0.1} value={form.efficiencyRating}
                    onChange={e => setForm({ ...form, efficiencyRating: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Notes", "ملاحظات")}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? nav("Saving...", "جاري الحفظ...") : nav("Save", "حفظ")}</Button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Activity className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No health records yet. Click 'Add Record' to start.", "لا توجد سجلات صحة بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Machine", "الآلة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Downtime %", "توقف")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Efficiency", "الكفاءة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Recorded At", "مسجل في")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{r.machine?.name || `Machine #${r.machineId}`}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.operationalStatus] ?? "bg-slate-100 text-slate-700"}`}>
                          {r.operationalStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${r.downtimePercentage}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{r.downtimePercentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div className={`h-2 rounded-full ${r.efficiencyRating >= 80 ? "bg-green-500" : r.efficiencyRating >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${r.efficiencyRating}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{r.efficiencyRating}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.recordedAt).toLocaleDateString()}</td>
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
