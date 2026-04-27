import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import {
  Plus, CheckCircle, Clock, Trash2, FileText, Search,
  AlertCircle, User, Mail, DollarSign, Calendar, X, Save,
} from "lucide-react";
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

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  PAID:    { label: "Paid",    labelAr: "مدفوع",  color: "#059669", bg: "#d1fae5", icon: CheckCircle },
  PENDING: { label: "Pending", labelAr: "معلق",   color: "#d97706", bg: "#fef3c7", icon: Clock },
  OVERDUE: { label: "Overdue", labelAr: "متأخر",  color: "#dc2626", bg: "#fee2e2", icon: AlertCircle },
};

const emptyForm = { customerName: "", invoiceNumber: "", totalAmount: "", dueDate: "" };

export default function InvoiceManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setInvoices(Array.isArray(data) ? data : (data.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.invoiceNumber.trim() || !form.totalAmount || !form.dueDate) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          invoiceNumber: form.invoiceNumber.trim(),
          totalAmount: parseFloat(form.totalAmount),
          dueDate: form.dueDate,
        }),
      });
      if (res.ok) { setForm(emptyForm); setShowForm(false); void fetchInvoices(); }
    } catch { } finally { setSaving(false); }
  };

  const handleRecordPayment = async (id: number) => {
    await fetch(`${API_BASE_URL}/invoices/${id}/payment`, {
      method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include", body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    void fetchInvoices();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this invoice?", "حذف هذه الفاتورة؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/invoices/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchInvoices();
  };

  const isOverdue = (dueDate: string, status: string) => new Date(dueDate) < new Date() && status !== "PAID";

  const filtered = invoices
    .filter((inv) => !filterStatus || inv.paymentStatus === filterStatus)
    .filter((inv) =>
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const paidAmount = invoices.filter((i) => i.paymentStatus === "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const pendingAmount = invoices.filter((i) => i.paymentStatus !== "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const overdueCount = invoices.filter((i) => isOverdue(i.dueDate, i.paymentStatus)).length;

  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const StatusBadge = ({ status, dueDate }: { status: string; dueDate: string }) => {
    const overdue = isOverdue(dueDate, status);
    const key = overdue && status !== "PAID" ? "OVERDUE" : status;
    const meta = STATUS_META[key] ?? STATUS_META.PENDING;
    const Icon = meta.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
        style={{ background: meta.bg, color: meta.color }}>
        <Icon size={11} />
        {locale === "ar" ? meta.labelAr : meta.label}
      </span>
    );
  };

  return (
    <ModulePageShell
      title={nav("Invoice Management", "إدارة الفواتير")}
      subtitle={nav("Create and track customer invoices", "إنشاء وتتبع فواتير العملاء")}
      icon={<FileText size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: nav("Total Invoiced", "إجمالي الفواتير"), value: fmtMoney(totalInvoiced), icon: "🧾", color: "#3b82f6", bg: "#dbeafe" },
          { label: nav("Paid", "مدفوع"), value: fmtMoney(paidAmount), icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Outstanding", "المستحق"), value: fmtMoney(pendingAmount), icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Overdue", "متأخر"), value: overdueCount, icon: "🚨", color: "#dc2626", bg: "#fee2e2" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={15} className="me-1" />
            {nav("Create Invoice", "إنشاء فاتورة")}
          </Button>
        )}
        <div className="relative">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input className="input ps-8 h-8 text-sm w-48" placeholder={nav("Search...", "بحث...")}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm h-8 min-w-[130px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{nav("All Statuses", "جميع الحالات")}</option>
          <option value="PAID">{nav("Paid", "مدفوع")}</option>
          <option value="PENDING">{nav("Pending", "معلق")}</option>
          <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
        </select>
        {(filterStatus || search) && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => { setFilterStatus(""); setSearch(""); }}>
            {nav("Clear", "مسح")}
          </button>
        )}
      </div>

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">{nav("New Invoice", "فاتورة جديدة")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Fill in the invoice details", "أدخل بيانات الفاتورة")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Invoice Details", "بيانات الفاتورة")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{nav("Customer Name *", "اسم العميل *")}</label>
              <input className="input" placeholder={nav("e.g. Al-Najah Plastics Co.", "مثال: شركة النجاح للبلاستيك")}
                value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Invoice Number *", "رقم الفاتورة *")}</label>
              <input className="input" placeholder="INV-2025-001"
                value={form.invoiceNumber} onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Total Amount ($) *", "المبلغ الإجمالي ($) *")}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.totalAmount} onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Due Date *", "تاريخ الاستحقاق *")}</label>
              <input className="input" type="date"
                value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSubmit} disabled={saving || !form.customerName.trim() || !form.invoiceNumber.trim() || !form.totalAmount || !form.dueDate}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Invoice", "حفظ الفاتورة")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Invoice Cards */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No invoices found", "لا توجد فواتير")}</p>
          <p className="text-sm mt-1">{nav("Create your first invoice to get started", "أنشئ أول فاتورة للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => {
            const overdue = isOverdue(inv.dueDate, inv.paymentStatus);
            const statusKey = overdue && inv.paymentStatus !== "PAID" ? "OVERDUE" : inv.paymentStatus;
            const meta = STATUS_META[statusKey] ?? STATUS_META.PENDING;
            return (
              <Card key={inv.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.2rem" }}>🧾</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{inv.invoiceNumber}</p>
                      <StatusBadge status={inv.paymentStatus} dueDate={inv.dueDate} />
                    </div>
                  </div>
                  {!isAdmin && (
                    <button className="text-[var(--text-secondary)] hover:text-red-500 p-1 flex-shrink-0" onClick={() => handleDelete(inv.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  {(inv.customer?.name) && (
                    <div className="flex items-center gap-2 text-sm">
                      <User size={12} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="font-medium truncate">{inv.customer.name}</span>
                    </div>
                  )}
                  {inv.customer?.email && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{inv.customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={12} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="font-bold text-base" style={{ color: meta.color }}>{fmtMoney(inv.totalAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Calendar size={12} className="shrink-0" />
                    <span className={overdue && inv.paymentStatus !== "PAID" ? "text-red-600 font-semibold" : ""}>
                      {nav("Due", "الاستحقاق")}: {new Date(inv.dueDate).toLocaleDateString()}
                      {overdue && inv.paymentStatus !== "PAID" && ` (${nav("OVERDUE", "متأخر")})`}
                    </span>
                  </div>
                </div>
                {!isAdmin && inv.paymentStatus !== "PAID" && (
                  <div className="border-t border-[var(--border-default)] px-4 py-2.5">
                    <button
                      onClick={() => handleRecordPayment(inv.id)}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg"
                      style={{ background: "#d1fae5", color: "#059669" }}>
                      <CheckCircle size={11} className="inline me-1" />
                      {nav("Mark as Paid", "تسجيل الدفع")}
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
