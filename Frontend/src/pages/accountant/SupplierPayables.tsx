import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Edit, Trash2, CheckCircle, Clock, AlertTriangle, Truck } from "lucide-react";
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

interface SupplierPayable {
  id: number;
  supplierId: number;
  supplier?: { id: number; name: string; email: string };
  amount: number;
  dueDate: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function SupplierPayables() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ supplierId: "", amount: 0, dueDate: "", paymentStatus: "PENDING", notes: "" });

  useEffect(() => { fetchPayables(); }, []);

  const fetchPayables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/supplier-payables`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPayables(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/supplier-payables/${editingId}` : `${API_BASE_URL}/supplier-payables`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ ...form, supplierId: parseInt(form.supplierId), amount: parseFloat(String(form.amount)) }),
      });
      if (res.ok) {
        setForm({ supplierId: "", amount: 0, dueDate: "", paymentStatus: "PENDING", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchPayables();
      }
    } catch { }
  };

  const handleEdit = (p: SupplierPayable) => {
    setForm({ supplierId: String(p.supplierId), amount: p.amount, dueDate: p.dueDate.split("T")[0], paymentStatus: p.paymentStatus, notes: p.notes || "" });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this payable?", "حذف هذه الدفعة؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/supplier-payables/${id}`, {
      method: "DELETE", headers: { ...authHeaders() }, credentials: "include",
    });
    fetchPayables();
  };

  const pendingAmount = payables.filter(p => p.paymentStatus === "PENDING").reduce((s, p) => s + p.amount, 0);
  const paidCount = payables.filter(p => p.paymentStatus === "PAID").length;
  const overdueAmount = payables.filter(p => p.paymentStatus === "OVERDUE").reduce((s, p) => s + p.amount, 0);
  const totalAmount = payables.reduce((s, p) => s + p.amount, 0);

  return (
    <ModulePageShell
      title={nav("Supplier Payables", "حسابات الموردين الدائنة")}
      subtitle={nav("Track payments owed to suppliers", "تتبع المدفوعات المستحقة للموردين")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: nav("Total Payables", "إجمالي المستحقات"), value: `$${totalAmount.toFixed(2)}`, color: "blue", icon: <Truck size={18} /> },
            { label: nav("Pending", "معلق"), value: `$${pendingAmount.toFixed(2)}`, color: "orange", icon: <Clock size={18} /> },
            { label: nav("Paid Count", "عدد المدفوعات"), value: paidCount, color: "green", icon: <CheckCircle size={18} /> },
            { label: nav("Overdue", "متأخر"), value: `$${overdueAmount.toFixed(2)}`, color: "red", icon: <AlertTriangle size={18} /> },
          ].map(({ label, value, color, icon }) => (
            <Card key={label} className={`p-4 bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <span className={`text-${color}-600 dark:text-${color}-400`}>{icon}</span>
              </div>
              <p className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
            </Card>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Payables", "الحسابات الدائنة")}</h2>
          {!isAdmin && (
            <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
              <Plus size={16} />
              {nav("Add Payable", "إضافة دفعة")}
            </Button>
          )}
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Payable", "تعديل الدفعة") : nav("New Payable", "دفعة جديدة")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Supplier ID", "معرف المورد")}</label>
                  <input type="number" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Amount ($)", "المبلغ ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.amount}
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Due Date", "تاريخ الاستحقاق")}</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Status", "الحالة")}</label>
                  <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Notes", "ملاحظات")}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : payables.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Truck className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No payables yet. Click 'Add Payable' to create one.", "لا توجد حسابات دائنة بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Supplier", "المورد")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Amount", "المبلغ")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Due Date", "الاستحقاق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {payables.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{p.supplier?.name ?? `Supplier #${p.supplierId}`}</p>
                        {p.supplier?.email && <p className="text-xs text-slate-400">{p.supplier.email}</p>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">${p.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(p.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[p.paymentStatus] ?? "bg-slate-100 text-slate-700"}`}>
                          {p.paymentStatus === "PAID" ? <CheckCircle size={11} /> : p.paymentStatus === "OVERDUE" ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          {nav(p.paymentStatus, p.paymentStatus === "PAID" ? "مدفوع" : p.paymentStatus === "OVERDUE" ? "متأخر" : "معلق")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {!isAdmin && (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleEdit(p)}
                              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(p.id)}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
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
