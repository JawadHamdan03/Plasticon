import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, CheckCircle, Clock, Archive, GitBranch, X, Save } from "lucide-react";
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

interface ApprovalWorkflow {
  id: number;
  workflowName: string;
  status: string;
  itemsCount: number;
  approverCount: number;
  createdById: number;
  createdBy?: { id: number; fullName: string };
}

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string }> = {
  ACTIVE:   { label: "Active",   labelAr: "نشط",    color: "#059669", bg: "#d1fae5" },
  DRAFT:    { label: "Draft",    labelAr: "مسودة",  color: "#1d4ed8", bg: "#dbeafe" },
  ARCHIVED: { label: "Archived", labelAr: "مؤرشف", color: "#6b7280", bg: "#f3f4f6" },
};

const emptyForm = { workflowName: "", status: "ACTIVE", itemsCount: "", approverCount: "" };

export default function ApprovalWorkflows() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { void fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/approval-workflows`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setWorkflows(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (w: ApprovalWorkflow) => {
    setEditingId(w.id);
    setForm({ workflowName: w.workflowName, status: w.status, itemsCount: String(w.itemsCount), approverCount: String(w.approverCount) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.workflowName.trim()) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/approval-workflows/${editingId}` : `${API_BASE_URL}/approval-workflows`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ workflowName: form.workflowName.trim(), status: form.status, itemsCount: parseInt(form.itemsCount) || 0, approverCount: parseInt(form.approverCount) || 0 }),
      });
      if (res.ok) { setShowForm(false); void fetchWorkflows(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this workflow?", "حذف سير العمل هذا؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/approval-workflows/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchWorkflows();
  };

  const activeCount = workflows.filter((w) => w.status === "ACTIVE").length;
  const draftCount = workflows.filter((w) => w.status === "DRAFT").length;
  const archivedCount = workflows.filter((w) => w.status === "ARCHIVED").length;
  const filtered = workflows.filter((w) => !filterStatus || w.status === filterStatus);

  return (
    <ModulePageShell
      title={nav("Approval Workflows", "سير عمل الموافقة")}
      subtitle={nav("Configure and manage financial approval processes", "تكوين وإدارة عمليات الموافقة المالية")}
      icon={<GitBranch size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Active",   "نشط"),    value: activeCount,   gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: nav("Draft",    "مسودة"),   value: draftCount,    gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Archived", "مؤرشف"),  value: archivedCount, gradient: "linear-gradient(135deg,#64748b,#475569)" },
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
            {nav("Add Workflow", "إضافة سير عمل")}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[160px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{nav("All Statuses", "جميع الحالات")}</option>
          <option value="ACTIVE">{nav("Active", "نشط")}</option>
          <option value="DRAFT">{nav("Draft", "مسودة")}</option>
          <option value="ARCHIVED">{nav("Archived", "مؤرشف")}</option>
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
                {editingId ? nav("Edit Workflow", "تعديل سير العمل") : nav("New Workflow", "سير عمل جديد")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Define an approval process for financial operations", "حدد عملية موافقة للعمليات المالية")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Workflow Details", "بيانات سير العمل")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{nav("Workflow Name *", "اسم سير العمل *")}</label>
              <input className="input" placeholder={nav("e.g. Purchase Order Approval", "مثال: موافقة طلبات الشراء")}
                value={form.workflowName} onChange={(e) => setForm((p) => ({ ...p, workflowName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Status", "الحالة")}</label>
              <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">{nav("Active", "نشط")}</option>
                <option value="DRAFT">{nav("Draft", "مسودة")}</option>
                <option value="ARCHIVED">{nav("Archived", "مؤرشف")}</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Approvers Required", "الموافقون المطلوبون")}</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.approverCount} onChange={(e) => setForm((p) => ({ ...p, approverCount: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Items Count", "عدد العناصر")}</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.itemsCount} onChange={(e) => setForm((p) => ({ ...p, itemsCount: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.workflowName.trim()}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Workflow", "حفظ سير العمل")}
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
          <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No workflows found", "لا توجد سير عمل")}</p>
          <p className="text-sm mt-1">{nav("Add your first approval workflow to get started", "أضف أول سير عمل موافقة للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => {
            const meta = STATUS_META[w.status] ?? STATUS_META.DRAFT;
            const StatusIcon = w.status === "ACTIVE" ? CheckCircle : w.status === "DRAFT" ? Clock : Archive;
            return (
              <Card key={w.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>🔀</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{w.workflowName}</p>
                      <span style={{ background: meta.color + "20", color: meta.color, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}
                        className="inline-flex items-center gap-1">
                        <StatusIcon size={9} />
                        {locale === "ar" ? meta.labelAr : meta.label}
                      </span>
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(w)}><Pencil size={14} /></button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(w.id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-surface-2,#f8fafc)] rounded-lg p-3 text-center">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{nav("Items", "العناصر")}</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">{w.itemsCount}</p>
                    </div>
                    <div className="bg-[var(--bg-surface-2,#f8fafc)] rounded-lg p-3 text-center">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{nav("Approvers", "الموافقون")}</p>
                      <p className="text-xl font-bold text-[var(--text-primary)]">{w.approverCount}</p>
                    </div>
                  </div>
                  {w.createdBy && (
                    <p className="text-xs text-[var(--text-secondary)]">👤 {w.createdBy.fullName}</p>
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
