import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, Calendar } from "lucide-react";
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


interface Machine { id: number; name: string; type: string; }
interface Schedule {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  scheduleType: string;
  frequency: string;
  nextScheduledDate: string;
  lastScheduledDate?: string;
  assignedEngineerId?: number;
  assignedEngineer?: { id: number; fullName: string };
  status: string;
  description?: string;
}

export default function PreventiveMaintenanceSchedule() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    machineId: "",
    scheduleType: "PREVENTIVE",
    frequency: "WEEKLY",
    nextScheduledDate: "",
    assignedEngineerId: "",
    description: "",
  });

  useEffect(() => {
    fetchSchedules();
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

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance-schedule`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId) { setError(nav("Please select a machine", "الرجاء اختيار آلة")); return; }
    if (!form.nextScheduledDate) { setError(nav("Please select a date", "الرجاء اختيار تاريخ")); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          machineId: parseInt(form.machineId),
          scheduleType: form.scheduleType,
          frequency: form.frequency,
          nextScheduledDate: form.nextScheduledDate,
          assignedEngineerId: form.assignedEngineerId ? parseInt(form.assignedEngineerId) : undefined,
          description: form.description || undefined,
        }),
      });
      if (res.ok) {
        setForm({ machineId: "", scheduleType: "PREVENTIVE", frequency: "WEEKLY", nextScheduledDate: "", assignedEngineerId: "", description: "" });
        setShowForm(false);
        fetchSchedules();
      } else {
        const err = await res.json();
        setError(err.message || nav("Failed to save", "فشل الحفظ"));
      }
    } catch { setError(nav("Network error", "خطأ في الاتصال")); }
    finally { setSaving(false); }
  };

  const isOverdue = (date: string) => new Date(date) < new Date();
  const overdueCount = schedules.filter(s => isOverdue(s.nextScheduledDate) && s.status !== "COMPLETED").length;

  return (
    <ModulePageShell title="Preventive Maintenance Schedule" subtitle="Manage and track preventive maintenance schedules">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Schedules", "إجمالي الجداول")}</p>
              <Calendar size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{schedules.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Completed", "مكتمل")}</p>
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{schedules.filter(s => s.status === "COMPLETED").length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Overdue", "متأخر")}</p>
              <Clock size={18} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{overdueCount}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Maintenance Schedules", "جداول الصيانة")}</h2>
          {!isAdmin && (
            <Button onClick={() => { setShowForm(!showForm); setError(""); }} className="gap-2">
              <Plus size={16} />
              {nav("Create Schedule", "إنشاء جدول")}
            </Button>
          )}
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("New Maintenance Schedule", "جدول صيانة جديد")}</h3>
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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Schedule Type", "نوع الجدول")}</label>
                  <select value={form.scheduleType} onChange={e => setForm({ ...form, scheduleType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="PREDICTIVE">Predictive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Frequency", "التكرار")}</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Next Scheduled Date", "تاريخ الجدول التالي")} *</label>
                  <input type="date" value={form.nextScheduledDate} onChange={e => setForm({ ...form, nextScheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Description", "الوصف")}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" rows={2} />
                </div>
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

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : schedules.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Calendar className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No schedules yet. Click 'Create Schedule' to start.", "لا توجد جداول بعد.")}</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {schedules.map(schedule => {
              const overdue = isOverdue(schedule.nextScheduledDate) && schedule.status !== "COMPLETED";
              return (
                <Card key={schedule.id} className={`p-4 border-l-4 ${
                  schedule.status === "COMPLETED" ? "border-l-green-500" : overdue ? "border-l-red-500" : "border-l-blue-500"
                } border border-slate-200 dark:border-slate-700`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {schedule.machine?.name || `Machine #${schedule.machineId}`}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          schedule.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : overdue ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}>
                          {overdue ? nav("Overdue", "متأخر") : schedule.status || nav("Pending", "قيد الانتظار")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {schedule.scheduleType} · {schedule.frequency} · {nav("Due", "تاريخ")}: {new Date(schedule.nextScheduledDate).toLocaleDateString()}
                      </p>
                      {schedule.description && <p className="text-xs text-slate-500 mt-1">{schedule.description}</p>}
                    </div>
                    <div className="ml-4">
                      {schedule.status === "COMPLETED" ? <CheckCircle size={20} className="text-green-600" /> : <Clock size={20} className="text-blue-500" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
