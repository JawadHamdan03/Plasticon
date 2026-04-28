import { useEffect, useState } from "react";
import { Plus, Activity, Pencil, Trash2, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
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

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPERATIONAL: { label: "Operational", color: "#059669", bg: "#d1fae5" },
  MAINTENANCE:  { label: "Maintenance",  color: "#1d4ed8", bg: "#dbeafe" },
  DOWNTIME:     { label: "Downtime",     color: "#dc2626", bg: "#fee2e2" },
};

const emptyForm = {
  machineId: "", operationalStatus: "OPERATIONAL",
  downtimePercentage: 0, maintenanceHours: 0, efficiencyRating: 100, notes: "",
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchRecords(); fetchMachines(); }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/machine-health`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setRecords(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r: HealthRecord) => {
    setEditingId(r.id);
    setForm({ machineId: String(r.machineId), operationalStatus: r.operationalStatus, downtimePercentage: r.downtimePercentage, maintenanceHours: r.maintenanceHours, efficiencyRating: r.efficiencyRating, notes: r.notes || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editingId && !form.machineId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        operationalStatus: form.operationalStatus,
        downtimePercentage: parseFloat(String(form.downtimePercentage)),
        maintenanceHours: parseFloat(String(form.maintenanceHours)),
        efficiencyRating: parseFloat(String(form.efficiencyRating)),
        notes: form.notes || undefined,
      };
      if (!editingId) body.machineId = parseInt(form.machineId);
      const url = editingId ? `${API_BASE_URL}/machine-health/${editingId}` : `${API_BASE_URL}/machine-health`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); fetchRecords(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this record?", "حذف هذا السجل؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/machine-health/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    fetchRecords();
  };

  const avgEfficiency = records.length > 0 ? records.reduce((s, r) => s + r.efficiencyRating, 0) / records.length : 0;
  const operationalCount = records.filter(r => r.operationalStatus === "OPERATIONAL").length;

  return (
    <ModulePageShell
      title={nav("Machine Health Dashboard", "لوحة صحة الآلات")}
      subtitle={nav("View and track machine operational status", "عرض وتتبع الحالة التشغيلية للآلات")}
      icon={<Activity size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Records", "إجمالي السجلات"), value: records.length, icon: "📋", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Avg Efficiency", "متوسط الكفاءة"), value: `${avgEfficiency.toFixed(1)}%`, icon: "⚡", color: "#059669", bg: "#d1fae5" },
          { label: nav("Operational", "تشغيلي"), value: `${operationalCount}/${records.length}`, icon: "🟢", color: "#d97706", bg: "#fef3c7" },
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
            {nav("Add Record", "إضافة سجل")}
          </Button>
        </div>
      )}

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--text-primary)] text-base">
              {editingId ? nav("Edit Health Record", "تعديل سجل الصحة") : nav("New Health Record", "سجل صحة جديد")}
            </h3>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Record Details", "بيانات السجل")}</p>
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
              <label className="label">{nav("Operational Status", "الحالة التشغيلية")}</label>
              <select className="input" value={form.operationalStatus} onChange={e => setForm({ ...form, operationalStatus: e.target.value })}>
                <option value="OPERATIONAL">Operational</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DOWNTIME">Downtime</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Downtime %", "نسبة التوقف %")}</label>
              <input type="number" min={0} max={100} step={0.1} className="input" value={form.downtimePercentage}
                onChange={e => setForm({ ...form, downtimePercentage: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{nav("Maintenance Hours", "ساعات الصيانة")}</label>
              <input type="number" min={0} step={0.5} className="input" value={form.maintenanceHours}
                onChange={e => setForm({ ...form, maintenanceHours: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{nav("Efficiency Rating %", "تقييم الكفاءة %")}</label>
              <input type="number" min={0} max={100} step={0.1} className="input" value={form.efficiencyRating}
                onChange={e => setForm({ ...form, efficiencyRating: parseFloat(e.target.value) || 100 })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
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

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <Activity size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No health records yet", "لا توجد سجلات صحة بعد")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                  <th>{nav("Downtime %", "توقف")}</th>
                  <th>{nav("Efficiency", "الكفاءة")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                  {!isAdmin && <th>{nav("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const meta = STATUS_META[r.operationalStatus] ?? STATUS_META.OPERATIONAL;
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.machine?.name || `Machine #${r.machineId}`}</td>
                      <td>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${r.downtimePercentage}%` }} />
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">{r.downtimePercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${r.efficiencyRating >= 80 ? "bg-green-500" : r.efficiencyRating >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${r.efficiencyRating}%` }} />
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">{r.efficiencyRating}%</span>
                        </div>
                      </td>
                      <td className="text-sm">{new Date(r.recordedAt).toLocaleDateString()}</td>
                      {!isAdmin && (
                        <td>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil size={13} /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
