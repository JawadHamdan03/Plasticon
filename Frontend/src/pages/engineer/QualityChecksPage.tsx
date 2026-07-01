import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Plus, CheckSquare } from "lucide-react";

type Machine = { id: number; name: string; type?: string };
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type QualityCheck = {
  id: number;
  issueType: string;
  severity: Severity;
  description: string | null;
  resolvedAt: string | null;
  createdAt: string;
  machine: { id: number; name: string };
  engineer?: { id: number; fullName: string; username: string };
};

function authToken(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function fetchAuth(path: string, opts?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authToken(), ...(opts?.headers ?? {}) },
    credentials: "include",
  });
}

const ISSUE_TYPES = [
  "DIMENSIONAL", "SURFACE_DEFECT", "MATERIAL_FAULT",
  "PROCESS_DEVIATION", "CONTAMINATION", "ASSEMBLY_ERROR", "OTHER",
];
const ISSUE_LABELS: Record<string, { en: string; ar: string }> = {
  DIMENSIONAL:       { en: "Dimensional",        ar: "أبعاد خاطئة" },
  SURFACE_DEFECT:    { en: "Surface Defect",      ar: "عيب سطحي" },
  MATERIAL_FAULT:    { en: "Material Fault",      ar: "خلل في المادة" },
  PROCESS_DEVIATION: { en: "Process Deviation",   ar: "انحراف في العملية" },
  CONTAMINATION:     { en: "Contamination",       ar: "تلوث" },
  ASSEMBLY_ERROR:    { en: "Assembly Error",      ar: "خطأ في التجميع" },
  OTHER:             { en: "Other",               ar: "أخرى" },
};
const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SEV_META: Record<Severity, { en: string; ar: string; color: string; bg: string; gradient: string }> = {
  LOW:      { en: "Low",      ar: "منخفض", color: "#059669", bg: "#d1fae5", gradient: "linear-gradient(135deg,#10b981,#059669)" },
  MEDIUM:   { en: "Medium",   ar: "متوسط", color: "#d97706", bg: "#fef3c7", gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
  HIGH:     { en: "High",     ar: "مرتفع", color: "#ea580c", bg: "#ffedd5", gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
  CRITICAL: { en: "Critical", ar: "حرج",   color: "#dc2626", bg: "#fee2e2", gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
};

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(d));
}

export function QualityChecksPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? "WORKER").toUpperCase();
  const canViewAll = ["ADMIN", "ACCOUNTANT"].includes(role);
  const canCreate = !["ADMIN", "ACCOUNTANT"].includes(role);

  const [records, setRecords]   = useState<QualityCheck[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterSev, setFilterSev]       = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved">("all");

  const [form, setForm] = useState({
    machineId: "", issueType: "OTHER", severity: "MEDIUM" as Severity, description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(canViewAll ? "/quality-checks/all" : "/quality-checks/me");
      if (res.ok) setRecords((await res.json()) as QualityCheck[]);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const loadMachines = async () => {
    try {
      const res = await fetchAuth("/machines");
      if (res.ok) {
        const d = await res.json();
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
    } catch { /* silent */ }
  };

  useEffect(() => { void load(); void loadMachines(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const res = await fetchAuth("/quality-checks", {
        method: "POST",
        body: JSON.stringify({
          machineId: Number(form.machineId),
          issueType: form.issueType,
          severity: form.severity,
          description: form.description || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess("تم حفظ فحص الجودة بنجاح ✓");
      setForm({ machineId: "", issueType: "OTHER", severity: "MEDIUM", description: "" });
      setShowForm(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSubmitting(false); }
  };

  const openCount     = records.filter(r => !r.resolvedAt).length;
  const criticalCount = records.filter(r => r.severity === "CRITICAL").length;
  const resolvedCount = records.filter(r => !!r.resolvedAt).length;

  const filtered = records.filter(r => {
    if (filterSev && r.severity !== filterSev) return false;
    if (filterStatus === "open"     && r.resolvedAt)  return false;
    if (filterStatus === "resolved" && !r.resolvedAt) return false;
    return true;
  });

  const kpis = [
    { label: "إجمالي الفحوصات", value: records.length,  gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "✅" },
    { label: "مشاكل مفتوحة",   value: openCount,        gradient: "linear-gradient(135deg,#f59e0b,#d97706)", icon: "⚠️" },
    { label: "حرجة",      value: criticalCount,    gradient: "linear-gradient(135deg,#ef4444,#dc2626)", icon: "🚨" },
    { label: "تم الحل",      value: resolvedCount,    gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "🎯" },
  ];

  const sel = (active: boolean) => ({
    padding: ".3rem .85rem", borderRadius: 999,
    border: "1px solid var(--border-default)",
    background: active ? "var(--brand-primary,#3b82f6)" : "var(--bg-surface)",
    color: active ? "#fff" : "var(--text-secondary)",
    fontWeight: 600 as const, fontSize: ".78rem", cursor: "pointer" as const,
  });

  return (
    <ModulePageShell
      title={"فحص الجودة"}
      subtitle={"تسجيل ومتابعة مشاكل الجودة في خط الإنتاج"}
      icon={<CheckSquare size={22} />}
      actions={
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button type="button" className="auth-button auth-button--ghost" onClick={() => void load()}>
            {"تحديث"}
          </button>
          {canCreate && (
            <button type="button" className="auth-button" onClick={() => setShowForm(v => !v)}>
              <Plus size={15} />
              {showForm ? ("إلغاء") : ("فحص جديد")}
            </button>
          )}
        </div>
      }
    >
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: k.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
            <span style={{ fontSize: "1.3rem" }}>{k.icon}</span>
            <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error   && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="auth-alert"                   style={{ marginBottom: "1rem" }}>{success}</div>}

      {/* New Check form */}
      {canCreate && showForm && (
        <div style={{ background: "var(--bg-card)", border: "2px solid var(--brand-primary,#3b82f6)", borderRadius: "var(--radius-xl)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1.1rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <CheckSquare size={17} style={{ color: "var(--brand-primary)" }} />
            {"تسجيل فحص جودة جديد"}
          </h3>
          <form onSubmit={e => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>

              <label style={{ display: "flex", flexDirection: "column", gap: ".35rem", fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)" }}>
                {"الآلة *"}
                <select required value={form.machineId}
                  onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))}
                  style={{ padding: ".55rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-input)", fontSize: ".875rem" }}>
                  <option value="">{"اختر الآلة..."}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".35rem", fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)" }}>
                {"نوع المشكلة"}
                <select value={form.issueType}
                  onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}
                  style={{ padding: ".55rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-input)", fontSize: ".875rem" }}>
                  {ISSUE_TYPES.map(t => (
                    <option key={t} value={t}>{ISSUE_LABELS[t]?.ar}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".35rem", fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)" }}>
                {"مستوى الخطورة"}
                <select value={form.severity}
                  onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}
                  style={{ padding: ".55rem .75rem", border: `2px solid ${SEV_META[form.severity].color}`, borderRadius: "var(--radius-md)", background: SEV_META[form.severity].bg, fontSize: ".875rem", fontWeight: 700, color: SEV_META[form.severity].color }}>
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{SEV_META[s].ar}</option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: ".35rem", fontWeight: 600, fontSize: ".875rem", color: "var(--text-primary)" }}>
              {"وصف المشكلة والإجراءات"}
              <textarea rows={3} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={"اشرح المشكلة بالتفصيل، والإجراءات التي تم اتخاذها..."}
                style={{ padding: ".6rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-input)", fontSize: ".875rem", resize: "vertical", lineHeight: 1.55 }} />
            </label>

            <div style={{ display: "flex", gap: ".625rem" }}>
              <button type="submit" className="auth-button" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? ("جارٍ الحفظ...") : ("حفظ الفحص")}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowForm(false)}>
                {"إلغاء"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: "1.1rem", alignItems: "center" }}>
        <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".05em" }}>
          {"عرض:"}
        </span>
        <button type="button" style={sel(filterStatus === "all")}     onClick={() => setFilterStatus("all")}>     {"الكل"} ({records.length})</button>
        <button type="button" style={sel(filterStatus === "open")}    onClick={() => setFilterStatus("open")}>    {"مفتوح"} ({openCount})</button>
        <button type="button" style={sel(filterStatus === "resolved")} onClick={() => setFilterStatus("resolved")}>{"محلول"} ({resolvedCount})</button>
        <div style={{ width: 1, height: 20, background: "var(--border-default)", margin: "0 .2rem" }} />
        {SEVERITIES.map(s => (
          <button key={s} type="button"
            onClick={() => setFilterSev(filterSev === s ? "" : s)}
            style={{ padding: ".3rem .75rem", borderRadius: 999, border: `1px solid ${SEV_META[s].color}60`, background: filterSev === s ? SEV_META[s].bg : "transparent", color: filterSev === s ? SEV_META[s].color : "var(--text-secondary)", fontWeight: 700, fontSize: ".76rem", cursor: "pointer" }}>
            {SEV_META[s].ar}
          </button>
        ))}
      </div>

      {/* Records list */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "var(--bg-card)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-xl)" }}>
          <CheckSquare size={36} style={{ color: "var(--gray-300)", margin: "0 auto .75rem", display: "block" }} />
          <p style={{ margin: 0, fontWeight: 600, color: "var(--text-secondary)", fontSize: ".9rem" }}>
            {"لا توجد فحوصات"}
          </p>
          {canCreate && filterStatus === "all" && !filterSev && (
            <p style={{ margin: ".4rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
              {"انقر على 'فحص جديد' للبدء"}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {filtered.map(r => {
            const sev = SEV_META[r.severity];
            const resolved = !!r.resolvedAt;
            return (
              <div key={r.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                {/* Row header */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                  {/* Color stripe */}
                  <div style={{ width: 5, background: sev.gradient, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", padding: ".875rem 1.1rem", background: "var(--bg-surface)", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: ".95rem", color: "var(--text-primary)" }}>
                          🔧 {r.machine?.name}
                        </span>
                        <span style={{ fontSize: ".72rem", padding: ".2rem .6rem", borderRadius: 999, background: sev.bg, color: sev.color, fontWeight: 700 }}>
                          {sev.ar}
                        </span>
                        <span style={{ fontSize: ".72rem", padding: ".2rem .6rem", borderRadius: 999, background: resolved ? "#d1fae5" : "#fef3c7", color: resolved ? "#059669" : "#d97706", fontWeight: 700 }}>
                          {resolved ? ("✓ تم الحل") : ("● مفتوح")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: ".875rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
                          📋 {ISSUE_LABELS[r.issueType]?.ar}
                        </span>
                        {r.engineer && (
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
                            👷 {r.engineer.fullName}
                          </span>
                        )}
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
                          📅 {fmtDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 6, padding: ".15rem .5rem" }}>
                      #{r.id}
                    </span>
                  </div>
                </div>
                {/* Description */}
                {r.description && (
                  <div style={{ padding: ".75rem 1.25rem", borderTop: "1px solid var(--border-default)" }}>
                    <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                      {r.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
