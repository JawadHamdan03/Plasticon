import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

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

export default function ExpenseTracking() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: "SUPPLIES",
    amount: 0,
    description: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(String(form.amount)),
        }),
      });

      if (response.ok) {
        setForm({
          category: "SUPPLIES",
          amount: 0,
          description: "",
        });
        setShowForm(false);
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to create expense:", error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8080/expenses/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus: "APPROVED" }),
      });

      if (response.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to approve expense:", error);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const approvedExpenses = expenses
    .filter((exp) => exp.paymentStatus === "APPROVED")
    .reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = expenses
    .filter((exp) => exp.paymentStatus === "PENDING")
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <ModulePageShell
      title="Expense Tracking"
      subtitle="Record and monitor business expenses"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Total Expenses", "إجمالي المصروفات")}
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${totalExpenses.toFixed(2)}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Approved", "معتمد")}
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              ${approvedExpenses.toFixed(2)}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Pending", "قيد الانتظار")}
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              ${pendingExpenses.toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Expenses List", "قائمة المصروفات")}</h2>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={18} />
            {nav("Add Expense", "إضافة مصروف")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="SUPPLIES">Supplies</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="TRAVEL">Travel</option>
                  <option value="MEALS">Meals</option>
                  <option value="OTHER">Other</option>
                </select>

                <input
                  type="number"
                  placeholder={nav("Amount", "المبلغ")}
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0"
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
              </div>

              <textarea
                placeholder={nav("Description", "الوصف")}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                rows={3}
              />

              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-md bg-white dark:bg-slate-700"
                >
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Expenses List */}
        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : expenses.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No expenses yet", "لا توجد مصروفات حتى الآن")}
          </Card>
        ) : (
          <div className="grid gap-4">
            {expenses.map((expense) => (
              <Card
                key={expense.id}
                className={`p-4 border-l-4 ${
                  expense.paymentStatus === "APPROVED"
                    ? "border-l-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{expense.category}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          expense.paymentStatus === "APPROVED"
                            ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                            : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                        }`}
                      >
                        {expense.paymentStatus === "APPROVED" ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                        {expense.paymentStatus}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {expense.description}
                    </p>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>
                        {nav("Submitted by", "قدمت بواسطة")}:{" "}
                        {expense.submittedBy?.fullName}
                      </p>
                      <p>
                        {nav("Submitted", "تاريخ الإرسال")}:{" "}
                        {new Date(expense.submittedAt).toLocaleDateString()}
                      </p>
                      {expense.approvedBy && (
                        <p>
                          {nav("Approved by", "وافق عليه")}: {expense.approvedBy.fullName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      ${expense.amount.toFixed(2)}
                    </p>
                    {expense.paymentStatus === "PENDING" && (
                      <Button
                        onClick={() => handleApprove(expense.id)}
                        className="mt-2 text-xs bg-green-600 hover:bg-green-700"
                      >
                        {nav("Approve", "موافقة")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
