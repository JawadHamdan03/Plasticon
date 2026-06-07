import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import {
  Wrench, Plus, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, X, RefreshCw,
} from "lucide-react";

type Machine    = { id: number; name: string; type?: string };
type Maintenance = {
  id: number;
  partsUsed: string;
  downtimeMinutes: number | null;
  downtimeReason: string;
  reportText: string | null;
  createdAt: string;
  machine: { id: number; name: string; type?: string };
  shift?: { id: number; name?: string };
  engineer?: { id: number; fullName: string; username: string; role: string };
};

function authToken(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function fetchAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authToken(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

const DOWNTIME_REASONS: { value: string; en: string; ar: string }[] = [
  { value: "BELT_FAILURE",          en: "Belt Failure",          ar: "عطل الحزام" },
  { value: "MOTOR_ISSUE",           en: "Motor Issue",           ar: "مشكلة المحرك" },
  { value: "HYDRAULIC_FAILURE",     en: "Hydraulic Failure",     ar: "عطل هيدروليكي" },
  { value: "SEAL_LEAK",             en: "Seal Leak",             ar: "تسريب الختم" },
  { value: "ELECTRICAL",            en: "Electrical",            ar: "كهربائي" },
  { value: "SENSOR_MALFUNCTION",    en: "Sensor Malfunction",    ar: "عطل حساس" },
  { value: "SCHEDULED_MAINTENANCE", en: "Scheduled Maintenance", ar: "صيانة مجدولة" },
  { value: "OTHER",                 en: "Other",                 ar: "أخرى" },
];

const SEV_META: Record<"low" | "mid" | "high", { gradient: string; color: string; label: string; labelAr: string }> = {
  low:  { gradient: "linear-gradient(135deg,#10b981,#059669)", color: "#059669", label: "Minor",    labelAr: "طفيف" },
  mid:  { gradient: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#d97706", label: "Moderate", labelAr: "متوسط" },
  high: { gradient: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#dc2626", label: "Severe",   labelAr: "حرج" },
};

function severityKey(mins: number | null): "low" | "mid" | "high" {
  if (!mins || mins < 30) return "low";
  if (mins < 90) return "mid";
  return "high";
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(d));
}

const emptyForm = { machineId: "", partsUsed: "", downtimeMinutes: "", downtimeReason: "OTHER", reportText: "" };

export function MaintenancePage() {
  const { user }   = useAuth();
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const role      = String(user?.role ?? "WORKER").toUpperCase();
  const canCreate = ["ENGINEER", "WORKER"].includes(role);

  const [records,    setRecords]    = useState<Maintenance[]>([]);
  const [machines,   setMachines]   = useState<Machine[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sevFilter,  setSevFilter]  = useState<"all" | "low" | "mid" | "high">("all");
  const [form,       setForm]       = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = ["ADMIN", "ACCOUNTANT"].includes(role) ? "/maintenance/all" : "/maintenance/me";
      const res = await fetchAuth(endpoint);
      if (!res.ok) throw new Error(await readApiError(res));
      setRecords((await res.json()) as Maintenance[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const res = await fetchAuth("/machines");
      if (res.ok) {
        const d = (await res.json()) as { items?: Machine[]; data?: Machine[] } | Machine[];
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    void load();
    if (canCreate) void loadMachines();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const res = await fetchAuth("/maintenance", {
        method: "POST",
        body: JSON.stringify({
          machineId: Number(form.machineId),
          partsUsed: form.partsUsed,
          downtimeMinutes: form.downtimeMinutes ? Number(form.downtimeMinutes) : undefined,
          downtimeReason: form.downtimeReason,
          reportText: form.reportText || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(nav("Maintenance report created successfully", "تم إنشاء تقرير الصيانة بنجاح"));
      setForm(emptyForm);
      setShowForm(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  /* KPIs */
  const total          = records.length;
  const urgentCount    = records.filter(r => (r.downtimeMinutes ?? 0) >= 60).length;
  const totalDowntime  = records.reduce((a, r) => a + (r.downtimeMinutes ?? 0), 0);
  const uniqueMachines = new Set(records.map(r => r.machine?.id)).size;

  const filtered = sevFilter === "all" ? records : records.filter(r => severityKey(r.downtimeMinutes) === sevFilter);

  return (
    <ModulePageShell
      title={nav("Maintenance", "الصيانة")}
      subtitle={nav("Maintenance reports & equipment downtime tracking", "تقارير الصيانة وتتبع توقف المعدات")}
      icon={<Wrench size={22} />}
      actions={
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button type="button" onClick={() => void load()}
            style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".45rem .9rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".83rem", fontWeight: 600 }}>
            <RefreshCw size={14} /> {nav("Refresh", "تحديث")}
          </button>
          {canCreate && (
            <button type="button" onClick={() => setShowForm(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".45rem .9rem", borderRadius: 8, border: "none", background: "var(--brand-primary,#f97316)", color: "#fff", cursor: "pointer", fontSize: ".83rem", fontWeight: 700 }}>
              <Plus size={15} /> {nav("New Report", "تقرير جديد")}
            </button>
          )}
        </div>
      }
    >
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Total Reports",    "إجمالي التقارير"),   value: total,                         gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Critical Stops",   "توقفات حرجة"),        value: urgentCount,                   gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
          { label: nav("Total Downtime",   "وقت التوقف (دقيقة)"), value: `${totalDowntime} min`,        gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: nav("Machines Affected","آلات متأثرة"),        value: uniqueMachines,                gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: 10, background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", fontSize: ".875rem", marginBottom: "1rem" }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: 10, background: "#d1fae5", border: "1px solid #a7f3d0", color: "#059669", fontSize: ".875rem", marginBottom: "1rem" }}>
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Create form */}
      {canCreate && showForm && (
        <Card style={{ padding: "1.25rem", marginBottom: "1.25rem", border: "2px solid var(--brand-primary,#f97316)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>{nav("New Maintenance Report", "تقرير صيانة جديد")}</h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><X size={18} /></button>
          </div>
          <form onSubmit={(e) => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".875rem", marginBottom: ".875rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Machine *", "الآلة *")}
                <select className="input" value={form.machineId} onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))} required>
                  <option value="">{nav("Select machine...", "اختر الآلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}{m.type ? ` (${m.type})` : ""}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Downtime Reason", "سبب التوقف")}
                <select className="input" value={form.downtimeReason} onChange={e => setForm(p => ({ ...p, downtimeReason: e.target.value }))}>
                  {DOWNTIME_REASONS.map(r => <option key={r.value} value={r.value}>{locale === "ar" ? r.ar : r.en}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Downtime (minutes)", "وقت التوقف (دقيقة)")}
                <input className="input" type="number" min={0} value={form.downtimeMinutes} placeholder="0"
                  onChange={e => setForm(p => ({ ...p, downtimeMinutes: e.target.value }))} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Parts Used *", "القطع المستخدمة *")}
                <input className="input" type="text" value={form.partsUsed} required
                  placeholder={nav("e.g. belt, pump, manifold...", "مثال: بكرة، مضخة، مشعب...")}
                  onChange={e => setForm(p => ({ ...p, partsUsed: e.target.value }))} />
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: ".875rem" }}>
              {nav("Report Details", "تفاصيل التقرير")}
              <textarea className="input" rows={3} value={form.reportText}
                placeholder={nav("Additional details about the maintenance work...", "تفاصيل إضافية عن أعمال الصيانة...")}
                onChange={e => setForm(p => ({ ...p, reportText: e.target.value }))} />
            </label>

            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", paddingTop: ".75rem", borderTop: "1px solid var(--border-default)" }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: ".5rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 }}>
                {nav("Cancel", "إلغاء")}
              </button>
              <button type="submit"
                style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "none", background: "var(--brand-primary,#f97316)", color: "#fff", cursor: "pointer", fontSize: ".85rem", fontWeight: 700 }}>
                {nav("Save Report", "حفظ التقرير")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Severity filter */}
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {([
          ["all",  nav("All", "الكل"),         records.length],
          ["low",  nav("Minor", "طفيف"),        records.filter(r => severityKey(r.downtimeMinutes) === "low").length],
          ["mid",  nav("Moderate", "متوسط"),    records.filter(r => severityKey(r.downtimeMinutes) === "mid").length],
          ["high", nav("Severe ≥90min", "حرج"), records.filter(r => severityKey(r.downtimeMinutes) === "high").length],
        ] as const).map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setSevFilter(key)}
            style={{
              padding: ".35rem .85rem", borderRadius: 8, fontSize: ".8rem", fontWeight: 600, cursor: "pointer",
              border: "1px solid " + (sevFilter === key ? "transparent" : "var(--border-default)"),
              background: sevFilter === key
                ? (key === "high" ? "#dc2626" : key === "mid" ? "#d97706" : key === "low" ? "#059669" : "var(--brand-primary,#f97316)")
                : "var(--bg-surface)",
              color: sevFilter === key ? "#fff" : "var(--text-secondary)",
            }}>
            {label} <span style={{ opacity: .75, fontSize: ".72rem" }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <Wrench size={36} style={{ color: "var(--text-secondary)", margin: "0 auto .75rem", display: "block", opacity: .3 }} />
          <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 600 }}>
            {nav("No maintenance reports yet", "لا توجد تقارير صيانة بعد")}
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          {filtered.map(r => {
            const sevKey = severityKey(r.downtimeMinutes);
            const sev    = SEV_META[sevKey];
            const reason = DOWNTIME_REASONS.find(d => d.value === r.downtimeReason);
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} style={{ overflow: "hidden", borderLeft: `4px solid ${sev.color}` }}>
                <div style={{ padding: ".85rem 1rem", display: "flex", alignItems: "flex-start", gap: ".75rem" }}>
                  {/* Severity dot */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: sev.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Wrench size={16} color="#fff" />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                      <span style={{ fontWeight: 700, fontSize: ".92rem", color: "var(--text-primary)" }}>
                        {r.machine?.name ?? `Machine #${r.id}`}
                      </span>
                      <span style={{ fontSize: ".7rem", padding: "2px 8px", borderRadius: 999, background: sev.color + "18", color: sev.color, fontWeight: 700 }}>
                        {locale === "ar" ? sev.labelAr : sev.label}
                      </span>
                      {r.shift?.name && (
                        <span style={{ fontSize: ".7rem", padding: "2px 8px", borderRadius: 999, background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", fontWeight: 600 }}>
                          {r.shift.name}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)" }}>
                      <strong>{nav("Parts:", "القطع:")}</strong> {r.partsUsed}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginTop: ".35rem", flexWrap: "wrap" }}>
                      {r.downtimeMinutes != null && (
                        <span style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".75rem", color: sev.color, fontWeight: 700 }}>
                          <Clock size={12} /> {r.downtimeMinutes} min
                        </span>
                      )}
                      {reason && (
                        <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 999, background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                          {locale === "ar" ? reason.ar : reason.en}
                        </span>
                      )}
                      {r.engineer && (
                        <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>
                          {nav("by", "بواسطة")} {r.engineer.fullName}
                        </span>
                      )}
                      <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginLeft: "auto" }}>
                        {fmtDate(r.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  {r.reportText && (
                    <button type="button" onClick={() => setExpandedId(expanded ? null : r.id)}
                      style={{ padding: ".3rem", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", flexShrink: 0 }}>
                      {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {expanded && r.reportText && (
                  <div style={{ borderTop: "1px solid var(--border-default)", padding: ".75rem 1rem", background: "var(--bg-surface)" }}>
                    <p style={{ margin: 0, fontSize: ".83rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {r.reportText}
                    </p>
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
