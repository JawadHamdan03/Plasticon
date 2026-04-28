import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, Calendar, Pencil, Trash2, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Machine { id: number; name: string; type: string; }
interface Schedule {
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  scheduleType: string; frequency: string; nextScheduledDate: string;
  status: string; description?: string;
  assignedEngineer?: { id: number; fullName: string };
}

const emptyForm = {
  machineId: "", scheduleType: "PREVENTIVE", frequency: "WEEKLY",
  nextScheduledDate: "", assignedEngineerId: "", description: "", status: "PENDING",
};

export default function PreventiveMaintenanceSchedule() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchSchedules(); fetchMachines(); }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance-schedule`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setSchedules(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({ machineId: String(s.machineId), scheduleType: s.scheduleType, frequency: s.frequency, nextScheduledDate: s.nextScheduledDate ? s.nextScheduledDate.split("T")[0] : "", assignedEngineerId: "", description: s.description || "", status: s.status || "PENDING" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editingId && !form.machineId) return;
    if (!form.nextScheduledDate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        scheduleType: form.scheduleType, frequency: form.frequency,
        nextScheduledDate: form.nextScheduledDate, description: form.description || undefined, status: form.status,
      };
      if (!editingId) body.machineId = parseInt(form.machineId);
      const url = editingId ? `${API_BASE_URL}/maintenance-schedule/${editingId}` : `${API_BASE_URL}/maintenance-schedule`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include", body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); fetchSchedules(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this schedule?", "حذف هذا الجدول؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/maintenance-schedule/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    fetchSchedules();
  };

  const handleMarkComplete = async (id: number) => {
    await fetch(`${API_BASE_URL}/maintenance-schedule/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include", body: JSON.stringify({ status: "COMPLETED" }),
    });
    fetchSchedules();
  };

  const isOverdue = (date: string) => new Date(date) < new Date();
  const overdueCount = schedules.filter(s => isOverdue(s.nextScheduledDate) && s.status !== "COMPLETED").length;
  const completedCount = schedules.filter(s => s.status === "COMPLETED").length;

  return (
    <ModulePageShell
      title={nav("Maintenance Schedule", "جدول الصيانة")}
      subtitle={nav("Manage and track preventive maintenance schedules", "إدارة وتتبع جداول الصيانة الوقائية")}
      icon={<Calendar size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Schedules", "إجمالي الجداول"), value: schedules.length, icon: "📅", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Completed", "مكتمل"), value: completedCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Overdue", "متأخر"), value: overdueCount, icon: "⏰", color: "#dc2626", bg: "#fee2e2" },
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

      {/* Toolbar */}
      {!isAdmin && (
        <div className="mb-4">
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Create Schedule", "إنشاء جدول")}
          </Button>
        </div>
      )}

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--text-primary)] text-base">
              {editingId ? nav("Edit Schedule", "تعديل الجدول") : nav("New Maintenance Schedule", "جدول صيانة جديد")}
            </h3>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Schedule Details", "بيانات الجدول")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {!editingId && (
              <div className="sm:col-span-2">
                <label className="label">{nav("Machine *", "الآلة *")}</label>
                <select className="input" value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}>
                  <option value="">{nav("Select machine...", "اختر آلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">{nav("Schedule Type", "نوع الجدول")}</label>
              <select className="input" value={form.scheduleType} onChange={e => setForm({ ...form, scheduleType: e.target.value })}>
                <option value="PREVENTIVE">Preventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="PREDICTIVE">Predictive</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Frequency", "التكرار")}</label>
              <select className="input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Next Scheduled Date *", "تاريخ الجدول التالي *")}</label>
              <input type="date" className="input" value={form.nextScheduledDate} onChange={e => setForm({ ...form, nextScheduledDate: e.target.value })} />
            </div>
            {editingId && (
              <div>
                <label className="label">{nav("Status", "الحالة")}</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            )}
            <div className={editingId ? "sm:col-span-2" : ""}>
              <label className="label">{nav("Description", "الوصف")}</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save", "حفظ")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center p-10"><div className="spinner" /></div>
      ) : schedules.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Calendar size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No schedules yet", "لا توجد جداول بعد")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schedules.map(s => {
            const overdue = isOverdue(s.nextScheduledDate) && s.status !== "COMPLETED";
            const statusColor = s.status === "COMPLETED" ? "#059669" : overdue ? "#dc2626" : "#1d4ed8";
            const statusBg = s.status === "COMPLETED" ? "#d1fae5" : overdue ? "#fee2e2" : "#dbeafe";
            const statusLabel = s.status === "COMPLETED" ? nav("Completed", "مكتمل") : overdue ? nav("Overdue", "متأخر") : s.status || nav("Pending", "قيد الانتظار");
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)]">{s.machine?.name || `Machine #${s.machineId}`}</h3>
                      <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{s.scheduleType} · {s.frequency} · {nav("Due", "تاريخ")}: {new Date(s.nextScheduledDate).toLocaleDateString()}</p>
                    {s.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isAdmin && s.status !== "COMPLETED" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkComplete(s.id)} className="text-green-600 hover:text-green-800">
                        <CheckCircle size={13} />
                      </Button>
                    )}
                    {!isAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil size={13} /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></Button>
                      </>
                    )}
                    {isAdmin && (s.status === "COMPLETED" ? <CheckCircle size={20} style={{ color: "#059669" }} /> : <Clock size={20} style={{ color: "#1d4ed8" }} />)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
