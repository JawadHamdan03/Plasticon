import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, PieChart, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface CostAnalysis {
  id: number;
  category: string;
  cost: number;
  percentage: number;
  period: string;
  notes?: string;
}

const COST_CATEGORIES = [
  { value: "Raw Materials",         label: "Raw Materials",         labelAr: "المواد الخام",          color: "#1d4ed8", bg: "#dbeafe",  icon: "🧱" },
  { value: "Production Labor",      label: "Production Labor",      labelAr: "عمالة الإنتاج",         color: "#7c3aed", bg: "#ede9fe",  icon: "👷" },
  { value: "Machine Maintenance",   label: "Machine Maintenance",   labelAr: "صيانة الآلات",          color: "#d97706", bg: "#fef3c7",  icon: "🔧" },
  { value: "Electricity",           label: "Electricity",           labelAr: "الكهرباء",              color: "#059669", bg: "#d1fae5",  icon: "⚡" },
  { value: "Packaging & Logistics", label: "Packaging & Logistics", labelAr: "التغليف والخدمات اللوجستية", color: "#0891b2", bg: "#cffafe", icon: "📦" },
  { value: "Quality Control",       label: "Quality Control",       labelAr: "مراقبة الجودة",         color: "#dc2626", bg: "#fee2e2",  icon: "🔍" },
  { value: "Admin & Office",        label: "Admin & Office",        labelAr: "الإدارة والمكتب",       color: "#6b7280", bg: "#f3f4f6",  icon: "🏢" },
  { value: "Other",                 label: "Other",                 labelAr: "أخرى",                  color: "#9ca3af", bg: "#f9fafb",  icon: "📋" },
];

const BAR_COLORS = ["#1d4ed8","#7c3aed","#d97706","#059669","#0891b2","#dc2626","#6b7280","#9ca3af"];

const emptyForm = { category: "Raw Materials", cost: "", period: "", notes: "" };

export default function CostAnalysis() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [analyses, setAnalyses] = useState<CostAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => { void fetchAnalyses(); }, []);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cost-analysis`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setAnalyses(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (a: CostAnalysis) => {
    setEditingId(a.id);
    setForm({ category: a.category, cost: String(a.cost), period: a.period ? a.period.substring(0, 7) : "", notes: a.notes ?? "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.cost) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/cost-analysis/${editingId}` : `${API_BASE_URL}/cost-analysis`;
      const cost = parseFloat(form.cost);
      const totalCostForPct = analyses.reduce((s, a) => s + a.cost, 0) + (editingId ? 0 : cost);
      const percentage = totalCostForPct > 0 ? (cost / totalCostForPct) * 100 : 0;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ category: form.category, cost, percentage, period: form.period || undefined, notes: form.notes.trim() || undefined }),
      });
      if (res.ok) { setShowForm(false); void fetchAnalyses(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("حذف هذا التحليل؟", { danger: true }))) return;
    await fetch(`${API_BASE_URL}/cost-analysis/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchAnalyses();
  };

  const periods = [...new Set(analyses.map((a) => a.period).filter(Boolean))].sort().reverse();
  const filtered = analyses.filter((a) => !filterPeriod || a.period === filterPeriod);
  const totalCost = analyses.reduce((s, a) => s + a.cost, 0);
  const topCategory = [...analyses].sort((a, b) => b.cost - a.cost)[0];
  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getCatMeta = (cat: string) => COST_CATEGORIES.find((c) => c.value === cat) ?? COST_CATEGORIES[COST_CATEGORIES.length - 1];

  return (
    <ModulePageShell
      title={"تحليل التكاليف"}
      subtitle={"تحليل توزيع التكاليف عبر فئات المصنع"}
      icon={<PieChart size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        <div style={{ borderRadius: 14, padding: "1rem 1.1rem", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
          <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{"التكلفة الإجمالية"}</p>
          <p style={{ margin: ".25rem 0 0", fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.1 }}>{fmtMoney(totalCost)}</p>
        </div>
        <div style={{ borderRadius: 14, padding: "1rem 1.1rem", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
          <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{"الفئات"}</p>
          <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{analyses.length}</p>
        </div>
        <div style={{ borderRadius: 14, padding: "1rem 1.1rem", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
          <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{"أعلى فئة"}</p>
          <p style={{ margin: ".25rem 0 0", fontSize: "1rem", fontWeight: 900, lineHeight: 1.2 }}>{topCategory ? getCatMeta(topCategory.category).labelAr : "—"}</p>
        </div>
      </div>

      {/* Distribution Chart */}
      {analyses.length > 0 && (
        <Card className="p-5 mb-6">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">{"توزيع التكاليف"}</p>
          <div className="space-y-3">
            {[...analyses].sort((a, b) => b.cost - a.cost).map((a, idx) => {
              const pct = totalCost > 0 ? (a.cost / totalCost) * 100 : 0;
              const meta = getCatMeta(a.category);
              return (
                <div key={a.id}>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                    <span className="font-medium flex items-center gap-1">{meta.icon} {meta.labelAr}</span>
                    <span>{fmtMoney(a.cost)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: BAR_COLORS[idx % BAR_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {"إضافة إدخال"}
          </Button>
        )}
        {periods.length > 0 && (
          <select className="input text-sm h-8 min-w-[160px]" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
            <option value="">{"جميع الفترات"}</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {new Date(p + "-01").toLocaleDateString("ar-SA", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        )}
        {filterPeriod && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => setFilterPeriod("")}>
            {"مسح"}
          </button>
        )}
      </div>

      {/* Form */}
      {!isAdmin && showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">
                {editingId ? "تعديل إدخال التكلفة" : "إدخال تكلفة جديد"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{"أدخل بيانات التكلفة لفئة مصنع"}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{"بيانات التكلفة"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">{"الفئة *"}</label>
              <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.labelAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{"التكلفة ($) *"}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"الفترة"}</label>
              <input className="input" type="month"
                value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"ملاحظات"}</label>
              <input className="input" placeholder={"ملاحظات اختيارية..."}
                value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.cost}>
              <Save size={14} className="me-1" />
              {saving ? "جارٍ الحفظ..." : "حفظ الإدخال"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{"إلغاء"}</Button>
          </div>
        </Card>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <PieChart size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{"لا توجد إدخالات تكاليف"}</p>
          <p className="text-sm mt-1">{"أضف أول إدخال تكلفة للبدء"}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, idx) => {
            const meta = getCatMeta(a.category);
            const sharePct = totalCost > 0 ? (a.cost / totalCost) * 100 : 0;
            return (
              <Card key={a.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {meta.labelAr}
                      </p>
                      {a.period && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {new Date(a.period + "-01").toLocaleDateString("ar-SA", { month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(a)}><Pencil size={14} /></button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <p className="text-2xl font-bold" style={{ color: meta.color }}>{fmtMoney(a.cost)}</p>
                  <div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                      <span>{"الحصة من الإجمالي"}</span>
                      <span>{sharePct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${sharePct}%`, background: BAR_COLORS[idx % BAR_COLORS.length] }} />
                    </div>
                  </div>
                  {a.notes && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-2,#f8fafc)] rounded px-2.5 py-1.5 italic">{a.notes}</p>
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
