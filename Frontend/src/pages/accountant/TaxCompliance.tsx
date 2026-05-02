import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, FileText, CheckCircle, Clock, AlertTriangle, X, Save } from "lucide-react";
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

interface TaxFiling {
  id: number;
  filingType: string;
  amount: number;
  dueDate: string;
  status: string;
  filedBy?: { id: number; fullName: string };
}

const TAX_TYPES = [
  { value: "VAT",             label: "VAT Return",      labelAr: "ضريبة القيمة المضافة", icon: "📊" },
  { value: "INCOME_TAX",     label: "Income Tax",      labelAr: "ضريبة الدخل",           icon: "💼" },
  { value: "PAYROLL_TAX",    label: "Payroll Tax",     labelAr: "ضريبة الرواتب",          icon: "👷" },
  { value: "CORPORATE_TAX",  label: "Corporate Tax",   labelAr: "ضريبة الشركات",          icon: "🏢" },
  { value: "WITHHOLDING_TAX",label: "Withholding Tax", labelAr: "ضريبة الاستقطاع",        icon: "✂️" },
];

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string }> = {
  COMPLETED: { label: "Completed", labelAr: "مكتمل",  color: "#059669", bg: "#d1fae5" },
  PENDING:   { label: "Pending",   labelAr: "معلق",   color: "#d97706", bg: "#fef3c7" },
  OVERDUE:   { label: "Overdue",   labelAr: "متأخر",  color: "#dc2626", bg: "#fee2e2" },
};

const emptyForm = { filingType: "VAT", dueDate: "", amount: "", status: "PENDING" };

export default function TaxCompliance() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const canEdit = user?.role === "ACCOUNTANT" || isAdmin;
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { void fetchFilings(); }, []);

  const fetchFilings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tax-filings`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setFilings(Array.isArray(data) ? data : []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (f: TaxFiling) => {
    setEditingId(f.id);
    setForm({ filingType: f.filingType, dueDate: f.dueDate.split("T")[0], amount: String(f.amount), status: f.status });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.dueDate) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/tax-filings/${editingId}` : `${API_BASE_URL}/tax-filings`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) { setShowForm(false); void fetchFilings(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this filing?", "حذف هذا الإقرار؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/tax-filings/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchFilings();
  };

  const filtered = filings.filter((f) => !filterStatus || f.status === filterStatus);
  const totalAmount = filings.reduce((s, f) => s + f.amount, 0);
  const completed = filings.filter((f) => f.status === "COMPLETED").length;
  const pending = filings.filter((f) => f.status === "PENDING").length;
  const overdue = filings.filter((f) => f.status === "OVERDUE").length;
  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTaxMeta = (type: string) => TAX_TYPES.find((t) => t.value === type) ?? TAX_TYPES[0];

  return (
    <ModulePageShell
      title={nav("Tax Compliance", "الامتثال الضريبي")}
      subtitle={nav("Manage tax filings and compliance requirements", "إدارة الإقرارات الضريبية ومتطلبات الامتثال")}
      icon={<FileText size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: nav("Total Obligations", "إجمالي الالتزامات"), value: fmtMoney(totalAmount), icon: "💰", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Completed", "مكتمل"), value: completed, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Pending", "معلق"), value: pending, icon: "⏳", color: "#3b82f6", bg: "#dbeafe" },
          { label: nav("Overdue", "متأخر"), value: overdue, icon: "🚨", color: "#dc2626", bg: "#fee2e2" },
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
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Filing", "إضافة إقرار")}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[140px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{nav("All Statuses", "جميع الحالات")}</option>
          <option value="PENDING">{nav("Pending", "معلق")}</option>
          <option value="COMPLETED">{nav("Completed", "مكتمل")}</option>
          <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
        </select>
        {filterStatus && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => setFilterStatus("")}>
            {nav("Clear", "مسح")}
          </button>
        )}
      </div>

      {/* Form */}
      {canEdit && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">
                {editingId ? nav("Edit Filing", "تعديل الإقرار") : nav("New Tax Filing", "إقرار ضريبي جديد")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Enter tax filing details", "أدخل بيانات الإقرار الضريبي")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Filing Details", "بيانات الإقرار")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{nav("Filing Type *", "نوع الإقرار *")}</label>
              <select className="input" value={form.filingType} onChange={(e) => setForm((p) => ({ ...p, filingType: e.target.value }))}>
                {TAX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {locale === "ar" ? t.labelAr : t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{nav("Status", "الحالة")}</label>
              <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="PENDING">{nav("Pending", "معلق")}</option>
                <option value="COMPLETED">{nav("Completed", "مكتمل")}</option>
                <option value="OVERDUE">{nav("Overdue", "متأخر")}</option>
              </select>
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
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.amount || !form.dueDate}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Filing", "حفظ الإقرار")}
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
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No filings found", "لا توجد إقرارات")}</p>
          <p className="text-sm mt-1">{nav("Add your first tax filing", "أضف أول إقرار ضريبي")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => {
            const statusMeta = STATUS_META[f.status] ?? STATUS_META.PENDING;
            const taxMeta = getTaxMeta(f.filingType);
            const StatusIcon = f.status === "COMPLETED" ? CheckCircle : f.status === "OVERDUE" ? AlertTriangle : Clock;
            return (
              <Card key={f.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: statusMeta.bg, borderBottom: `2px solid ${statusMeta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>{taxMeta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {locale === "ar" ? taxMeta.labelAr : taxMeta.label}
                      </p>
                      <span style={{ background: statusMeta.color + "20", color: statusMeta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}
                        className="inline-flex items-center gap-1">
                        <StatusIcon size={9} />
                        {locale === "ar" ? statusMeta.labelAr : statusMeta.label}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(f)}><Pencil size={14} /></button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(f.id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <p className="text-2xl font-bold" style={{ color: statusMeta.color }}>{fmtMoney(f.amount)}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    📅 {nav("Due", "الاستحقاق")}: <span className={f.status === "OVERDUE" ? "text-red-600 font-semibold" : ""}>{new Date(f.dueDate).toLocaleDateString()}</span>
                  </p>
                  {f.filedBy && (
                    <p className="text-xs text-[var(--text-secondary)]">👤 {f.filedBy.fullName}</p>
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
