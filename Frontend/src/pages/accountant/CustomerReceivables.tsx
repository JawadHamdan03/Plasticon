import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

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

export default function CustomerReceivables() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [receivables, setReceivables] = useState<CustomerReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    amount: 0,
    dueDate: "",
    status: "PENDING",
    notes: "",
  });

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/customer-receivables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReceivables(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch receivables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/customer-receivables/${editingId}`
        : "http://localhost:8080/customer-receivables";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          customerId: parseInt(form.customerId),
          amount: parseFloat(String(form.amount)),
        }),
      });

      if (response.ok) {
        setForm({ customerId: "", amount: 0, dueDate: "", status: "PENDING", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchReceivables();
      }
    } catch (error) {
      console.error("Failed to save receivable:", error);
    }
  };

  const handleEdit = (receivable: CustomerReceivable) => {
    setForm({
      customerId: String(receivable.customerId),
      amount: receivable.amount,
      dueDate: receivable.dueDate.split("T")[0],
      status: receivable.status,
      notes: receivable.notes || "",
    });
    setEditingId(receivable.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/customer-receivables/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchReceivables();
    } catch (error) {
      console.error("Failed to delete receivable:", error);
    }
  };

  const totalPending = receivables
    .filter(r => r.status === "PENDING")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <ModulePageShell
      title="Customer Receivables"
      subtitle="Track payments due from customers"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Receivables", "الحسابات المدينة")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Receivable", "إضافة حساب مدين")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
            <p className="text-sm text-slate-600">{nav("Pending Amount", "المبلغ المعلق")}</p>
            <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Receivables", "إجمالي الحسابات المدينة")}</p>
            <p className="text-2xl font-bold">{receivables.length}</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Collected", "مجموع")}</p>
            <p className="text-2xl font-bold">{receivables.filter(r => r.status === "COLLECTED").length}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder={nav("Customer ID", "معرف العميل")}
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Amount", "المبلغ")}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
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
        ) : receivables.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No receivables yet", "لا توجد حسابات مدينة حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Customer", "العميل")}</th>
                  <th className="text-left py-3 px-4">{nav("Amount", "المبلغ")}</th>
                  <th className="text-left py-3 px-4">{nav("Due Date", "تاريخ الاستحقاق")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((receivable) => (
                  <tr key={receivable.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">{receivable.customer?.name || `Customer #${receivable.customerId}`}</td>
                    <td className="py-3 px-4">${receivable.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-xs">{new Date(receivable.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        receivable.status === "COLLECTED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : receivable.status === "OVERDUE"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {receivable.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(receivable)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(receivable.id)}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
