import { useEffect, useState, type FormEvent } from "react";
import { TrendingUp, Plus, X, AlertTriangle, CheckCircle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

interface Machine { id: number; name: string; type: string }
interface QualityCheck {
  id: number; machineId: number;
  machine?: { id: number; name: string };
  issueType: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description?: string | null; resolvedAt?: string | null;
  createdAt: string;
  engineer?: { id: number; fullName: string };
}

const ISSUE_TYPES = ["DIMENSIONAL", "SURFACE_DEFECT", "MATERIAL_FAULT", "PROCESS_DEVIATION", "CONTAMINATION", "ASSEMBLY_ERROR", "OTHER"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const SEV_META: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: "#dc2626", bg: "#fee2e2" },
  HIGH:     { color: "#ea580c", bg: "#ffedd5" },
  MEDIUM:   { color: "#d97706", bg: "#fef3c7" },
  LOW:      { color: "#059669", bg: "#d1fae5" },
};

const emptyForm = () => ({ machineId: "", issueType: "OTHER", severity: "MEDIUM" as typeof SEVERITIES[number], description: "" });

export default function QualityTrendReports() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isAr = locale === "ar";
  const role = user?.role ?? "";
  const isEngineer = role === "ENGINEER";
  const canViewAll = role === "ADMIN" || role === "ACCOUNTANT";

  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = canViewAll ? "/quality-checks/all" : "/quality-checks/me";
      const [qRes, mRes] = await Promise.all([
        apiFetch(endpoint),
        isEngineer ? apiFetch("/machines") : Promise.resolve(null),
      ]);
      if (qRes.ok) { const d = await qRes.json(); setChecks(Array.isArray(d) ? d : (d.data ?? [])); }
      if (mRes?.ok) { const d = await mRes.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.machineId) { setError(nav("Select a machine", "اختر آلة")); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/quality-checks", {
        method: "POST",
        body: JSON.stringify({
          machineId: Number(form.machineId),
          issueType: form.issueType,
          severity: form.severity,
          description: form.description || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(nav("Quality check saved", "تم حفظ فحص الجودة"));
      setForm(emptyForm());
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const passCount = checks.filter(c => c.resolvedAt).length;
  const openCount = checks.filter(c => !c.resolvedAt).length;
  const criticalCount = checks.filter(c => c.severity === "CRITICAL").length;

  return (
    <ModulePageShell
      title={nav("Quality Trends", "اتجاهات الجودة")}
      subtitle={nav("Track and log quality issues on the production line", "تتبع وتسجيل مشاكل الجودة في خط الإنتاج")}
      icon={<TrendingUp size={22} />}
      actions={isEngineer ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Log Issue", "تسجيل مشكلة")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Checks", "إجمالي الفحوصات"), value: checks.length, icon: "📋", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Open Issues", "مشاكل مفتوحة"), value: openCount, icon: "⚠️", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Critical", "حرجة"), value: criticalCount, icon: "🚨", color: "#dc2626", bg: "#fee2e2" },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{k.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Add form */}
      {isEngineer && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("Log Quality Issue", "تسجيل مشكلة جودة")}</h3>
          {error && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          {success && <div className="auth-alert mb-3">{success}</div>}
          <form className="module-form" onSubmit={e => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>{nav("Machine", "الآلة")} *
                <select className="input" value={form.machineId} onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))} required>
                  <option value="">{nav("Select machine...", "اختر الآلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>{nav("Issue Type", "نوع المشكلة")}
                <select className="input" value={form.issueType} onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}>
                  {ISSUE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </label>
              <label>{nav("Severity", "الخطورة")}
                <select className="input" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as typeof SEVERITIES[number] }))}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label>{nav("Description", "الوصف")}
              <textarea rows={3} className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={nav("Describe the issue...", "اوصف المشكلة...")} />
            </label>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save", "حفظ")}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{nav("Cancel", "إلغاء")}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : checks.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
              <TrendingUp size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
              <p style={{ fontWeight: 600 }}>{nav("No quality checks yet", "لا توجد فحوصات جودة بعد")}</p>
              {isEngineer && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Log Issue' to record a quality check", "انقر على 'تسجيل مشكلة' لتسجيل فحص الجودة")}</p>}
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Issue Type", "نوع المشكلة")}</th>
                  <th>{nav("Severity", "الخطورة")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                  {canViewAll && <th>{nav("Engineer", "المهندس")}</th>}
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {checks.map(c => {
                  const sevMeta = SEV_META[c.severity] ?? SEV_META.LOW;
                  const resolved = !!c.resolvedAt;
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.machine?.name ?? `#${c.machineId}`}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{c.issueType.replace(/_/g, " ")}</td>
                      <td>
                        <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: sevMeta.bg, color: sevMeta.color }}>{c.severity}</span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".78rem", fontWeight: 600, color: resolved ? "#059669" : "#d97706" }}>
                          {resolved ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                          {resolved ? nav("Resolved", "تم الحل") : nav("Open", "مفتوح")}
                        </span>
                      </td>
                      {canViewAll && <td style={{ color: "var(--text-secondary)" }}>{c.engineer?.fullName ?? "—"}</td>}
                      <td style={{ color: "var(--text-secondary)" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
