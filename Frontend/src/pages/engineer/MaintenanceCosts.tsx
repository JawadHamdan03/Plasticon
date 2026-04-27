import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { DollarSign, Plus, Pencil, Trash2, X, Save } from "lucide-react";
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

interface MaintenanceOption { id: number; description: string; machine: { id: number; name: string } }
interface CostRecord {
  id: number;
  laborHours: number;
  laborCostPerHour: number;
  laborTotal: number;
  sparesTotal: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
  maintenance: { id: number; description: string; machine: { id: number; name: string; type: string } };
  createdBy: { id: number; fullName: string };
}

const emptyForm = {
  maintenanceId: "",
  laborHours: "",
  laborCostPerHour: "",
  sparesTotal: "",
  notes: "",
};

export default function MaintenanceCosts() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isReadOnly = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [records, setRecords] = useState<CostRecord[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE_URL}/maintenance-costs`, { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(`${API_BASE_URL}/maintenance`, { headers: { ...authHeaders() }, credentials: "include" }),
      ]);
      if (r1.ok) setRecords(await r1.json());
      if (r2.ok) {
        const d = await r2.json();
        setMaintenances(d.records ?? d ?? []);
      }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (r: CostRecord) => {
    setEditingId(r.id);
    setForm({
      maintenanceId: String(r.maintenance.id),
      laborHours: String(r.laborHours),
      laborCostPerHour: String(r.laborCostPerHour),
      sparesTotal: String(r.sparesTotal),
      notes: r.notes ?? "",
    });
    setShowForm(true);
  };

  const laborTotal = parseFloat(form.laborHours || "0") * parseFloat(form.laborCostPerHour || "0");
  const totalCostCalc = laborTotal + parseFloat(form.sparesTotal || "0");

  const handleSave = async () => {
    if (!editingId && !form.maintenanceId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        laborHours: parseFloat(form.laborHours || "0"),
        laborCostPerHour: parseFloat(form.laborCostPerHour || "0"),
        sparesTotal: parseFloat(form.sparesTotal || "0"),
        notes: form.notes.trim() || undefined,
      };
      if (!editingId) body.maintenanceId = parseInt(form.maintenanceId);

      const url = editingId
        ? `${API_BASE_URL}/maintenance-costs/${editingId}`
        : `${API_BASE_URL}/maintenance-costs`;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); fetchAll(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this cost record?", "حذف هذا السجل؟"), { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/maintenance-costs/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      fetchAll();
    } catch { }
  };

  const totalCost = records.reduce((a, b) => a + b.totalCost, 0);
  const avgCost = records.length ? totalCost / records.length : 0;

  // Group by machine for summary
  const byMachine: Record<string, { name: string; count: number; total: number }> = {};
  records.forEach((r) => {
    const key = String(r.maintenance.machine.id);
    if (!byMachine[key]) byMachine[key] = { name: r.maintenance.machine.name, count: 0, total: 0 };
    byMachine[key].count += 1;
    byMachine[key].total += r.totalCost;
  });

  return (
    <ModulePageShell
      title={nav("Maintenance Costs", "تكاليف الصيانة")}
      subtitle={nav("Track labor and spare parts costs per maintenance job", "تتبع تكاليف العمالة وقطع الغيار لكل مهمة صيانة")}
      icon={<DollarSign size={22} />}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Records", "إجمالي السجلات"), value: records.length, icon: "🔧", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Total Cost", "التكلفة الإجمالية"), value: `$${totalCost.toLocaleString()}`, icon: "💰", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Avg Cost / Repair", "متوسط تكلفة الإصلاح"), value: `$${avgCost.toFixed(0)}`, icon: "📊", color: "#059669", bg: "#d1fae5" },
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

      {/* Machine summary */}
      {Object.keys(byMachine).length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">{nav("Cost by Machine", "التكلفة حسب الآلة")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(byMachine).map((m) => (
              <Card key={m.name} className="p-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{m.name}</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{m.total.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-secondary)]">{m.count} {nav("jobs", "مهام")}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!isReadOnly && (
        <div className="mb-4">
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Cost Record", "إضافة سجل تكلفة")}
          </Button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {editingId ? nav("Edit Cost Record", "تعديل سجل التكلفة") : nav("New Cost Record", "سجل تكلفة جديد")}
            </h3>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingId && (
              <div className="sm:col-span-2">
                <label className="label">{nav("Maintenance Job *", "مهمة الصيانة *")}</label>
                <select className="input" value={form.maintenanceId} onChange={(e) => setForm((p) => ({ ...p, maintenanceId: e.target.value }))}>
                  <option value="">{nav("Select maintenance...", "اختر الصيانة...")}</option>
                  {maintenances.map((m) => (
                    <option key={m.id} value={m.id}>{m.machine.name} — {m.description}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">{nav("Labor Hours", "ساعات العمل")}</label>
              <input type="number" min="0" step="0.5" className="input" value={form.laborHours} onChange={(e) => setForm((p) => ({ ...p, laborHours: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Labor Cost/hr", "تكلفة العمل/ساعة")}</label>
              <input type="number" min="0" step="0.01" className="input" value={form.laborCostPerHour} onChange={(e) => setForm((p) => ({ ...p, laborCostPerHour: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Spares Total", "إجمالي قطع الغيار")}</label>
              <input type="number" min="0" step="0.01" className="input" value={form.sparesTotal} onChange={(e) => setForm((p) => ({ ...p, sparesTotal: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Calculated Total", "الإجمالي المحسوب")}</label>
              <input type="number" className="input bg-[var(--surface-2)] cursor-not-allowed" value={totalCostCalc.toFixed(2)} readOnly />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
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
            <div className="p-10 text-center text-[var(--text-secondary)]">{nav("No cost records found", "لا توجد سجلات تكلفة")}</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Job", "المهمة")}</th>
                  <th>{nav("Labor hrs", "ساعات عمل")}</th>
                  <th>{nav("Labor Cost", "تكلفة عمالة")}</th>
                  <th>{nav("Spares", "قطع غيار")}</th>
                  <th>{nav("Total", "الإجمالي")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                  <th>{nav("By", "بواسطة")}</th>
                  {!isReadOnly && <th>{nav("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.maintenance.machine.name}</td>
                    <td className="text-sm text-[var(--text-secondary)] max-w-[160px] truncate">{r.maintenance.description}</td>
                    <td>{r.laborHours}h</td>
                    <td>{r.laborTotal.toLocaleString()}</td>
                    <td>{r.sparesTotal.toLocaleString()}</td>
                    <td className="font-semibold">{r.totalCost.toLocaleString()}</td>
                    <td className="text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="text-sm">{r.createdBy.fullName}</td>
                    {!isReadOnly && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                            <Pencil size={13} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={13} />
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
