import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, CheckCircle, Clock, Trash2, Receipt, Search, X, Save } from "lucide-react";
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

const EXPENSE_CATEGORIES = [
  { value: "RAW_MATERIALS",  label: "Raw Materials",  labelAr: "مواد خام",       icon: "🏭", color: "#1d4ed8", bg: "#dbeafe" },
  { value: "UTILITIES",      label: "Utilities",      labelAr: "المرافق",        icon: "💡", color: "#0f766e", bg: "#ccfbf1" },
  { value: "MAINTENANCE",    label: "Maintenance",    labelAr: "صيانة",          icon: "🔧", color: "#b45309", bg: "#fef3c7" },
  { value: "SALARIES",       label: "Salaries",       labelAr: "رواتب",          icon: "👷", color: "#7c3aed", bg: "#ede9fe" },
  { value: "TRANSPORT",      label: "Transport",      labelAr: "نقل وشحن",       icon: "🚛", color: "#0e7490", bg: "#cffafe" },
  { value: "PACKAGING",      label: "Packaging",      labelAr: "تغليف",          icon: "📦", color: "#047857", bg: "#d1fae5" },
  { value: "SUPPLIES",       label: "Supplies",       labelAr: "مستلزمات",       icon: "📋", color: "#c2410c", bg: "#ffedd5" },
  { value: "ADMIN",          label: "Admin",          labelAr: "إدارة",          icon: "🏢", color: "#475569", bg: "#f1f5f9" },
  { value: "OTHER",          label: "Other",          labelAr: "أخرى",           icon: "💼", color: "#6b7280", bg: "#f3f4f6" },
];

const getCatMeta = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

const emptyForm = { category: "RAW_MATERIALS", amount: "", description: "" };

export default function ExpenseTracking() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setExpenses(Array.isArray(data) ? data : (data.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ category: form.category, amount: parseFloat(form.amount), description: form.description.trim() || undefined }),
      });
      if (res.ok) { setForm(emptyForm); setShowForm(false); void fetchExpenses(); }
    } catch { } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    await fetch(`${API_BASE_URL}/expenses/${id}/approve`, {
      method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include", body: JSON.stringify({ paymentStatus: "APPROVED" }),
    });
    void fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this expense?", "حذف هذا المصروف؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/expenses/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchExpenses();
  };

  const filtered = expenses
    .filter((e) => !filterCat || e.category === filterCat)
    .filter((e) => !search || e.category.toLowerCase().includes(search.toLowerCase()) || (e.description ?? "").toLowerCase().includes(search.toLowerCase()));

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const approvedAmount = expenses.filter((e) => e.paymentStatus === "APPROVED").reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter((e) => e.paymentStatus === "PENDING").reduce((s, e) => s + e.amount, 0);

  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ModulePageShell
      title={nav("Expense Tracking", "تتبع المصروفات")}
      subtitle={nav("Record and monitor factory business expenses", "تسجيل ومراقبة مصروفات المصنع")}
      icon={<Receipt size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Total Expenses",   "إجمالي المصروفات"), value: fmtMoney(totalExpenses),  gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Approved",         "معتمد"),             value: fmtMoney(approvedAmount), gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: nav("Pending Approval", "قيد الاعتماد"),      value: fmtMoney(pendingAmount),  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
        ].map((k) => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={15} className="me-1" />
            {nav("Add Expense", "إضافة مصروف")}
          </Button>
        )}
        <div className="relative">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input className="input ps-8 h-8 text-sm w-44" placeholder={nav("Search...", "بحث...")}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm h-8 min-w-[160px]" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">{nav("All Categories", "جميع الفئات")}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{locale === "ar" ? c.labelAr : c.label}</option>
          ))}
        </select>
        {(filterCat || search) && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => { setFilterCat(""); setSearch(""); }}>
            {nav("Clear", "مسح")}
          </button>
        )}
      </div>

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">{nav("New Expense", "مصروف جديد")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Record a business expense for approval", "سجّل مصروفاً للاعتماد")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Expense Details", "بيانات المصروف")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{nav("Category *", "الفئة *")}</label>
              <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {locale === "ar" ? c.labelAr : c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{nav("Amount ($) *", "المبلغ ($) *")}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Description / Notes", "الوصف / الملاحظات")}</label>
              <textarea className="input resize-none" rows={2}
                placeholder={nav("e.g. HDPE pellets purchase from supplier, maintenance labor cost…", "مثال: شراء حبيبات HDPE، تكلفة عمالة صيانة...")}
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSubmit} disabled={saving || !form.amount}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Submit Expense", "تقديم المصروف")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Expense Cards */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Receipt size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No expenses found", "لا توجد مصروفات")}</p>
          <p className="text-sm mt-1">{nav("Add your first expense to get started", "أضف أول مصروف للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((expense) => {
            const meta = getCatMeta(expense.category);
            const approved = expense.paymentStatus === "APPROVED";
            return (
              <Card key={expense.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {locale === "ar" ? meta.labelAr : meta.label}
                      </p>
                      <span style={{ background: meta.color + "20", color: meta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>
                        {approved ? nav("Approved", "معتمد") : nav("Pending", "قيد الاعتماد")}
                      </span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <button className="text-[var(--text-secondary)] hover:text-red-500 p-1 flex-shrink-0" onClick={() => handleDelete(expense.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: meta.color }}>${expense.amount.toFixed(2)}</span>
                    {approved
                      ? <CheckCircle size={16} style={{ color: "#059669" }} />
                      : <Clock size={16} style={{ color: "#d97706" }} />
                    }
                  </div>
                  {expense.description && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">{expense.description}</p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)]">
                    {expense.submittedBy?.fullName} · {new Date(expense.submittedAt).toLocaleDateString()}
                  </p>
                </div>

                {!isAdmin && !approved && (
                  <div className="border-t border-[var(--border-default)] px-4 py-2.5">
                    <button onClick={() => handleApprove(expense.id)}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg"
                      style={{ background: "#d1fae5", color: "#059669" }}>
                      <CheckCircle size={11} className="inline me-1" />
                      {nav("Approve Expense", "اعتماد المصروف")}
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
