import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface BudgetPlan {
  id: number;
  month: string;
  category: string;
  allocated: number;
  spent: number;
  createdById: number;
  createdBy?: { id: number; fullName: string };
}

export default function BudgetPlanning() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [budgets, setBudgets] = useState<BudgetPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    month: "",
    category: "",
    allocated: 0,
    spent: 0,
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/budgets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBudgets(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/budgets/${editingId}`
        : "http://localhost:8080/budgets";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          allocated: parseFloat(String(form.allocated)),
          spent: parseFloat(String(form.spent)),
        }),
      });

      if (response.ok) {
        setForm({ month: "", category: "", allocated: 0, spent: 0 });
        setEditingId(null);
        setShowForm(false);
        fetchBudgets();
      }
    } catch (error) {
      console.error("Failed to save budget:", error);
    }
  };

  const handleEdit = (budget: BudgetPlan) => {
    setForm({
      month: budget.month.split("T")[0],
      category: budget.category,
      allocated: budget.allocated,
      spent: budget.spent,
    });
    setEditingId(budget.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/budgets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBudgets();
    } catch (error) {
      console.error("Failed to delete budget:", error);
    }
  };

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <ModulePageShell
      title="Budget Planning"
      subtitle="Plan and track budget allocations"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Budgets", "الميزانيات")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Budget", "إضافة ميزانية")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Allocated", "إجمالي المخصص")}</p>
            <p className="text-2xl font-bold">${totalAllocated.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Total Spent", "إجمالي الإنفاق")}</p>
            <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Remaining", "المتبقي")}</p>
            <p className="text-2xl font-bold">${(totalAllocated - totalSpent).toFixed(2)}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="text"
                  placeholder={nav("Category", "الفئة")}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Allocated Amount", "المبلغ المخصص")}
                  value={form.allocated}
                  onChange={(e) => setForm({ ...form, allocated: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Spent Amount", "المبلغ المنفق")}
                  value={form.spent}
                  onChange={(e) => setForm({ ...form, spent: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
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
        ) : budgets.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No budgets yet", "لا توجد ميزانيات حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Month", "الشهر")}</th>
                  <th className="text-left py-3 px-4">{nav("Category", "الفئة")}</th>
                  <th className="text-left py-3 px-4">{nav("Allocated", "المخصص")}</th>
                  <th className="text-left py-3 px-4">{nav("Spent", "المنفق")}</th>
                  <th className="text-left py-3 px-4">{nav("Remaining", "المتبقي")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => {
                  const remaining = budget.allocated - budget.spent;
                  return (
                    <tr key={budget.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4">{new Date(budget.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                      <td className="py-3 px-4">{budget.category}</td>
                      <td className="py-3 px-4 text-green-700 dark:text-green-300">${budget.allocated.toFixed(2)}</td>
                      <td className="py-3 px-4 text-orange-700 dark:text-orange-300">${budget.spent.toFixed(2)}</td>
                      <td className="py-3 px-4 text-blue-700 dark:text-blue-300">${remaining.toFixed(2)}</td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
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
