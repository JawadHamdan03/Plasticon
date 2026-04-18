import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, Clock, Landmark } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


interface BankReconciliation {
  id: number;
  accountName: string;
  bankBalance: number;
  bookBalance: number;
  reconciled: boolean;
  notes?: string;
  reconciledById: number;
  reconciledBy?: { id: number; fullName: string };
}

export default function BankReconciliation() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ accountName: "", bankBalance: 0, bookBalance: 0, reconciled: false, notes: "" });

  useEffect(() => { fetchReconciliations(); }, []);

  const fetchReconciliations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/bank-reconciliations`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setReconciliations(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/bank-reconciliations/${editingId}` : `${API_BASE_URL}/bank-reconciliations`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, bankBalance: parseFloat(String(form.bankBalance)), bookBalance: parseFloat(String(form.bookBalance)) }),
      });
      if (res.ok) {
        setForm({ accountName: "", bankBalance: 0, bookBalance: 0, reconciled: false, notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchReconciliations();
      }
    } catch { }
  };

  const handleEdit = (r: BankReconciliation) => {
    setForm({ accountName: r.accountName, bankBalance: r.bankBalance, bookBalance: r.bookBalance, reconciled: r.reconciled, notes: r.notes || "" });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this reconciliation?", "حذف هذا التسوية؟"))) return;
    await fetch(`${API_BASE_URL}/bank-reconciliations/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchReconciliations();
  };

  const reconciledCount = reconciliations.filter(r => r.reconciled).length;
  const pendingCount = reconciliations.length - reconciledCount;
  const totalBankBalance = reconciliations.reduce((s, r) => s + r.bankBalance, 0);

  return (
    <ModulePageShell
      title={nav("Bank Reconciliation", "تسوية البنك")}
      subtitle={nav("Reconcile bank accounts with records", "تسوية الحسابات المصرفية مع السجلات")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Reconciled", "متوفق")}</p>
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{reconciledCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Pending", "قيد المراجعة")}</p>
              <Clock size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{pendingCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Bank Balance", "إجمالي رصيد البنك")}</p>
              <Landmark size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${totalBankBalance.toFixed(2)}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Bank Accounts", "الحسابات المصرفية")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Account", "إضافة حساب")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Reconciliation", "تعديل التسوية") : nav("New Reconciliation", "تسوية جديدة")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Account Name", "اسم الحساب")}</label>
                  <input type="text" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Bank Balance ($)", "رصيد البنك ($)")}</label>
                  <input type="number" step={0.01} value={form.bankBalance}
                    onChange={e => setForm({ ...form, bankBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Book Balance ($)", "رصيد الدفاتر ($)")}</label>
                  <input type="number" step={0.01} value={form.bookBalance}
                    onChange={e => setForm({ ...form, bookBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div className="flex items-center gap-3 px-1 py-2">
                  <input type="checkbox" id="reconciled" checked={form.reconciled}
                    onChange={e => setForm({ ...form, reconciled: e.target.checked })}
                    className="w-4 h-4 rounded" />
                  <label htmlFor="reconciled" className="text-sm text-slate-700 dark:text-slate-300">
                    {nav("Mark as Reconciled", "وضع علامة متوفق")}
                  </label>
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
        ) : reconciliations.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Landmark className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No accounts yet. Click 'Add Account' to start.", "لا توجد حسابات بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Account", "الحساب")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Bank Balance", "رصيد البنك")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Book Balance", "رصيد الدفاتر")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Difference", "الفرق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reconciliations.map(rec => {
                    const diff = rec.bankBalance - rec.bookBalance;
                    return (
                      <tr key={rec.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!rec.reconciled && diff !== 0 ? "bg-red-50/40 dark:bg-red-900/10" : ""}`}>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{rec.accountName}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">${rec.bankBalance.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">${rec.bookBalance.toFixed(2)}</td>
                        <td className={`py-3 px-4 font-semibold ${diff === 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {diff === 0 ? "✓" : `$${diff.toFixed(2)}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            rec.reconciled
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          }`}>
                            {rec.reconciled ? <CheckCircle size={11} /> : <Clock size={11} />}
                            {rec.reconciled ? nav("Reconciled", "متوفق") : nav("Pending", "قيد المراجعة")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleEdit(rec)}
                              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(rec.id)}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
