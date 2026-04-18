import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, Trash2, Receipt, Search } from "lucide-react";
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

interface Expense {
  id: number;
  category: string;
  amount: number;
  description?: string;
  paymentStatus: string;
  submittedAt: string;
  approvedAt?: string;
  submittedBy?: { id: number; fullName: string };
  approvedBy?: { id: number; fullName: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  SUPPLIES: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  UTILITIES: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  MAINTENANCE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  TRAVEL: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  MEALS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OTHER: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
};

export default function ExpenseTracking() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ category: "SUPPLIES", amount: 0, description: "" });

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ ...form, amount: parseFloat(String(form.amount)) }),
      });
      if (res.ok) {
        setForm({ category: "SUPPLIES", amount: 0, description: "" });
        setShowForm(false);
        fetchExpenses();
      }
    } catch { }
  };

  const handleApprove = async (id: number) => {
    await fetch(`${API_BASE_URL}/expenses/${id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({ paymentStatus: "APPROVED" }),
    });
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this expense?", "حذف هذا المصروف؟"))) return;
    await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
      credentials: "include",
    });
    fetchExpenses();
  };

  const filtered = expenses.filter(e =>
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    (e.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const approvedAmount = expenses.filter(e => e.paymentStatus === "APPROVED").reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter(e => e.paymentStatus === "PENDING").reduce((s, e) => s + e.amount, 0);

  return (
    <ModulePageShell
      title={nav("Expense Tracking", "تتبع المصروفات")}
      subtitle={nav("Record and monitor business expenses", "تسجيل ومراقبة مصروفات الأعمال")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Expenses", "إجمالي المصروفات")}</p>
              <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${totalExpenses.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Approved", "معتمد")}</p>
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">${approvedAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Pending", "قيد الانتظار")}</p>
              <Clock size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">${pendingAmount.toFixed(2)}</p>
          </Card>
        </div>

        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <h2 className="text-lg font-semibold">{nav("Expenses List", "قائمة المصروفات")}</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={nav("Search...", "بحث...")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-full sm:w-48"
              />
            </div>
            {!isAdmin && (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2 shrink-0">
                <Plus size={16} />
                {nav("Add Expense", "إضافة مصروف")}
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("New Expense", "مصروف جديد")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Category", "الفئة")}</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="SUPPLIES">Supplies</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="MEALS">Meals</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Amount ($)", "المبلغ ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.amount}
                    onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Description", "الوصف")}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <Receipt className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">
              {search ? nav("No matching expenses", "لا توجد مصروفات مطابقة") : nav("No expenses yet. Click 'Add Expense' to create one.", "لا توجد مصروفات بعد.")}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(expense => (
                <div key={expense.id} className={`p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-l-4 ${
                  expense.paymentStatus === "APPROVED" ? "border-l-green-500" : "border-l-orange-400"
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.OTHER}`}>
                        {expense.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        expense.paymentStatus === "APPROVED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                      }`}>
                        {expense.paymentStatus === "APPROVED" ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {nav(expense.paymentStatus, expense.paymentStatus === "APPROVED" ? "معتمد" : "معلق")}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{expense.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {expense.submittedBy?.fullName} · {new Date(expense.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">${expense.amount.toFixed(2)}</p>
                    {!isAdmin && (
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        {expense.paymentStatus === "PENDING" && (
                          <button onClick={() => handleApprove(expense.id)}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded">
                            {nav("Approve", "موافقة")}
                          </button>
                        )}
                        <button onClick={() => handleDelete(expense.id)}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
