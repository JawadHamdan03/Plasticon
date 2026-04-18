import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

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

export default function SupplierPayables() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    supplierId: "",
    amount: 0,
    dueDate: "",
    paymentStatus: "PENDING",
    notes: "",
  });

  useEffect(() => {
    fetchPayables();
  }, []);

  const fetchPayables = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/supplier-payables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPayables(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/supplier-payables/${editingId}`
        : "http://localhost:8080/supplier-payables";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          supplierId: parseInt(form.supplierId),
          amount: parseFloat(String(form.amount)),
        }),
      });

      if (response.ok) {
        setForm({ supplierId: "", amount: 0, dueDate: "", paymentStatus: "PENDING", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchPayables();
      }
    } catch (error) {
      console.error("Failed to save payable:", error);
    }
  };

  const handleEdit = (payable: SupplierPayable) => {
    setForm({
      supplierId: String(payable.supplierId),
      amount: payable.amount,
      dueDate: payable.dueDate.split("T")[0],
      paymentStatus: payable.paymentStatus,
      notes: payable.notes || "",
    });
    setEditingId(payable.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/supplier-payables/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPayables();
    } catch (error) {
      console.error("Failed to delete payable:", error);
    }
  };

  const totalPending = payables
    .filter(p => p.paymentStatus === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <ModulePageShell
      title="Supplier Payables"
      subtitle="Track payments owed to suppliers"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Payables", "الحسابات الدائنة")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Payable", "إضافة دفعة")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Pending Amount", "المبلغ المعلق")}</p>
            <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Payables", "إجمالي الحسابات الدائنة")}</p>
            <p className="text-2xl font-bold">{payables.length}</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Paid", "مدفوع")}</p>
            <p className="text-2xl font-bold">{payables.filter(p => p.paymentStatus === "PAID").length}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder={nav("Supplier ID", "معرف الموردين")}
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
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
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
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
        ) : payables.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No payables yet", "لا توجد حسابات دائنة حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Supplier", "الموردين")}</th>
                  <th className="text-left py-3 px-4">{nav("Amount", "المبلغ")}</th>
                  <th className="text-left py-3 px-4">{nav("Due Date", "تاريخ الاستحقاق")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((payable) => (
                  <tr key={payable.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">{payable.supplier?.name || `Supplier #${payable.supplierId}`}</td>
                    <td className="py-3 px-4">${payable.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-xs">{new Date(payable.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        payable.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : payable.paymentStatus === "OVERDUE"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {payable.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(payable)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(payable.id)}
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
