import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

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
  const [form, setForm] = useState({
    accountName: "",
    bankBalance: 0,
    bookBalance: 0,
    reconciled: false,
    notes: "",
  });

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/bank-reconciliations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReconciliations(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch reconciliations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/bank-reconciliations/${editingId}`
        : "http://localhost:8080/bank-reconciliations";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          bankBalance: parseFloat(String(form.bankBalance)),
          bookBalance: parseFloat(String(form.bookBalance)),
        }),
      });

      if (response.ok) {
        setForm({ accountName: "", bankBalance: 0, bookBalance: 0, reconciled: false, notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchReconciliations();
      }
    } catch (error) {
      console.error("Failed to save reconciliation:", error);
    }
  };

  const handleEdit = (reconciliation: BankReconciliation) => {
    setForm({
      accountName: reconciliation.accountName,
      bankBalance: reconciliation.bankBalance,
      bookBalance: reconciliation.bookBalance,
      reconciled: reconciliation.reconciled,
      notes: reconciliation.notes || "",
    });
    setEditingId(reconciliation.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/bank-reconciliations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchReconciliations();
    } catch (error) {
      console.error("Failed to delete reconciliation:", error);
    }
  };

  const reconciled = reconciliations.filter(r => r.reconciled).length;

  return (
    <ModulePageShell
      title="Bank Reconciliation"
      subtitle="Reconcile bank accounts with records"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Accounts", "الحسابات")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Account", "إضافة حساب")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Reconciled", "متوفق")}</p>
            <p className="text-2xl font-bold">{reconciled}</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Pending", "قيد الانتظار")}</p>
            <p className="text-2xl font-bold">{reconciliations.length - reconciled}</p>
          </Card>
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Accounts", "إجمالي الحسابات")}</p>
            <p className="text-2xl font-bold">{reconciliations.length}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={nav("Account Name", "اسم الحساب")}
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Bank Balance", "رصيد البنك")}
                  value={form.bankBalance}
                  onChange={(e) => setForm({ ...form, bankBalance: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Book Balance", "رصيد الدفاتر")}
                  value={form.bookBalance}
                  onChange={(e) => setForm({ ...form, bookBalance: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <label className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.reconciled}
                    onChange={(e) => setForm({ ...form, reconciled: e.target.checked })}
                    className="rounded"
                  />
                  <span>{nav("Reconciled", "متوفق")}</span>
                </label>
              </div>
              <textarea
                placeholder={nav("Notes", "ملاحظات")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 border rounded-md bg-white dark:bg-slate-700"
                >
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : reconciliations.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No accounts yet", "لا توجد حسابات حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Account", "الحساب")}</th>
                  <th className="text-left py-3 px-4">{nav("Bank Balance", "رصيد البنك")}</th>
                  <th className="text-left py-3 px-4">{nav("Book Balance", "رصيد الدفاتر")}</th>
                  <th className="text-left py-3 px-4">{nav("Difference", "الفرق")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.map((rec) => {
                  const difference = rec.bankBalance - rec.bookBalance;
                  return (
                    <tr key={rec.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4">{rec.accountName}</td>
                      <td className="py-3 px-4">${rec.bankBalance.toFixed(2)}</td>
                      <td className="py-3 px-4">${rec.bookBalance.toFixed(2)}</td>
                      <td className={`py-3 px-4 ${difference !== 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        ${difference.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          rec.reconciled
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {rec.reconciled ? "Reconciled" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => handleEdit(rec)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
