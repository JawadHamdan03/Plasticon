import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, CheckCircle, Clock, AlertTriangle, Truck, X, Save } from "lucide-react";
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

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string }> = {
  PAID:    { label: "Paid",    labelAr: "مدفوع",  color: "#059669", bg: "#d1fae5" },
  PENDING: { label: "Pending", labelAr: "معلق",   color: "#d97706", bg: "#fef3c7" },
  OVERDUE: { label: "Overdue", labelAr: "متأخر",  color: "#dc2626", bg: "#fee2e2" },
};

const emptyForm = { supplierName: "", amount: "", dueDate: "", paymentStatus: "PENDING", notes: "" };

export default function SupplierPayables() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { void fetchPayables(); }, []);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/supplier-payables`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setPayables(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p: SupplierPayable) => {
    setEditingId(p.id);
    setForm({
      supplierName: p.supplier?.name ?? String(p.supplierId),
      amount: String(p.amount),
      dueDate: p.dueDate.split("T")[0],
      paymentStatus: p.paymentStatus,
      notes: p.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.dueDate) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/supplier-payables/${editingId}` : `${API_BASE_URL}/supplier-payables`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          supplierName: form.supplierName.trim() || undefined,
          amount: parseFloat(form.amount),
          dueDate: form.dueDate,
          paymentStatus: form.paymentStatus,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) { setShowForm(false); void fetchPayables(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this payable?", "حذف هذه الدفعة؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/supplier-payables/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchPayables();
  };

  const filtered = payables.filter((p) => !filterStatus || p.paymentStatus === filterStatus);
  const pendingAmount = payables.filter((p) => p.paymentStatus === "PENDING").reduce((s, p) => s + p.amount, 0);
  const paidCount = payables.filter((p) => p.paymentStatus === "PAID").length;
  const overdueAmount = payables.filter((p) => p.paymentStatus === "OVERDUE").reduce((s, p) => s + p.amount, 0);
  const totalAmount = payables.reduce((s, p) => s + p.amount, 0);
  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ModulePageShell
      title={nav("Supplier Payables", "مستحقات الموردين")}
      subtitle={nav("Track and manage payments owed to suppliers", "تتبع وإدارة المدفوعات المستحقة للموردين")}
      icon={<Truck size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: nav("Total Payables", "إجمالي المستحقات"), value: fmtMoney(totalAmount), icon: "🏦", color: "#3b82f6", bg: "#dbeafe" },
          { label: nav("Pending", "معلق"), value: fmtMoney(pendingAmount), icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Paid Count", "المدفوع"), value: paidCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Overdue", "متأخر"), value: fmtMoney(overdueAmount), icon: "🚨", color: "#dc2626", bg: "#fee2e2" },
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
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Payable", "إضافة دفعة")}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[140px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{nav("All Statuses", "جميع الحالات")}</option>
          <option value="PENDING">{nav("Pending", "معلق")}</option>
          <option value="PAID">{nav("Paid", "مدفوع")}</option>
          <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
        </select>
        {filterStatus && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => setFilterStatus("")}>
            {nav("Clear", "مسح")}
          </button>
        )}
      </div>

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">
                {editingId ? nav("Edit Payable", "تعديل الدفعة") : nav("New Payable", "دفعة جديدة")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Enter payment details", "أدخل بيانات الدفعة")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Payment Info", "بيانات الدفعة")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{nav("Supplier Name", "اسم المورد")}</label>
              <input className="input" placeholder={nav("e.g. Plastisource Ltd.", "مثال: بلاستي سورس")}
                value={form.supplierName} onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Amount ($) *", "المبلغ ($) *")}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Due Date *", "تاريخ الاستحقاق *")}</label>
              <input className="input" type="date"
                value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Status", "الحالة")}</label>
              <select className="input" value={form.paymentStatus} onChange={(e) => setForm((p) => ({ ...p, paymentStatus: e.target.value }))}>
                <option value="PENDING">{nav("Pending", "معلق")}</option>
                <option value="PAID">{nav("Paid", "مدفوع")}</option>
                <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2}
                placeholder={nav("Payment terms, reference number, etc.", "شروط الدفع، رقم المرجع...")}
                value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.amount || !form.dueDate}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Payable", "حفظ الدفعة")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Truck size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No payables found", "لا توجد مستحقات")}</p>
          <p className="text-sm mt-1">{nav("Add your first payable to get started", "أضف أول دفعة للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const meta = STATUS_META[p.paymentStatus] ?? STATUS_META.PENDING;
            const StatusIcon = p.paymentStatus === "PAID" ? CheckCircle : p.paymentStatus === "OVERDUE" ? AlertTriangle : Clock;
            return (
              <Card key={p.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>🏦</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {p.supplier?.name ?? nav("Supplier", "مورد")} #{p.supplierId}
                      </p>
                      <span style={{ background: meta.color + "20", color: meta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}
                        className="inline-flex items-center gap-1">
                        <StatusIcon size={9} />
                        {locale === "ar" ? meta.labelAr : meta.label}
                      </span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <p className="text-2xl font-bold" style={{ color: meta.color }}>{fmtMoney(p.amount)}</p>
                  {p.supplier?.email && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">📧 {p.supplier.email}</p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)]">
                    📅 {nav("Due", "الاستحقاق")}: <span className={p.paymentStatus === "OVERDUE" ? "text-red-600 font-semibold" : ""}>{new Date(p.dueDate).toLocaleDateString()}</span>
                  </p>
                  {p.notes && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-2,#f8fafc)] rounded px-2.5 py-1.5 italic">{p.notes}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
