import { useEffect, useState } from "react";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Machine { id: number; name: string; type: string; }
interface SparePart {
  id: number;
  name: string;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  supplier?: string;
  lastRestockedDate?: string;
  expiryDate?: string;
  notes?: string;
}

export default function SparePartsManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [parts, setParts] = useState<SparePart[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    machineId: "", name: "", quantity: 0, minQuantity: 0, unitPrice: 0, supplier: "", notes: "",
  });

  useEffect(() => {
    fetchParts();
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

  const fetchParts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/spare-parts`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setParts(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId) { setError(nav("Please select a machine", "الرجاء اختيار آلة")); return; }
    if (!form.name.trim()) { setError(nav("Please enter part name", "الرجاء إدخال اسم القطعة")); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/spare-parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          machineId: parseInt(form.machineId),
          name: form.name,
          quantity: parseInt(String(form.quantity)),
          minQuantity: parseInt(String(form.minQuantity)),
          unitPrice: parseFloat(String(form.unitPrice)),
          supplier: form.supplier || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        setForm({ machineId: "", name: "", quantity: 0, minQuantity: 0, unitPrice: 0, supplier: "", notes: "" });
        setShowForm(false);
        fetchParts();
      } else {
        const err = await res.json();
        setError(err.message || nav("Failed to save", "فشل الحفظ"));
      }
    } catch { setError(nav("Network error", "خطأ في الاتصال")); }
    finally { setSaving(false); }
  };

  const isLowStock = (part: SparePart) => part.quantity <= part.minQuantity;
  const totalValue = parts.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const lowStockCount = parts.filter(isLowStock).length;

  return (
    <ModulePageShell title="Spare Parts Management" subtitle="Track and manage inventory of spare parts">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Parts", "إجمالي القطع")}</p>
              <Package size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{parts.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Low Stock", "مخزون منخفض")}</p>
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{lowStockCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Inventory Value", "قيمة المخزون")}</p>
              <Package size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">${totalValue.toFixed(2)}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Spare Parts List", "قائمة قطع الغيار")}</h2>
          {!isAdmin && (
            <Button onClick={() => { setShowForm(!showForm); setError(""); }} className="gap-2">
              <Plus size={16} />
              {nav("Add Part", "إضافة قطعة")}
            </Button>
          )}
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("New Spare Part", "قطعة غيار جديدة")}</h3>
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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Part Name", "اسم القطعة")} *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Quantity", "الكمية")}</label>
                  <input type="number" min={0} value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Min Quantity (alert threshold)", "أدنى كمية (حد التنبيه)")}</label>
                  <input type="number" min={0} value={form.minQuantity}
                    onChange={e => setForm({ ...form, minQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Unit Price ($)", "سعر الوحدة ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.unitPrice}
                    onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Supplier", "المورد")}</label>
                  <input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
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
        ) : parts.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Package className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No spare parts yet. Click 'Add Part' to start.", "لا توجد قطع غيار بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Part Name", "اسم القطعة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Machine", "الآلة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Qty", "كمية")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Min", "أدنى")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Unit Price", "السعر")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Value", "القيمة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Supplier", "المورد")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {parts.map(part => (
                    <tr key={part.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isLowStock(part) ? "bg-orange-50/50 dark:bg-orange-900/10" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isLowStock(part) && <AlertTriangle size={14} className="text-orange-600 shrink-0" />}
                          <span className="font-medium text-slate-800 dark:text-slate-200">{part.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{part.machine?.name || `Machine #${part.machineId}`}</td>
                      <td className={`py-3 px-4 font-semibold ${isLowStock(part) ? "text-orange-700 dark:text-orange-300" : "text-slate-800 dark:text-slate-200"}`}>{part.quantity}</td>
                      <td className="py-3 px-4 text-slate-500">{part.minQuantity}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">${part.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${(part.quantity * part.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{part.supplier || "—"}</td>
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
