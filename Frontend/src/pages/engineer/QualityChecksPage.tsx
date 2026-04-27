import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";

type Machine = { id: number; name: string; type?: string };
type QualityCheck = {
  id: number;
  issueType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string | null;
  resolvedAt: string | null;
  createdAt: string;
  machine: { id: number; name: string };
  engineer?: { id: number; fullName: string; username: string };
};

async function fetchAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

const ISSUE_TYPES = [
  "DIMENSIONAL",
  "SURFACE_DEFECT",
  "MATERIAL_FAULT",
  "PROCESS_DEVIATION",
  "CONTAMINATION",
  "ASSEMBLY_ERROR",
  "OTHER",
];
const SEVERITIES: QualityCheck["severity"][] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

function severityClass(s: QualityCheck["severity"]) {
  return {
    LOW: "quality-severity quality-severity--low",
    MEDIUM: "quality-severity quality-severity--medium",
    HIGH: "quality-severity quality-severity--high",
    CRITICAL: "quality-severity quality-severity--critical",
  }[s];
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

export function QualityChecksPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const role = String(user?.role ?? "WORKER").toUpperCase();
  const isAdmin = role === "ADMIN";
  const canViewAll = ["ADMIN", "ACCOUNTANT"].includes(role);
  const canCreate = !isAdmin;

  const [records, setRecords] = useState<QualityCheck[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    machineId: "",
    issueType: "OTHER",
    severity: "MEDIUM" as QualityCheck["severity"],
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const t = {
    title: isAr ? "فحص الجودة" : "Quality Checks",
    subtitle: isAr
      ? "تسجيل ومتابعة مشاكل الجودة في خط الإنتاج"
      : "Log and track quality issues on the production line",
    newCheck: isAr ? "فحص جديد" : "New Check",
    machine: isAr ? "الآلة" : "Machine",
    issueType: isAr ? "نوع المشكلة" : "Issue Type",
    severity: isAr ? "الخطورة" : "Severity",
    description: isAr ? "الوصف" : "Description",
    save: isAr ? "حفظ" : "Save",
    cancel: isAr ? "إلغاء" : "Cancel",
    history: isAr ? "سجل الفحوصات" : "Checks History",
    noRecords: isAr ? "لا توجد فحوصات بعد" : "No quality checks yet",
    resolved: isAr ? "تم الحل" : "Resolved",
    open: isAr ? "مفتوح" : "Open",
    kpiTotal: isAr ? "إجمالي الفحوصات" : "Total Checks",
    kpiOpen: isAr ? "مشاكل مفتوحة" : "Open Issues",
    kpiCritical: isAr ? "حرجة" : "Critical",
    kpiResolved: isAr ? "تم الحل" : "Resolved",
    engineer: isAr ? "المهندس" : "Engineer",
    refresh: isAr ? "تحديث" : "Refresh",
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = canViewAll
        ? "/quality-checks/all"
        : "/quality-checks/me";
      const res = await fetchAuth(endpoint);
      if (!res.ok) throw new Error(await readApiError(res));
      setRecords((await res.json()) as QualityCheck[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load quality checks",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const res = await fetchAuth("/machines");
      if (res.ok) {
        const d = (await res.json()) as
          | { items?: Machine[]; data?: Machine[] }
          | Machine[];
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void load();
    void loadMachines();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
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
      setSuccess(
        isAr ? "تم حفظ فحص الجودة بنجاح" : "Quality check saved successfully",
      );
      setForm({
        machineId: "",
        issueType: "OTHER",
        severity: "MEDIUM",
        description: "",
      });
      setShowForm(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save quality check");
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = records.filter((r) => !r.resolvedAt).length;
  const criticalCount = records.filter((r) => r.severity === "CRITICAL").length;
  const resolvedCount = records.filter((r) => r.resolvedAt).length;

  return (
    <div className="maintenance-page">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: ".75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".12em",
              color: "var(--text-secondary)",
            }}
          >
            {isAr ? "بلاستيكون" : "Plasticon"}
          </p>
          <h1
            style={{
              margin: ".3rem 0 .25rem",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
            }}
          >
            <CheckSquare size={22} style={{ color: "var(--brand-primary)" }} />
            {t.title}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: ".875rem",
              color: "var(--text-secondary)",
            }}
          >
            {t.subtitle}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".625rem" }}>
          <button
            className="auth-button auth-button--ghost"
            type="button"
            onClick={() => void load()}
          >
            {t.refresh}
          </button>
          {canCreate && (
            <button
              className="auth-button"
              type="button"
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus size={15} /> {t.newCheck}
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="maintenance-kpi-strip">
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiTotal}</span>
          <span className="maintenance-kpi__value">{records.length}</span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiOpen}</span>
          <span
            className="maintenance-kpi__value"
            style={{ color: openCount > 0 ? "var(--orange-500)" : undefined }}
          >
            {openCount}
          </span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiCritical}</span>
          <span
            className="maintenance-kpi__value"
            style={{ color: criticalCount > 0 ? "var(--red-600)" : undefined }}
          >
            {criticalCount}
          </span>
        </div>
        <div className="maintenance-kpi">
          <span className="maintenance-kpi__label">{t.kpiResolved}</span>
          <span
            className="maintenance-kpi__value"
            style={{ color: "var(--green-600)" }}
          >
            {resolvedCount}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            padding: ".75rem 1rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--red-50)",
            border: "1px solid var(--red-100)",
            color: "var(--red-700)",
            fontSize: ".875rem",
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
          }}
        >
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: ".75rem 1rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--green-50)",
            border: "1px solid var(--green-100)",
            color: "var(--green-700)",
            fontSize: ".875rem",
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
          }}
        >
          <CheckCircle size={15} /> {success}
        </div>
      )}

      <div className="maintenance-grid">
        {/* History list */}
        <div className="maintenance-card">
          <div className="maintenance-card__head">
            <p className="maintenance-card__title">
              {t.history}
              <span
                style={{
                  marginLeft: ".5rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "999px",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  padding: ".1rem .5rem",
                  color: "var(--text-secondary)",
                }}
              >
                {records.length}
              </span>
            </p>
          </div>
          <div
            className="maintenance-card__body"
            style={{ display: "grid", gap: ".625rem" }}
          >
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
              </div>
            ) : records.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <Activity
                  size={36}
                  style={{
                    color: "var(--gray-300)",
                    margin: "0 auto .75rem",
                    display: "block",
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: ".9rem",
                  }}
                >
                  {t.noRecords}
                </p>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="maintenance-report-item">
                  <div className="maintenance-report-item__header">
                    <span className="maintenance-report-item__machine">
                      {r.machine?.name ?? `#${r.id}`}
                    </span>
                    <span className="maintenance-report-item__date">
                      {fmtDate(r.createdAt)}
                    </span>
                  </div>
                  <p className="maintenance-report-item__parts">
                    {isAr ? "نوع: " : "Type: "}
                    <strong>{r.issueType.replace(/_/g, " ")}</strong>
                  </p>
                  <div className="maintenance-report-item__meta">
                    <span className={severityClass(r.severity)}>
                      {r.severity}
                    </span>
                    {r.resolvedAt ? (
                      <span
                        style={{
                          fontSize: ".72rem",
                          color: "var(--green-600)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".2rem",
                        }}
                      >
                        <CheckCircle size={11} /> {t.resolved}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: ".72rem",
                          color: "var(--orange-500)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".2rem",
                        }}
                      >
                        <Clock size={11} /> {t.open}
                      </span>
                    )}
                    {r.engineer && (
                      <span
                        style={{
                          fontSize: ".72rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {t.engineer}: {r.engineer.fullName}
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p
                      style={{
                        margin: ".375rem 0 0",
                        fontSize: ".82rem",
                        color: "var(--text-secondary)",
                        background: "var(--bg-surface)",
                        padding: ".5rem .75rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-default)",
                        lineHeight: 1.55,
                      }}
                    >
                      {r.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create form */}
        {canCreate && showForm ? (
          <div className="maintenance-card">
            <div className="maintenance-card__head">
              <p className="maintenance-card__title">{t.newCheck}</p>
            </div>
            <div className="maintenance-card__body">
              <form className="module-form" onSubmit={(e) => void submit(e)}>
                <label>
                  {t.machine}
                  <select
                    value={form.machineId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, machineId: e.target.value }))
                    }
                    required
                  >
                    <option value="">
                      {isAr ? "اختر الآلة..." : "Select machine..."}
                    </option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {t.issueType}
                  <select
                    value={form.issueType}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, issueType: e.target.value }))
                    }
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {t.severity}
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        severity: e.target.value as QualityCheck["severity"],
                      }))
                    }
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {t.description}
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder={
                      isAr
                        ? "وصف المشكلة والإجراءات المتخذة..."
                        : "Describe the issue and actions taken..."
                    }
                  />
                </label>

                <div style={{ display: "flex", gap: ".625rem" }}>
                  <button
                    type="submit"
                    className="auth-button"
                    style={{ flex: 1 }}
                    disabled={submitting}
                  >
                    {submitting
                      ? isAr
                        ? "جارٍ الحفظ..."
                        : "Saving..."
                      : t.save}
                  </button>
                  <button
                    type="button"
                    className="auth-button auth-button--ghost"
                    onClick={() => setShowForm(false)}
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div
            className="maintenance-card"
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "200px",
              cursor: "pointer",
              border: "2px dashed var(--border-default)",
              background: "transparent",
              boxShadow: "none",
            }}
            onClick={() => setShowForm(true)}
          >
            <div
              style={{ textAlign: "center", color: "var(--text-secondary)" }}
            >
              <Plus
                size={28}
                style={{
                  margin: "0 auto .5rem",
                  color: "var(--brand-primary)",
                  display: "block",
                }}
              />
              <p style={{ margin: 0, fontWeight: 600, fontSize: ".875rem" }}>
                {t.newCheck}
              </p>
              <p style={{ margin: ".25rem 0 0", fontSize: ".78rem" }}>
                {isAr
                  ? "انقر لتسجيل فحص جودة جديد"
                  : "Click to log a new quality check"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
