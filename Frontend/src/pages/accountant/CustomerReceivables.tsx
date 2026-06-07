import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, CheckCircle, Clock, AlertTriangle, Users, X, Save } from "lucide-react";
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

interface CustomerReceivable {
  id: number;
  customerId: number;
  customer?: { id: number; name: string; email: string };
  amount: number;
  dueDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string }> = {
  COLLECTED: { label: "Collected", labelAr: "محصّل",  color: "#059669", bg: "#d1fae5" },
  PENDING:   { label: "Pending",   labelAr: "معلق",   color: "#d97706", bg: "#fef3c7" },
  OVERDUE:   { label: "Overdue",   labelAr: "متأخر",  color: "#dc2626", bg: "#fee2e2" },
};

const emptyForm = { customerName: "", amount: "", dueDate: "", status: "PENDING", notes: "" };

export default function CustomerReceivables() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [receivables, setReceivables] = useState<CustomerReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { void fetchReceivables(); }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customer-receivables`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setReceivables(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r: CustomerReceivable) => {
    setEditingId(r.id);
    setForm({
      customerName: r.customer?.name ?? String(r.customerId),
      amount: String(r.amount),
      dueDate: r.dueDate.split("T")[0],
      status: r.status,
      notes: r.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.dueDate) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/customer-receivables/${editingId}` : `${API_BASE_URL}/customer-receivables`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          customerName: form.customerName.trim() || undefined,
          amount: parseFloat(form.amount),
          dueDate: form.dueDate,
          status: form.status,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) { setShowForm(false); void fetchReceivables(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this receivable?", "حذف هذا الحساب؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/customer-receivables/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchReceivables();
  };

  const filtered = receivables.filter((r) => !filterStatus || r.status === filterStatus);
  const pendingAmount = receivables.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);
  const collectedAmount = receivables.filter((r) => r.status === "COLLECTED").reduce((s, r) => s + r.amount, 0);
  const overdueCount = receivables.filter((r) => r.status === "OVERDUE").length;
  const totalAmount = receivables.reduce((s, r) => s + r.amount, 0);
  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ModulePageShell
      title={nav("Customer Receivables", "الحسابات المدينة")}
      subtitle={nav("Track payments due from customers", "تتبع المدفوعات المستحقة من العملاء")}
      icon={<Users size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Total Receivables", "إجمالي المستحقات"), value: fmtMoney(totalAmount),     gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Pending",           "معلق"),              value: fmtMoney(pendingAmount),   gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: nav("Collected",         "محصّل"),             value: fmtMoney(collectedAmount), gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: nav("Overdue",           "متأخر"),             value: overdueCount,              gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
        ].map((k) => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Receivable", "إضافة حساب مدين")}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[140px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{nav("All Statuses", "جميع الحالات")}</option>
          <option value="PENDING">{nav("Pending", "معلق")}</option>
          <option value="COLLECTED">{nav("Collected", "محصّل")}</option>
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
                {editingId ? nav("Edit Receivable", "تعديل الحساب") : nav("New Receivable", "حساب مدين جديد")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Enter receivable details", "أدخل بيانات الحساب")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Receivable Info", "بيانات الحساب")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{nav("Customer Name", "اسم العميل")}</label>
              <input className="input" placeholder={nav("e.g. Al-Najah Plastics Co.", "مثال: شركة النجاح للبلاستيك")}
                value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} />
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
              <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="PENDING">{nav("Pending", "معلق")}</option>
                <option value="COLLECTED">{nav("Collected", "محصّل")}</option>
                <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2}
                placeholder={nav("Invoice reference, payment terms…", "مرجع الفاتورة، شروط الدفع...")}
                value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.amount || !form.dueDate}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Receivable", "حفظ الحساب")}
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
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No receivables found", "لا توجد حسابات مدينة")}</p>
          <p className="text-sm mt-1">{nav("Add your first receivable to get started", "أضف أول حساب للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
            const StatusIcon = r.status === "COLLECTED" ? CheckCircle : r.status === "OVERDUE" ? AlertTriangle : Clock;
            return (
              <Card key={r.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>💰</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {r.customer?.name ?? `${nav("Customer", "عميل")} #${r.customerId}`}
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
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(r)}><Pencil size={14} /></button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <p className="text-2xl font-bold" style={{ color: meta.color }}>{fmtMoney(r.amount)}</p>
                  {r.customer?.email && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">📧 {r.customer.email}</p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)]">
                    📅 {nav("Due", "الاستحقاق")}: <span className={r.status === "OVERDUE" ? "text-red-600 font-semibold" : ""}>{new Date(r.dueDate).toLocaleDateString()}</span>
                  </p>
                  {r.notes && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-2,#f8fafc)] rounded px-2.5 py-1.5 italic">{r.notes}</p>
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
