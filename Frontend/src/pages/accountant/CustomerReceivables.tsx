import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, Clock, AlertTriangle, Users } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


interface CustomerReceivable {
  id: number;
  customerId: number;
  customer?: { id: number; name: string; email: string };
  amount: number;
  dueDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  COLLECTED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function CustomerReceivables() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [receivables, setReceivables] = useState<CustomerReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ customerId: "", amount: 0, dueDate: "", status: "PENDING", notes: "" });

  useEffect(() => { fetchReceivables(); }, []);

  const fetchReceivables = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer-receivables`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setReceivables(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/customer-receivables/${editingId}` : `${API_BASE_URL}/customer-receivables`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, customerId: parseInt(form.customerId), amount: parseFloat(String(form.amount)) }),
      });
      if (res.ok) {
        setForm({ customerId: "", amount: 0, dueDate: "", status: "PENDING", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchReceivables();
      }
    } catch { }
  };

  const handleEdit = (r: CustomerReceivable) => {
    setForm({ customerId: String(r.customerId), amount: r.amount, dueDate: r.dueDate.split("T")[0], status: r.status, notes: r.notes || "" });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this receivable?", "حذف هذا الحساب المدين؟"))) return;
    await fetch(`${API_BASE_URL}/customer-receivables/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchReceivables();
  };

  const pendingAmount = receivables.filter(r => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);
  const collectedAmount = receivables.filter(r => r.status === "COLLECTED").reduce((s, r) => s + r.amount, 0);
  const overdueCount = receivables.filter(r => r.status === "OVERDUE").length;
  const totalAmount = receivables.reduce((s, r) => s + r.amount, 0);

  return (
    <ModulePageShell
      title={nav("Customer Receivables", "الحسابات المدينة")}
      subtitle={nav("Track payments due from customers", "تتبع المدفوعات المستحقة من العملاء")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: nav("Total", "الإجمالي"), value: `$${totalAmount.toFixed(2)}`, color: "blue", icon: <Users size={18} /> },
            { label: nav("Pending", "معلق"), value: `$${pendingAmount.toFixed(2)}`, color: "orange", icon: <Clock size={18} /> },
            { label: nav("Collected", "مجموع"), value: `$${collectedAmount.toFixed(2)}`, color: "green", icon: <CheckCircle size={18} /> },
            { label: nav("Overdue", "متأخر"), value: overdueCount, color: "red", icon: <AlertTriangle size={18} /> },
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
          <h2 className="text-lg font-semibold">{nav("Receivables", "الحسابات المدينة")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Receivable", "إضافة حساب مدين")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Receivable", "تعديل الحساب المدين") : nav("New Receivable", "حساب مدين جديد")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Customer ID", "معرف العميل")}</label>
                  <input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
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
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="PENDING">Pending</option>
                    <option value="COLLECTED">Collected</option>
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
        ) : receivables.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Users className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No receivables yet. Click 'Add Receivable' to create one.", "لا توجد حسابات مدينة بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Customer", "العميل")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Amount", "المبلغ")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Due Date", "الاستحقاق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {receivables.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{r.customer?.name ?? `Customer #${r.customerId}`}</p>
                        {r.customer?.email && <p className="text-xs text-slate-400">{r.customer.email}</p>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">${r.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {r.status === "COLLECTED" ? <CheckCircle size={11} /> : r.status === "OVERDUE" ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          {nav(r.status, r.status === "COLLECTED" ? "مجموع" : r.status === "OVERDUE" ? "متأخر" : "معلق")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(r)}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
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
