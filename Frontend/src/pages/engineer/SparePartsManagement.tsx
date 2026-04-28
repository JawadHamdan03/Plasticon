import { useEffect, useState } from "react";
import { Plus, AlertTriangle, Package, Pencil, Trash2, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { useAuth } from "../../context/AuthContext";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Machine { id: number; name: string; type: string; }
interface SparePart {
  id: number; name: string; machineId: number;
  machine?: { id: number; name: string; type: string };
  quantity: number; minQuantity: number; unitPrice: number;
  supplier?: string; notes?: string;
}

const emptyForm = { machineId: "", name: "", quantity: 0, minQuantity: 0, unitPrice: 0, supplier: "", notes: "" };

export default function SparePartsManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [parts, setParts] = useState<SparePart[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchParts(); fetchMachines(); }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { }
  };

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/spare-parts`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setParts(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p: SparePart) => {
    setEditingId(p.id);
    setForm({ machineId: String(p.machineId), name: p.name, quantity: p.quantity, minQuantity: p.minQuantity, unitPrice: p.unitPrice, supplier: p.supplier || "", notes: p.notes || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editingId && !form.machineId) return;
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name, quantity: parseInt(String(form.quantity)),
        minQuantity: parseInt(String(form.minQuantity)), unitPrice: parseFloat(String(form.unitPrice)),
        supplier: form.supplier || undefined, notes: form.notes || undefined,
      };
      if (!editingId) body.machineId = parseInt(form.machineId);
      const url = editingId ? `${API_BASE_URL}/spare-parts/${editingId}` : `${API_BASE_URL}/spare-parts`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include", body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); fetchParts(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this spare part?", "حذف قطعة الغيار هذه؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/spare-parts/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    fetchParts();
  };

  const isLowStock = (p: SparePart) => p.quantity <= p.minQuantity;
  const totalValue = parts.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const lowStockCount = parts.filter(isLowStock).length;

  return (
    <ModulePageShell
      title={nav("Spare Parts Management", "إدارة قطع الغيار")}
      subtitle={nav("Track and manage inventory of spare parts", "تتبع وإدارة مخزون قطع الغيار")}
      icon={<Package size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Parts", "إجمالي القطع"), value: parts.length, icon: "🔩", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Low Stock", "مخزون منخفض"), value: lowStockCount, icon: "⚠️", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Inventory Value", "قيمة المخزون"), value: `$${totalValue.toFixed(2)}`, icon: "💰", color: "#059669", bg: "#d1fae5" },
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
            {nav("Add Part", "إضافة قطعة")}
          </Button>
        </div>
      )}

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--text-primary)] text-base">
              {editingId ? nav("Edit Spare Part", "تعديل قطعة الغيار") : nav("New Spare Part", "قطعة غيار جديدة")}
            </h3>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Part Details", "بيانات القطعة")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {!editingId && (
              <div>
                <label className="label">{nav("Machine *", "الآلة *")}</label>
                <select className="input" value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}>
                  <option value="">{nav("Select machine...", "اختر آلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">{nav("Part Name *", "اسم القطعة *")}</label>
              <input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{nav("Quantity", "الكمية")}</label>
              <input type="number" min={0} className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{nav("Min Quantity (alert threshold)", "أدنى كمية")}</label>
              <input type="number" min={0} className="input" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{nav("Unit Price ($)", "سعر الوحدة ($)")}</label>
              <input type="number" min={0} step={0.01} className="input" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{nav("Supplier", "المورد")}</label>
              <input type="text" className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
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
          ) : parts.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No spare parts yet", "لا توجد قطع غيار بعد")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Part Name", "اسم القطعة")}</th>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Qty", "كمية")}</th>
                  <th>{nav("Min", "أدنى")}</th>
                  <th>{nav("Unit Price", "السعر")}</th>
                  <th>{nav("Value", "القيمة")}</th>
                  <th>{nav("Supplier", "المورد")}</th>
                  {!isAdmin && <th>{nav("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id} className={isLowStock(p) ? "bg-orange-50/40" : ""}>
                    <td>
                      <div className="flex items-center gap-2">
                        {isLowStock(p) && <AlertTriangle size={13} style={{ color: "#d97706" }} className="shrink-0" />}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">{p.machine?.name || `Machine #${p.machineId}`}</td>
                    <td className="font-semibold" style={{ color: isLowStock(p) ? "#d97706" : undefined }}>{p.quantity}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{p.minQuantity}</td>
                    <td>${p.unitPrice.toFixed(2)}</td>
                    <td className="font-semibold">${(p.quantity * p.unitPrice).toFixed(2)}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{p.supplier || "—"}</td>
                    {!isAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil size={13} /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></Button>
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
