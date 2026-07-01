import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Pencil, Trash2, CheckCircle, Clock, Landmark, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface BankReconciliation {
  id: number;
  accountName: string;
  bankBalance: number;
  bookBalance: number;
  reconciled: boolean;
  notes?: string;
  reconciledById: number;
  reconciledBy?: { id: number; fullName: string };
}

const emptyForm = { accountName: "", bankBalance: "", bookBalance: "", reconciled: false, notes: "" };

export default function BankReconciliation() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { void fetchReconciliations(); }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bank-reconciliations`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const data = await res.json(); setReconciliations(data ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r: BankReconciliation) => {
    setEditingId(r.id);
    setForm({ accountName: r.accountName, bankBalance: String(r.bankBalance), bookBalance: String(r.bookBalance), reconciled: r.reconciled, notes: r.notes ?? "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.accountName || !form.bankBalance || !form.bookBalance) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/bank-reconciliations/${editingId}` : `${API_BASE_URL}/bank-reconciliations`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ accountName: form.accountName, bankBalance: parseFloat(form.bankBalance), bookBalance: parseFloat(form.bookBalance), reconciled: form.reconciled, notes: form.notes.trim() || undefined }),
      });
      if (res.ok) { setShowForm(false); void fetchReconciliations(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("حذف هذا التسوية؟", { danger: true }))) return;
    await fetch(`${API_BASE_URL}/bank-reconciliations/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    void fetchReconciliations();
  };

  const reconciledCount = reconciliations.filter((r) => r.reconciled).length;
  const pendingCount = reconciliations.length - reconciledCount;
  const totalBankBalance = reconciliations.reduce((s, r) => s + r.bankBalance, 0);
  const fmtMoney = (n: number) => `₪${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filtered = reconciliations.filter((r) => {
    if (!filterStatus) return true;
    return filterStatus === "RECONCILED" ? r.reconciled : !r.reconciled;
  });

  return (
    <ModulePageShell
      title={"تسوية البنك"}
      subtitle={"تسوية الحسابات المصرفية مع سجلات الدفاتر"}
      icon={<Landmark size={22} />}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "متوفق",                value: reconciledCount,          gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: "قيد المراجعة",         value: pendingCount,              gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: "إجمالي رصيد البنك",    value: fmtMoney(totalBankBalance), gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
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
            {"إضافة حساب"}
          </Button>
        )}
        <select className="input text-sm h-8 min-w-[160px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{"جميع الحالات"}</option>
          <option value="RECONCILED">{"متوفق"}</option>
          <option value="PENDING">{"قيد المراجعة"}</option>
        </select>
        {filterStatus && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => setFilterStatus("")}>
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
                {editingId ? "تعديل التسوية" : "تسوية جديدة"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{"أدخل بيانات تسوية الحساب"}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{"بيانات الحساب"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{"اسم الحساب *"}</label>
              <input className="input" placeholder={"مثال: الحساب التشغيلي الرئيسي"}
                value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"رصيد البنك ($) *"}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.bankBalance} onChange={(e) => setForm((p) => ({ ...p, bankBalance: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"رصيد الدفاتر ($) *"}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.bookBalance} onChange={(e) => setForm((p) => ({ ...p, bookBalance: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{"ملاحظات"}</label>
              <textarea className="input resize-none" rows={2}
                placeholder={"ملاحظات التسوية..."}
                value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 px-1">
              <input type="checkbox" id="reconciled-check" checked={form.reconciled}
                onChange={(e) => setForm((p) => ({ ...p, reconciled: e.target.checked }))}
                className="w-4 h-4 rounded accent-[var(--accent)]" />
              <label htmlFor="reconciled-check" className="text-sm text-[var(--text-primary)] cursor-pointer">
                {"وضع علامة متوفق"}
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.accountName || !form.bankBalance || !form.bookBalance}>
              <Save size={14} className="me-1" />
              {saving ? "جارٍ الحفظ..." : "حفظ الحساب"}
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
          <Landmark size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{"لا توجد حسابات"}</p>
          <p className="text-sm mt-1">{"أضف أول حساب مصرفي للبدء"}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const diff = r.bankBalance - r.bookBalance;
            const isBalanced = diff === 0;
            const statusColor = r.reconciled ? "#059669" : "#d97706";
            const statusBg = r.reconciled ? "#d1fae5" : "#fef3c7";
            const StatusIcon = r.reconciled ? CheckCircle : Clock;
            return (
              <Card key={r.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: statusBg, borderBottom: `2px solid ${statusColor}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>🏦</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{r.accountName}</p>
                      <span style={{ background: statusColor + "20", color: statusColor, borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700 }}
                        className="inline-flex items-center gap-1">
                        <StatusIcon size={9} />
                        {r.reconciled ? "متوفق" : "قيد المراجعة"}
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
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">{"البنك"}</p>
                      <p className="font-bold text-blue-600">{fmtMoney(r.bankBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)]">{"الدفاتر"}</p>
                      <p className="font-bold text-orange-600">{fmtMoney(r.bookBalance)}</p>
                    </div>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-2,#f8fafc)] rounded px-2.5 py-1.5 italic">{r.notes}</p>
                  )}
                  {r.reconciledBy && (
                    <p className="text-xs text-[var(--text-secondary)]">👤 {r.reconciledBy.fullName}</p>
                  )}
                </div>
                <div className="border-t border-[var(--border-default)] px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{"الفرق"}</span>
                  <span className="font-bold text-sm" style={{ color: isBalanced ? "#059669" : "#dc2626" }}>
                    {isBalanced ? "✓ متوازن" : fmtMoney(Math.abs(diff))}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
