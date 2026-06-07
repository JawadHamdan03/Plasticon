import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, FileText, BarChart2, Calendar, X, Save, ExternalLink } from "lucide-react";
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

interface FinancialReport {
  id: number;
  title: string;
  reportType: string;
  period: string;
  pdfPath?: string;
  generatedById: number;
  generatedBy?: { id: number; fullName: string };
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: string }> = {
  MONTHLY:   { label: "Monthly",   labelAr: "شهري",  color: "#1d4ed8", bg: "#dbeafe", icon: "📅" },
  QUARTERLY: { label: "Quarterly", labelAr: "فصلي",  color: "#7c3aed", bg: "#ede9fe", icon: "📊" },
  ANNUAL:    { label: "Annual",    labelAr: "سنوي",  color: "#047857", bg: "#d1fae5", icon: "📈" },
};

const emptyForm = { title: "", reportType: "MONTHLY", period: "", pdfPath: "" };

export default function FinancialReports() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("");

  useEffect(() => { void fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/financial-reports`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setReports(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r: FinancialReport) => {
    setEditingId(r.id);
    setForm({ title: r.title, reportType: r.reportType, period: r.period, pdfPath: r.pdfPath ?? "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.period.trim()) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/financial-reports/${editingId}` : `${API_BASE_URL}/financial-reports`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); void fetchReports(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this report?", "حذف هذا التقرير؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/financial-reports/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchReports();
  };

  const filtered = reports.filter((r) => !filterType || r.reportType === filterType);
  const monthly = reports.filter((r) => r.reportType === "MONTHLY").length;
  const quarterly = reports.filter((r) => r.reportType === "QUARTERLY").length;
  const annual = reports.filter((r) => r.reportType === "ANNUAL").length;

  return (
    <ModulePageShell
      title={nav("Financial Reports", "التقارير المالية")}
      subtitle={nav("Generate and access periodic financial reports", "إنشاء والوصول إلى التقارير المالية الدورية")}
      icon={<BarChart2 size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Monthly Reports",   "تقارير شهرية"),  value: monthly,   gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Quarterly Reports", "تقارير فصلية"),  value: quarterly, gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
          { label: nav("Annual Reports",    "تقارير سنوية"),  value: annual,    gradient: "linear-gradient(135deg,#10b981,#047857)" },
        ].map((k) => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Report", "إضافة تقرير")}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[150px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">{nav("All Types", "جميع الأنواع")}</option>
          <option value="MONTHLY">{nav("Monthly", "شهري")}</option>
          <option value="QUARTERLY">{nav("Quarterly", "فصلي")}</option>
          <option value="ANNUAL">{nav("Annual", "سنوي")}</option>
        </select>
        {filterType && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => setFilterType("")}>
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
                {editingId ? nav("Edit Report", "تعديل التقرير") : nav("New Report", "تقرير جديد")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Fill in the report details", "أدخل بيانات التقرير")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Report Info", "بيانات التقرير")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{nav("Report Title *", "عنوان التقرير *")}</label>
              <input className="input" placeholder={nav("e.g. Q1 2025 Financial Summary", "مثال: ملخص مالي الربع الأول 2025")}
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Report Type *", "نوع التقرير *")}</label>
              <select className="input" value={form.reportType} onChange={(e) => setForm((p) => ({ ...p, reportType: e.target.value }))}>
                <option value="MONTHLY">{nav("Monthly", "شهري")}</option>
                <option value="QUARTERLY">{nav("Quarterly", "فصلي")}</option>
                <option value="ANNUAL">{nav("Annual", "سنوي")}</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Period *", "الفترة *")}</label>
              <input className="input" placeholder={nav("e.g. Q1 2025, Jan 2025, FY 2025", "مثال: Q1 2025 أو يناير 2025")}
                value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("PDF Link (optional)", "رابط PDF (اختياري)")}</label>
              <input className="input" type="url" placeholder="https://..."
                value={form.pdfPath} onChange={(e) => setForm((p) => ({ ...p, pdfPath: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !form.period.trim()}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Report", "حفظ التقرير")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Report Cards */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No reports found", "لا توجد تقارير")}</p>
          <p className="text-sm mt-1">{nav("Add your first report to get started", "أضف أول تقرير للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const meta = TYPE_META[r.reportType] ?? TYPE_META.MONTHLY;
            return (
              <Card key={r.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{r.title}</p>
                      <span style={{ background: meta.color + "20", color: meta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}>
                        {locale === "ar" ? meta.labelAr : meta.label}
                      </span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(r)}>
                        <Pencil size={14} />
                      </button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={12} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="font-semibold">{r.period}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span>👤</span>
                    <span className="truncate">{r.generatedBy?.fullName ?? nav("Unknown", "غير معروف")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {r.pdfPath && (
                  <div className="border-t border-[var(--border-default)] px-4 py-2.5">
                    <a href={r.pdfPath} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold py-1.5 rounded-lg"
                      style={{ background: meta.bg, color: meta.color }}>
                      <ExternalLink size={11} />
                      {nav("View PDF", "عرض PDF")}
                    </a>
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
