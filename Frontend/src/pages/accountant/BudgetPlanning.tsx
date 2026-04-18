import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Target, TrendingDown, DollarSign } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


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
  const [form, setForm] = useState({ month: "", category: "", allocated: 0, spent: 0 });

  useEffect(() => { fetchBudgets(); }, []);

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/budgets`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/budgets/${editingId}` : `${API_BASE_URL}/budgets`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, allocated: parseFloat(String(form.allocated)), spent: parseFloat(String(form.spent)) }),
      });
      if (res.ok) {
        setForm({ month: "", category: "", allocated: 0, spent: 0 });
        setEditingId(null);
        setShowForm(false);
        fetchBudgets();
      }
    } catch { }
  };

  const handleEdit = (b: BudgetPlan) => {
    setForm({ month: b.month.split("T")[0], category: b.category, allocated: b.allocated, spent: b.spent });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this budget?", "حذف هذه الميزانية؟"))) return;
    await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchBudgets();
  };

  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalAllocated - totalSpent;
  const overallPct = totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 100) : 0;

  return (
    <ModulePageShell
      title={nav("Budget Planning", "تخطيط الميزانية")}
      subtitle={nav("Plan and track budget allocations", "تخطيط وتتبع مخصصات الميزانية")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Allocated", "إجمالي المخصص")}</p>
              <Target size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${totalAllocated.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Spent", "إجمالي الإنفاق")}</p>
              <TrendingDown size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">${totalSpent.toFixed(2)}</p>
            <div className="mt-2">
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${overallPct > 90 ? "bg-red-500" : overallPct > 70 ? "bg-orange-500" : "bg-green-500"}`}
                  style={{ width: `${overallPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{overallPct.toFixed(1)}% {nav("of budget used", "من الميزانية")}</p>
            </div>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Remaining", "المتبقي")}</p>
              <DollarSign size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className={`text-2xl font-bold ${remaining >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              ${remaining.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Budget Allocations", "مخصصات الميزانية")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Budget", "إضافة ميزانية")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Budget", "تعديل الميزانية") : nav("New Budget", "ميزانية جديدة")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Month", "الشهر")}</label>
                  <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Category", "الفئة")}</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Allocated Amount ($)", "المبلغ المخصص ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.allocated}
                    onChange={e => setForm({ ...form, allocated: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Spent Amount ($)", "المبلغ المنفق ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.spent}
                    onChange={e => setForm({ ...form, spent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
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
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : budgets.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Target className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No budgets yet. Click 'Add Budget' to create one.", "لا توجد ميزانيات بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Month", "الشهر")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Category", "الفئة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Allocated", "المخصص")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Spent", "المنفق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Progress", "التقدم")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Remaining", "المتبقي")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {budgets.map(budget => {
                    const rem = budget.allocated - budget.spent;
                    const pct = budget.allocated > 0 ? Math.min((budget.spent / budget.allocated) * 100, 100) : 0;
                    const isOver = rem < 0;
                    return (
                      <tr key={budget.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isOver ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {new Date(budget.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{budget.category}</td>
                        <td className="py-3 px-4 text-blue-700 dark:text-blue-300 font-semibold">${budget.allocated.toFixed(2)}</td>
                        <td className="py-3 px-4 text-orange-700 dark:text-orange-300">${budget.spent.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-orange-500" : "bg-green-500"}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 font-semibold ${isOver ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-300"}`}>
                          ${rem.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleEdit(budget)}
                              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(budget.id)}
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
