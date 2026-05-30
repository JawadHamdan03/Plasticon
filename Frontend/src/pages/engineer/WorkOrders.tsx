import { useCallback, useEffect, useState } from "react";
import {
  Wrench, Plus, X, CheckCircle, Clock, AlertTriangle,
  PlayCircle, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ─── Types ─────────────────────────────────────────────────── */
type Machine = { id: number; name: string; type: string };
type WorkOrder = {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  scheduleType: string;
  frequency: string;
  nextScheduledDate: string;
  lastScheduledDate?: string | null;
  status: string;
  description?: string | null;
  assignedEngineer?: { id: number; fullName: string } | null;
  createdBy?: { id: number; fullName: string } | null;
  createdAt: string;
};

/* ─── Presets ────────────────────────────────────────────────── */
const TASK_PRESETS = [
  { key: "lubricate",    icon: "🛢️",  en: "Lubrication",           ar: "تزييت",                  desc: "Lubricate machine joints, bearings, and moving parts" },
  { key: "mold",         icon: "🔩",  en: "Open & Inspect Mold",   ar: "فتح وفحص القالب",         desc: "Open mold cavity, inspect for wear and damage" },
  { key: "clean_cavity", icon: "🧹",  en: "Clean Inner Cavity",    ar: "تنظيف التجويف الداخلي",   desc: "Clean inner cavity and remove residue buildup" },
  { key: "oil_change",   icon: "🔧",  en: "Oil Change",            ar: "تغيير الزيت",              desc: "Replace hydraulic or gear oil" },
  { key: "belt_check",   icon: "⚙️",  en: "Belt & Chain Check",    ar: "فحص الأحزمة والسلاسل",    desc: "Inspect and tension drive belts and chains" },
  { key: "cooling",      icon: "❄️",  en: "Cooling System Check",  ar: "فحص نظام التبريد",        desc: "Check coolant levels and cooling circuit integrity" },
  { key: "electrical",   icon: "⚡",  en: "Electrical Inspection", ar: "الفحص الكهربائي",          desc: "Inspect wiring, sensors, and control panels" },
  { key: "custom",       icon: "✏️",  en: "Custom Task",           ar: "مهمة مخصصة",              desc: "" },
] as const;

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string; labelAr: string }> = {
  PENDING:     { color: "#92400e", bg: "#fef3c7", border: "#fcd34d", label: "Pending",     labelAr: "معلق" },
  IN_PROGRESS: { color: "#1e40af", bg: "#dbeafe", border: "#93c5fd", label: "In Progress", labelAr: "قيد التنفيذ" },
  COMPLETED:   { color: "#065f46", bg: "#d1fae5", border: "#6ee7b7", label: "Completed",   labelAr: "مكتمل" },
  OVERDUE:     { color: "#991b1b", bg: "#fee2e2", border: "#fca5a5", label: "Overdue",     labelAr: "متأخر" },
};

const FREQ_LABELS: Record<string, { en: string; ar: string }> = {
  DAILY:     { en: "Daily",     ar: "يومي" },
  WEEKLY:    { en: "Weekly",    ar: "أسبوعي" },
  MONTHLY:   { en: "Monthly",  ar: "شهري" },
  QUARTERLY: { en: "Quarterly", ar: "ربع سنوي" },
  YEARLY:    { en: "Yearly",   ar: "سنوي" },
};

const today = () => new Date().toISOString().slice(0, 10);
const isToday  = (d: string) => d.slice(0, 10) === today();
const isOverdue = (d: string, status: string) =>
  status !== "COMPLETED" && new Date(d) < new Date() && d.slice(0, 10) !== today();

function resolveStatus(order: WorkOrder): string {
  if (order.status === "COMPLETED") return "COMPLETED";
  if (isOverdue(order.nextScheduledDate, order.status)) return "OVERDUE";
  return order.status;
}

const emptyForm = {
  machineId: "",
  presetKey: "lubricate" as string,
  description: TASK_PRESETS[0].desc as string,
  frequency: "DAILY",
  nextScheduledDate: today(),
  scheduleType: "PREVENTIVE",
};

/* ─── Component ──────────────────────────────────────────────── */
export default function WorkOrders() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";
  const nav = (en: string, ar: string) => (isAr ? ar : en);
  const isAdmin = user?.role === "ADMIN";

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterTab, setFilterTab] = useState<"today" | "all" | "overdue" | "done">("today");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schRes, machRes] = await Promise.all([
        fetch(`${API_BASE_URL}/maintenance-schedule`, { credentials: "include", headers: authHeaders() }),
        fetch(`${API_BASE_URL}/machines`, { credentials: "include", headers: authHeaders() }),
      ]);
      if (schRes.ok) {
        const d = await schRes.json();
        setOrders(Array.isArray(d) ? d : (d.data ?? []));
      }
      if (machRes.ok) {
        const d = await machRes.json();
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ── Patch status ──────────────────────────────────────────── */
  const patchStatus = async (id: number, status: string) => {
    const body: Record<string, unknown> = { status };
    if (status === "COMPLETED") body.lastScheduledDate = new Date().toISOString();
    await fetch(`${API_BASE_URL}/maintenance-schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(body),
    });
    void load();
  };

  /* ── Delete ────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this work order?", "حذف أمر العمل هذا؟"), { danger: true }))) return;
    await fetch(`${API_BASE_URL}/maintenance-schedule/${id}`, {
      method: "DELETE", headers: authHeaders(), credentials: "include",
    });
    void load();
  };

  /* ── Create ────────────────────────────────────────────────── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId || !form.nextScheduledDate) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          machineId: parseInt(form.machineId),
          scheduleType: form.scheduleType,
          frequency: form.frequency,
          nextScheduledDate: form.nextScheduledDate,
          description: form.description || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(emptyForm);
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Filtered views ────────────────────────────────────────── */
  const todayOrders   = orders.filter(o => isToday(o.nextScheduledDate));
  const overdueOrders = orders.filter(o => isOverdue(o.nextScheduledDate, o.status));
  const doneOrders    = orders.filter(o => o.status === "COMPLETED");

  const displayed =
    filterTab === "today"   ? todayOrders :
    filterTab === "overdue" ? overdueOrders :
    filterTab === "done"    ? doneOrders :
    orders;

  /* ── KPI counts ────────────────────────────────────────────── */
  const kpis = [
    { label: nav("Today's Tasks", "مهام اليوم"),  value: todayOrders.length,   icon: "📋", color: "#1d4ed8", bg: "#dbeafe" },
    { label: nav("Overdue",        "متأخرة"),       value: overdueOrders.length, icon: "⏰", color: "#dc2626", bg: "#fee2e2" },
    { label: nav("Completed",      "مكتملة"),       value: doneOrders.length,    icon: "✅", color: "#059669", bg: "#d1fae5" },
    { label: nav("Total",          "الإجمالي"),     value: orders.length,        icon: "🔧", color: "#7c3aed", bg: "#ede9fe" },
  ];

  return (
    <ModulePageShell
      title={nav("Work Orders", "أوامر العمل")}
      subtitle={nav("Daily maintenance tasks: lubrication, mold checks, cavity cleaning and more", "مهام الصيانة اليومية: التزييت، فحص القوالب، تنظيف التجاويف والمزيد")}
      icon={<Wrench size={22} />}
    >

      {/* ── KPI row ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding: ".85rem 1rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 600 }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem", marginBottom: "1rem" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
          {([
            ["today",   nav("Today", "اليوم"),       todayOrders.length],
            ["all",     nav("All", "الكل"),           orders.length],
            ["overdue", nav("Overdue", "متأخرة"),     overdueOrders.length],
            ["done",    nav("Completed", "مكتملة"),   doneOrders.length],
          ] as const).map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setFilterTab(key)}
              style={{ padding: ".4rem .875rem", borderRadius: 8, border: "1px solid var(--border-default)", background: filterTab === key ? "var(--orange-500,#f97316)" : "var(--bg-surface)", color: filterTab === key ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem" }}>
              {label}
              <span style={{ fontSize: ".7rem", opacity: .85 }}>({count})</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button type="button" onClick={() => void load()}
            style={{ padding: ".4rem .75rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".82rem", fontWeight: 600 }}>
            <RefreshCw size={14} /> {nav("Refresh", "تحديث")}
          </button>
          {!isAdmin && (
            <button type="button" onClick={() => setShowForm(v => !v)}
              style={{ padding: ".4rem .875rem", borderRadius: 8, border: "none", background: "var(--orange-500,#f97316)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".82rem", fontWeight: 700 }}>
              <Plus size={15} /> {nav("New Work Order", "أمر عمل جديد")}
            </button>
          )}
        </div>
      </div>

      {/* ── Create form ─────────────────────────────────────────── */}
      {showForm && !isAdmin && (
        <Card style={{ padding: "1.25rem", marginBottom: "1.25rem", border: "2px solid var(--orange-500,#f97316)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>{nav("New Work Order", "أمر عمل جديد")}</h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
          </div>

          <form onSubmit={(e) => void handleCreate(e)}>
            {/* Task presets */}
            <p style={{ margin: "0 0 .5rem", fontSize: ".8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
              {nav("Task Type", "نوع المهمة")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: ".4rem", marginBottom: "1rem" }}>
              {TASK_PRESETS.map(p => {
                const sel = form.presetKey === p.key;
                return (
                  <button key={p.key} type="button"
                    onClick={() => setForm(f => ({ ...f, presetKey: p.key, description: p.desc }))}
                    style={{ padding: ".55rem .6rem", borderRadius: 10, border: sel ? "2px solid var(--orange-500,#f97316)" : "2px solid var(--border-default)", background: sel ? "rgba(249,115,22,.08)" : "var(--bg-surface)", cursor: "pointer", textAlign: "center", transition: "all .12s" }}>
                    <div style={{ fontSize: "1.2rem", marginBottom: ".2rem" }}>{p.icon}</div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: sel ? "var(--orange-600,#ea580c)" : "var(--text-primary)", lineHeight: 1.2 }}>{isAr ? p.ar : p.en}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".875rem", marginBottom: ".875rem" }}>
              {/* Machine */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Machine *", "الآلة *")}
                <select className="input" required value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}>
                  <option value="">{nav("Select machine…", "اختر الآلة…")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                </select>
              </label>

              {/* Due date */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Due Date *", "تاريخ الاستحقاق *")}
                <input type="date" className="input" required value={form.nextScheduledDate}
                  onChange={e => setForm(f => ({ ...f, nextScheduledDate: e.target.value }))} />
              </label>

              {/* Frequency */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Frequency", "التكرار")}
                <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
                </select>
              </label>
            </div>

            {/* Description */}
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: ".875rem" }}>
              {nav("Task Description", "وصف المهمة")}
              <textarea className="input" rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={nav("Describe what needs to be done…", "اكتب تفاصيل المهمة…")} />
            </label>

            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: ".5rem 1.1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 }}>
                {nav("Cancel", "إلغاء")}
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "none", background: "var(--orange-500,#f97316)", color: "#fff", cursor: "pointer", fontSize: ".85rem", fontWeight: 700 }}>
                {saving ? nav("Saving…", "جاري الحفظ…") : nav("Create Work Order", "إنشاء أمر العمل")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Orders list ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><span className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <Wrench size={36} style={{ color: "var(--text-muted)", margin: "0 auto .75rem", display: "block", opacity: .3 }} />
          <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 600 }}>
            {filterTab === "today"   ? nav("No tasks scheduled for today", "لا توجد مهام مجدولة لليوم")
            : filterTab === "overdue" ? nav("No overdue work orders — great work!", "لا توجد أوامر متأخرة — عمل رائع!")
            : filterTab === "done"    ? nav("No completed orders yet", "لا توجد أوامر مكتملة بعد")
            : nav("No work orders yet. Create one to get started.", "لا توجد أوامر عمل. أنشئ واحدًا للبدء.")}
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          {displayed.map(order => {
            const sts = resolveStatus(order);
            const meta = STATUS_META[sts] ?? STATUS_META.PENDING;
            const expanded = expandedId === order.id;
            const preset = TASK_PRESETS.find(p => order.description?.toLowerCase().includes(p.en.toLowerCase().slice(0, 6)));

            return (
              <Card key={order.id} style={{ overflow: "hidden", border: sts === "OVERDUE" ? "1.5px solid #fca5a5" : sts === "IN_PROGRESS" ? "1.5px solid #93c5fd" : "1px solid var(--border-default)" }}>

                {/* Header row */}
                <div style={{ padding: ".85rem 1rem", display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>

                  {/* Preset icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                    {preset?.icon ?? "🔧"}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: ".92rem" }}>
                        {order.machine?.name ?? `Machine #${order.machineId}`}
                      </span>
                      <span style={{ fontSize: ".72rem", padding: "2px 8px", borderRadius: "999px", background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontWeight: 700 }}>
                        {isAr ? meta.labelAr : meta.label}
                      </span>
                      {isToday(order.nextScheduledDate) && sts !== "COMPLETED" && (
                        <span style={{ fontSize: ".68rem", padding: "2px 7px", borderRadius: "999px", background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047", fontWeight: 700 }}>
                          {nav("TODAY", "اليوم")}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: ".15rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                      {order.description
                        ? order.description.slice(0, 70) + (order.description.length > 70 ? "…" : "")
                        : nav("No description", "بدون وصف")}
                    </p>
                  </div>

                  {/* Right side: date + freq + actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: ".65rem", color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Due", "الاستحقاق")}</p>
                      <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 700 }}>{new Date(order.nextScheduledDate).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: ".65rem", color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Freq", "التكرار")}</p>
                      <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, color: "var(--text-secondary)" }}>{isAr ? FREQ_LABELS[order.frequency]?.ar : FREQ_LABELS[order.frequency]?.en}</p>
                    </div>

                    {/* Action buttons */}
                    {!isAdmin && sts !== "COMPLETED" && (
                      <>
                        {sts === "PENDING" || sts === "OVERDUE" ? (
                          <button type="button" onClick={() => void patchStatus(order.id, "IN_PROGRESS")}
                            style={{ padding: ".35rem .75rem", borderRadius: 8, border: "1px solid #93c5fd", background: "#dbeafe", color: "#1e40af", cursor: "pointer", fontSize: ".75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".3rem" }}>
                            <PlayCircle size={13} /> {nav("Start", "بدء")}
                          </button>
                        ) : null}
                        {sts === "IN_PROGRESS" ? (
                          <button type="button" onClick={() => void patchStatus(order.id, "COMPLETED")}
                            style={{ padding: ".35rem .75rem", borderRadius: 8, border: "1px solid #6ee7b7", background: "#d1fae5", color: "#065f46", cursor: "pointer", fontSize: ".75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".3rem" }}>
                            <CheckCircle size={13} /> {nav("Complete", "إتمام")}
                          </button>
                        ) : null}
                      </>
                    )}

                    {/* Expand toggle */}
                    <button type="button" onClick={() => setExpandedId(expanded ? null : order.id)}
                      style={{ padding: ".35rem", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ borderTop: "1px solid var(--border-default)", padding: ".75rem 1rem", background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: ".4rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".5rem", fontSize: ".8rem" }}>
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Type:", "النوع:")} </span>
                        <span>{order.scheduleType}</span>
                      </div>
                      {order.lastScheduledDate && (
                        <div>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Last done:", "آخر تنفيذ:")} </span>
                          <span>{new Date(order.lastScheduledDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {order.assignedEngineer && (
                        <div>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Assigned to:", "مسند إلى:")} </span>
                          <span>{order.assignedEngineer.fullName}</span>
                        </div>
                      )}
                      {order.createdBy && (
                        <div>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Created by:", "أنشأه:")} </span>
                          <span>{order.createdBy.fullName}</span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("Created:", "تاريخ الإنشاء:")} </span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {order.description && (
                      <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        {order.description}
                      </p>
                    )}

                    {/* Status action buttons in expanded view */}
                    {!isAdmin && (
                      <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem", flexWrap: "wrap" }}>
                        {sts !== "COMPLETED" && sts !== "IN_PROGRESS" && (
                          <button type="button" onClick={() => void patchStatus(order.id, "IN_PROGRESS")}
                            style={{ padding: ".4rem .85rem", borderRadius: 8, border: "1px solid #93c5fd", background: "#dbeafe", color: "#1e40af", cursor: "pointer", fontSize: ".8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".35rem" }}>
                            <PlayCircle size={14} /> {nav("Mark In Progress", "تعيين قيد التنفيذ")}
                          </button>
                        )}
                        {sts !== "COMPLETED" && (
                          <button type="button" onClick={() => void patchStatus(order.id, "COMPLETED")}
                            style={{ padding: ".4rem .85rem", borderRadius: 8, border: "1px solid #6ee7b7", background: "#d1fae5", color: "#065f46", cursor: "pointer", fontSize: ".8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".35rem" }}>
                            <CheckCircle size={14} /> {nav("Mark Complete", "تعيين مكتمل")}
                          </button>
                        )}
                        {sts === "COMPLETED" && (
                          <button type="button" onClick={() => void patchStatus(order.id, "PENDING")}
                            style={{ padding: ".4rem .85rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: ".35rem" }}>
                            <Clock size={14} /> {nav("Reopen", "إعادة فتح")}
                          </button>
                        )}
                        <button type="button" onClick={() => void handleDelete(order.id)}
                          style={{ padding: ".4rem .85rem", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: ".8rem", fontWeight: 600, marginLeft: "auto" }}>
                          {nav("Delete", "حذف")}
                        </button>
                      </div>
                    )}
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
