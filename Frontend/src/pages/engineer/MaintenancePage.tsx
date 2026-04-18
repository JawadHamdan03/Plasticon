import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { Wrench, Plus, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

type Machine = { id: number; name: string; type?: string };
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

async function fetchAuth(path: string, options?: RequestInit) {
  const token = localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

function downtimeBadgeClass(mins: number | null) {
  if (!mins || mins < 30) return "maintenance-downtime-badge maintenance-downtime-badge--low";
  if (mins < 90) return "maintenance-downtime-badge maintenance-downtime-badge--mid";
  return "maintenance-downtime-badge maintenance-downtime-badge--high";
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

const DOWNTIME_REASONS = [
  "BELT_FAILURE", "MOTOR_ISSUE", "HYDRAULIC_FAILURE", "SEAL_LEAK",
  "ELECTRICAL", "SENSOR_MALFUNCTION", "SCHEDULED_MAINTENANCE", "OTHER",
];

export function MaintenancePage() {
  const { user } = useAuth();
  const { locale } = useLocale();

  const role = String(user?.role ?? "WORKER").toUpperCase();
  const canCreate = ["ENGINEER", "WORKER", "ADMIN"].includes(role);
  const canViewAll = ["ADMIN", "ACCOUNTANT"].includes(role);

  const [records, setRecords] = useState<Maintenance[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    machineId: "",
    partsUsed: "",
    downtimeMinutes: "",
    downtimeReason: "OTHER",
    reportText: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = canViewAll ? "/maintenance/all" : "/maintenance/me";
      const res = await fetchAuth(endpoint);
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json() as Maintenance[];
      setRecords(data);
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
        const d = await res.json() as { items?: Machine[]; data?: Machine[] } | Machine[];
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
    } catch { /* ignore */ }
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
      setSuccess(locale === "ar" ? "تم إنشاء تقرير الصيانة بنجاح" : "Maintenance report created successfully");
      setForm({ machineId: "", partsUsed: "", downtimeMinutes: "", downtimeReason: "OTHER", reportText: "" });
      setShowForm(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  /* KPIs */
  const total = records.length;
  const urgentCount = records.filter(r => (r.downtimeMinutes ?? 0) >= 60).length;
  const totalDowntime = records.reduce((acc, r) => acc + (r.downtimeMinutes ?? 0), 0);
  const uniqueMachines = new Set(records.map(r => r.machine?.id)).size;

  const t = {
    title:        locale === "ar" ? "الصيانة" : "Maintenance",
    subtitle:     locale === "ar" ? "تقارير الصيانة والجرد الشهري" : "Maintenance reports & monthly inventory",
    newReport:    locale === "ar" ? "تقرير جديد" : "New Report",
    machine:      locale === "ar" ? "الآلة" : "Machine",
    partsUsed:    locale === "ar" ? "القطع المستخدمة" : "Parts Used",
    downtime:     locale === "ar" ? "وقت التوقف (دقيقة)" : "Downtime (min)",
    reason:       locale === "ar" ? "سبب التوقف" : "Downtime Reason",
    reportText:   locale === "ar" ? "تفاصيل التقرير" : "Report Details",
    submit:       locale === "ar" ? "حفظ التقرير" : "Save Report",
    cancel:       locale === "ar" ? "إلغاء" : "Cancel",
    history:      locale === "ar" ? "سجل الصيانة" : "Maintenance History",
    noRecords:    locale === "ar" ? "لا توجد تقارير بعد" : "No reports yet",
    loading:      locale === "ar" ? "جاري التحميل..." : "Loading...",
    kpiTotal:     locale === "ar" ? "إجمالي التقارير" : "Total Reports",
    kpiUrgent:    locale === "ar" ? "توقف حرج" : "Critical Stops",
    kpiDowntime:  locale === "ar" ? "إجمالي وقت التوقف" : "Total Downtime",
    kpiMachines:  locale === "ar" ? "آلات متأثرة" : "Machines Affected",
    minutes:      locale === "ar" ? "دقيقة" : "min",
    engineer:     locale === "ar" ? "المهندس" : "Engineer",
  };

  return (
    <div className="maintenance-page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-secondary)" }}>
            {locale === "ar" ? "بلاستيكون" : "Plasticon"}
          </p>
          <h1 style={{ margin: ".3rem 0 .25rem", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <Wrench size={22} style={{ color: "var(--brand-primary)" }} />
            {t.title}
          </h1>
          <p style={{ margin: 0, fontSize: ".875rem", color: "var(--text-secondary)" }}>{t.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: ".625rem", flexWrap: "wrap" }}>
          <button className="auth-button auth-button--ghost" type="button" onClick={() => void load()}>
            {locale === "ar" ? "تحديث" : "Refresh"}
          </button>
          {canCreate && (
            <button className="auth-button" type="button" onClick={() => setShowForm(v => !v)}>
              <Plus size={15} />
              {t.newReport}
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="maintenance-kpi-strip">
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiTotal}</span>
          <span className="maintenance-kpi__value">{total}</span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiUrgent}</span>
          <span className="maintenance-kpi__value" style={{ color: urgentCount > 0 ? "var(--red-600)" : undefined }}>{urgentCount}</span>
          <span className="maintenance-kpi__sub">{locale === "ar" ? "≥ 60 دقيقة توقف" : "≥ 60 min downtime"}</span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiDowntime}</span>
          <span className="maintenance-kpi__value">{totalDowntime}</span>
          <span className="maintenance-kpi__sub">{t.minutes}</span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiMachines}</span>
          <span className="maintenance-kpi__value">{uniqueMachines}</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--red-50)", border: "1px solid var(--red-100)", color: "var(--red-700)", fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <AlertTriangle size={15} />{error}
        </div>
      )}
      {success && (
        <div style={{ padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--green-50)", border: "1px solid var(--green-100)", color: "var(--green-700)", fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <CheckCircle size={15} />{success}
        </div>
      )}

      <div className="maintenance-grid">
        {/* History list */}
        <div className="maintenance-card">
          <div className="maintenance-card__head">
            <p className="maintenance-card__title">
              {t.history}
              <span style={{ marginLeft: ".5rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", fontSize: ".72rem", fontWeight: 700, padding: ".1rem .5rem", color: "var(--text-secondary)" }}>
                {total}
              </span>
            </p>
          </div>
          <div className="maintenance-card__body" style={{ display: "grid", gap: ".625rem" }}>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
              </div>
            ) : records.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <Wrench size={36} style={{ color: "var(--gray-300)", margin: "0 auto .75rem" }} />
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".9rem" }}>{t.noRecords}</p>
              </div>
            ) : records.map(r => (
              <div key={r.id} className="maintenance-report-item">
                <div className="maintenance-report-item__header">
                  <span className="maintenance-report-item__machine">{r.machine?.name ?? `Machine #${r.machineId ?? r.id}`}</span>
                  <span className="maintenance-report-item__date">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="maintenance-report-item__parts">{locale === "ar" ? "القطع: " : "Parts: "}<strong>{r.partsUsed}</strong></p>
                <div className="maintenance-report-item__meta">
                  {r.downtimeMinutes != null && (
                    <span className={downtimeBadgeClass(r.downtimeMinutes)}>
                      <Clock size={10} />
                      {r.downtimeMinutes} {t.minutes}
                    </span>
                  )}
                  <span style={{ fontSize: ".72rem", color: "var(--text-tertiary)", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", padding: ".1rem .45rem" }}>
                    {r.downtimeReason?.replace(/_/g, " ")}
                  </span>
                  {r.engineer && (
                    <span style={{ fontSize: ".72rem", color: "var(--text-tertiary)" }}>
                      {t.engineer}: {r.engineer.fullName}
                    </span>
                  )}
                  {r.reportText && (
                    <button
                      type="button"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand-primary)", fontSize: ".72rem", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: ".2rem" }}
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      {expandedId === r.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {locale === "ar" ? "التفاصيل" : "Details"}
                    </button>
                  )}
                </div>
                {expandedId === r.id && r.reportText && (
                  <p style={{ margin: ".375rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)", background: "var(--bg-surface)", padding: ".625rem .75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", lineHeight: 1.55 }}>
                    {r.reportText}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create form */}
        {canCreate && showForm && (
          <div className="maintenance-card">
            <div className="maintenance-card__head">
              <p className="maintenance-card__title">{t.newReport}</p>
            </div>
            <div className="maintenance-card__body">
              <form className="module-form" onSubmit={(e) => void submit(e)}>
                <label>
                  {t.machine}
                  <select
                    value={form.machineId}
                    onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))}
                    required
                  >
                    <option value="">{locale === "ar" ? "اختر الآلة..." : "Select machine..."}</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  {t.partsUsed}
                  <input
                    type="text"
                    value={form.partsUsed}
                    onChange={e => setForm(p => ({ ...p, partsUsed: e.target.value }))}
                    placeholder={locale === "ar" ? "مثال: بكرة، مضخة، مشعب..." : "e.g. belt, pump, manifold..."}
                    required
                  />
                </label>

                <label>
                  {t.downtime}
                  <input
                    type="number"
                    min={0}
                    value={form.downtimeMinutes}
                    onChange={e => setForm(p => ({ ...p, downtimeMinutes: e.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label>
                  {t.reason}
                  <select
                    value={form.downtimeReason}
                    onChange={e => setForm(p => ({ ...p, downtimeReason: e.target.value }))}
                  >
                    {DOWNTIME_REASONS.map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </label>

                <label>
                  {t.reportText}
                  <textarea
                    rows={4}
                    value={form.reportText}
                    onChange={e => setForm(p => ({ ...p, reportText: e.target.value }))}
                    placeholder={locale === "ar" ? "تفاصيل إضافية عن الصيانة..." : "Additional details about the maintenance..."}
                  />
                </label>

                <div style={{ display: "flex", gap: ".625rem" }}>
                  <button type="submit" className="auth-button" style={{ flex: 1 }}>
                    {t.submit}
                  </button>
                  <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowForm(false)}>
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Prompt to open form if hidden */}
        {canCreate && !showForm && (
          <div className="maintenance-card" style={{ display: "grid", placeItems: "center", minHeight: "200px", cursor: "pointer", border: "2px dashed var(--border-default)", background: "transparent", boxShadow: "none" }}
            onClick={() => setShowForm(true)}
          >
            <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              <Plus size={28} style={{ margin: "0 auto .5rem", color: "var(--brand-primary)" }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: ".875rem" }}>{t.newReport}</p>
              <p style={{ margin: ".25rem 0 0", fontSize: ".78rem" }}>{locale === "ar" ? "انقر لإضافة تقرير صيانة" : "Click to add maintenance report"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
