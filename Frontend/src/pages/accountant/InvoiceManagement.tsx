import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, Trash2, FileText, Search, AlertCircle } from "lucide-react";
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

interface Invoice {
  id: number;
  customerId: number;
  customer?: { id: number; name: string; email: string; phone: string };
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  paymentStatus: string;
  createdAt: string;
  paymentRecordedAt?: string;
  createdBy?: { id: number; fullName: string };
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function InvoiceManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ customerId: "", invoiceNumber: "", totalAmount: 0, dueDate: "" });

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          customerId: parseInt(form.customerId),
          totalAmount: parseFloat(String(form.totalAmount)),
        }),
      });
      if (res.ok) {
        setForm({ customerId: "", invoiceNumber: "", totalAmount: 0, dueDate: "" });
        setShowForm(false);
        fetchInvoices();
      }
    } catch { }
  };

  const handleRecordPayment = async (id: number) => {
    await fetch(`${API_BASE_URL}/invoices/${id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    fetchInvoices();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this invoice?", "حذف هذه الفاتورة؟"))) return;
    await fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
      credentials: "include",
    });
    fetchInvoices();
  };

  const isOverdue = (dueDate: string, status: string) =>
    new Date(dueDate) < new Date() && status !== "PAID";

  const filtered = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (inv.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paidAmount = invoices.filter(i => i.paymentStatus === "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const pendingAmount = invoices.filter(i => i.paymentStatus !== "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const overdueCount = invoices.filter(i => isOverdue(i.dueDate, i.paymentStatus)).length;

  return (
    <ModulePageShell
      title={nav("Invoice Management", "إدارة الفواتير")}
      subtitle={nav("Create and manage customer invoices", "إنشاء وإدارة فواتير العملاء")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: nav("Total Invoiced", "إجمالي الفواتير"), value: `$${totalInvoiced.toFixed(2)}`, color: "blue", icon: <FileText size={18} /> },
            { label: nav("Paid", "مدفوع"), value: `$${paidAmount.toFixed(2)}`, color: "green", icon: <CheckCircle size={18} /> },
            { label: nav("Outstanding", "المستحق"), value: `$${pendingAmount.toFixed(2)}`, color: "orange", icon: <Clock size={18} /> },
            { label: nav("Overdue", "متأخر"), value: overdueCount, color: "red", icon: <AlertCircle size={18} /> },
          ].map(({ label, value, color, icon }) => (
            <Card key={label} className={`p-4 bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <span className={`text-${color}-600 dark:text-${color}-400`}>{icon}</span>
              </div>
              <p className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
            </Card>
          ))}
        </div>

        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <h2 className="text-lg font-semibold">{nav("Invoices", "الفواتير")}</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder={nav("Search...", "بحث...")} value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border rounded-lg bg-white border-slate-200 dark:border-slate-700 w-full sm:w-48" />
            </div>
            {!isAdmin && (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2 shrink-0">
                <Plus size={16} />
                {nav("Create Invoice", "إنشاء فاتورة")}
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{nav("New Invoice", "فاتورة جديدة")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Customer ID", "معرف العميل")}</label>
                  <input type="number" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Invoice Number", "رقم الفاتورة")}</label>
                  <input type="text" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Total Amount ($)", "المبلغ الإجمالي ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.totalAmount}
                    onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Due Date", "تاريخ الاستحقاق")}</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
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

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <FileText className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">
              {search ? nav("No matching invoices", "لا توجد فواتير مطابقة") : nav("No invoices yet. Click 'Create Invoice' to start.", "لا توجد فواتير بعد.")}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Invoice #", "رقم الفاتورة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Customer", "العميل")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Amount", "المبلغ")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Due Date", "الاستحقاق")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(invoice => {
                    const overdue = isOverdue(invoice.dueDate, invoice.paymentStatus);
                    return (
                      <tr key={invoice.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${overdue ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{invoice.invoiceNumber}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{invoice.customer?.name ?? `Customer #${invoice.customerId}`}</p>
                          {invoice.customer?.email && <p className="text-xs text-slate-400">{invoice.customer.email}</p>}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">${invoice.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                          {overdue && <span className="ml-1 font-semibold text-red-600">({nav("OVERDUE", "متأخر")})</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[invoice.paymentStatus] ?? STATUS_STYLES.PENDING}`}>
                            {invoice.paymentStatus === "PAID" ? <CheckCircle size={11} /> : overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                            {nav(invoice.paymentStatus, invoice.paymentStatus === "PAID" ? "مدفوع" : overdue ? "متأخر" : "معلق")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!isAdmin && (
                          <div className="flex items-center gap-1 justify-end">
                            {invoice.paymentStatus !== "PAID" && (
                              <button onClick={() => handleRecordPayment(invoice.id)}
                                className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded">
                                {nav("Mark Paid", "مدفوع")}
                              </button>
                            )}
                            <button onClick={() => handleDelete(invoice.id)}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
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
