import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


interface TaxFiling {
  id: number;
  filingType: string;
  amount: number;
  dueDate: string;
  status: string;
  filedBy?: { id: number; fullName: string };
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function TaxCompliance() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ filingType: "VAT", dueDate: "", amount: 0, status: "PENDING" });

  useEffect(() => { fetchFilings(); }, []);

  const fetchFilings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tax-filings`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setFilings(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `${API_BASE_URL}/tax-filings/${editingId}` : `${API_BASE_URL}/tax-filings`;
    const method = editingId ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, amount: parseFloat(String(form.amount)) }),
      });
      if (res.ok) {
        setForm({ filingType: "VAT", dueDate: "", amount: 0, status: "PENDING" });
        setEditingId(null);
        setShowForm(false);
        fetchFilings();
      }
    } catch { }
  };

  const handleEdit = (f: TaxFiling) => {
    setForm({ filingType: f.filingType, dueDate: f.dueDate.split("T")[0], amount: f.amount, status: f.status });
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this filing?", "حذف هذا الإقرار؟"))) return;
    await fetch(`${API_BASE_URL}/tax-filings/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchFilings();
  };

  const total = filings.length;
  const completed = filings.filter(f => f.status === "COMPLETED").length;
  const pending = filings.filter(f => f.status === "PENDING").length;
  const overdue = filings.filter(f => f.status === "OVERDUE").length;
  const totalAmount = filings.reduce((s, f) => s + f.amount, 0);

  return (
    <ModulePageShell title={nav("Tax Compliance", "الامتثال الضريبي")} subtitle={nav("Manage tax filings and compliance requirements", "إدارة الإقرارات الضريبية ومتطلبات الامتثال")}>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: nav("Total Filings", "إجمالي الإقرارات"), value: total, color: "blue", icon: <FileText size={20} /> },
            { label: nav("Completed", "مكتملة"), value: completed, color: "green", icon: <CheckCircle size={20} /> },
            { label: nav("Pending", "معلقة"), value: pending, color: "orange", icon: <Clock size={20} /> },
            { label: nav("Overdue", "متأخرة"), value: overdue, color: "red", icon: <AlertTriangle size={20} /> },
          ].map(({ label, value, color, icon }) => (
            <Card key={label} className={`p-4 bg-${color}-50 dark:bg-${color}-900/20 border-0`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <span className={`text-${color}-600 dark:text-${color}-400`}>{icon}</span>
              </div>
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
            </Card>
          ))}
        </div>

        {/* Total amount */}
        <Card className="p-4 flex items-center justify-between bg-linear-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
          <span className="font-medium text-slate-700 dark:text-slate-300">{nav("Total Tax Obligations", "إجمالي الالتزامات الضريبية")}</span>
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">${totalAmount.toFixed(2)}</span>
        </Card>

        {/* Header + Add */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Tax Filings", "الإقرارات الضريبية")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Filing", "إضافة إقرار")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Filing", "تعديل الإقرار") : nav("New Tax Filing", "إقرار ضريبي جديد")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Filing Type", "نوع الإقرار")}</label>
                  <select value={form.filingType} onChange={e => setForm({ ...form, filingType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="VAT">VAT Return</option>
                    <option value="INCOME_TAX">Income Tax</option>
                    <option value="PAYROLL_TAX">Payroll Tax</option>
                    <option value="CORPORATE_TAX">Corporate Tax</option>
                    <option value="WITHHOLDING_TAX">Withholding Tax</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Status", "الحالة")}</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
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
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{nav("Save", "حفظ")}</Button>
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
        ) : filings.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <FileText className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No tax filings yet. Click 'Add Filing' to create one.", "لا توجد إقرارات ضريبية بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Type", "النوع")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Amount", "المبلغ")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Due Date", "الاستحقاق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Filed By", "تقدم به")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filings.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {f.filingType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">${f.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{new Date(f.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[f.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {f.status === "COMPLETED" ? <CheckCircle size={11} /> : f.status === "OVERDUE" ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          {nav(f.status, f.status === "COMPLETED" ? "مكتمل" : f.status === "PENDING" ? "معلق" : "متأخر")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{f.filedBy?.fullName ?? "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(f)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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
