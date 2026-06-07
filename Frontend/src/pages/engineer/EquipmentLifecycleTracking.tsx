import { useEffect, useState, type FormEvent } from "react";
import { Zap, Plus, X } from "lucide-react";
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
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

interface Machine { id: number; name: string; type: string }
interface HealthRecord {
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  recordedBy?: { id: number; fullName: string };
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage: number;
  notes?: string | null;
  recordedAt: string;
}

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  OPERATIONAL:        { color: "#059669", bg: "#d1fae5", label: "Operational" },
  MAINTENANCE:        { color: "#d97706", bg: "#fef3c7", label: "Under Maintenance" },
  BROKEN:             { color: "#dc2626", bg: "#fee2e2", label: "Broken" },
  OFFLINE:            { color: "#6b7280", bg: "#f3f4f6", label: "Offline" },
  UNDER_MAINTENANCE:  { color: "#d97706", bg: "#fef3c7", label: "Under Maintenance" },
};
const OP_STATUSES = ["OPERATIONAL", "MAINTENANCE", "BROKEN", "OFFLINE"];

const emptyForm = () => ({ machineId: "", operationalStatus: "OPERATIONAL", efficiencyRating: "100", maintenanceHours: "0", downtimePercentage: "0", notes: "" });

export default function EquipmentLifecycleTracking() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isEngineer = user?.role === "ENGINEER";
  const isAdmin = user?.role === "ADMIN";
  const canAdd = isEngineer || isAdmin;

  const [machines, setMachines] = useState<Machine[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
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
      const [machRes, recRes] = await Promise.all([
        apiFetch("/machines"),
        apiFetch("/machine-health"),
      ]);
      if (machRes.ok) { const d = await machRes.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
      if (recRes.ok) { const d = await recRes.json(); setRecords(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.machineId) { setError(nav("Select a machine", "اختر آلة")); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/machine-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: Number(form.machineId),
          operationalStatus: form.operationalStatus,
          efficiencyRating: Number(form.efficiencyRating),
          maintenanceHours: Number(form.maintenanceHours),
          downtimePercentage: Number(form.downtimePercentage),
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(nav("Lifecycle record saved", "تم حفظ سجل دورة الحياة"));
      setForm(emptyForm());
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const operationalCount = records.filter(r => r.operationalStatus === "OPERATIONAL").length;
  const maintenanceCount = records.filter(r => r.operationalStatus === "MAINTENANCE" || r.operationalStatus === "UNDER_MAINTENANCE").length;
  const brokenCount = records.filter(r => r.operationalStatus === "BROKEN" || r.operationalStatus === "OFFLINE").length;

  return (
    <ModulePageShell
      title={nav("Equipment Lifecycle", "دورة حياة المعدات")}
      subtitle={nav("Monitor and log equipment lifecycle events", "مراقبة وتسجيل أحداث دورة حياة المعدات")}
      icon={<Zap size={22} />}
      actions={canAdd ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Add Record", "إضافة سجل")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: nav("Operational",     "تشغيلي"),               value: operationalCount,  gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: nav("In Maintenance",  "في الصيانة"),            value: maintenanceCount,  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: nav("Broken/Offline",  "معطل / غير متصل"),      value: brokenCount,       gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {canAdd && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("New Lifecycle Record", "سجل دورة حياة جديد")}</h3>
          {error && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          {success && <div className="auth-alert mb-3">{success}</div>}
          <form className="module-form" onSubmit={e => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <label>{nav("Machine", "الآلة")} *
                <select className="input" value={form.machineId} onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))} required>
                  <option value="">{nav("Select machine...", "اختر الآلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>{nav("Operational Status", "الحالة التشغيلية")} *
                <select className="input" value={form.operationalStatus} onChange={e => setForm(p => ({ ...p, operationalStatus: e.target.value }))}>
                  {OP_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
                </select>
              </label>
              <label>{nav("Efficiency Rating (%)", "تقييم الكفاءة (%)")}
                <input type="number" min={0} max={100} className="input" value={form.efficiencyRating} onChange={e => setForm(p => ({ ...p, efficiencyRating: e.target.value }))} />
              </label>
              <label>{nav("Maintenance Hours", "ساعات الصيانة")} *
                <input type="number" min={0} className="input" value={form.maintenanceHours} onChange={e => setForm(p => ({ ...p, maintenanceHours: e.target.value }))} required />
              </label>
              <label>{nav("Downtime (%)", "نسبة التوقف (%)")} *
                <input type="number" min={0} max={100} className="input" value={form.downtimePercentage} onChange={e => setForm(p => ({ ...p, downtimePercentage: e.target.value }))} required />
              </label>
            </div>
            <label>{nav("Notes", "ملاحظات")}
              <textarea rows={2} className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={nav("Optional notes...", "ملاحظات اختيارية...")} />
            </label>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Record", "حفظ السجل")}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{nav("Cancel", "إلغاء")}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Records table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
              <Zap size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
              <p style={{ fontWeight: 600 }}>{nav("No lifecycle records yet", "لا توجد سجلات دورة حياة بعد")}</p>
              {canAdd && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Add Record' to log a lifecycle event", "انقر على 'إضافة سجل' لتسجيل حدث دورة حياة")}</p>}
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                  <th>{nav("Efficiency", "الكفاءة")}</th>
                  <th>{nav("Maint. Hours", "ساعات الصيانة")}</th>
                  <th>{nav("Downtime", "التوقف")}</th>
                  <th>{nav("Recorded By", "سُجِّل بواسطة")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const meta = STATUS_META[r.operationalStatus] ?? STATUS_META.OPERATIONAL;
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.machine?.name ?? `#${r.machineId}`}</td>
                      <td>
                        <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <div style={{ width: 48, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${r.efficiencyRating}%`, background: r.efficiencyRating >= 80 ? "#10b981" : r.efficiencyRating >= 60 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{r.efficiencyRating}%</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{r.maintenanceHours}h</td>
                      <td style={{ color: "var(--text-secondary)" }}>{r.downtimePercentage}%</td>
                      <td style={{ color: "var(--text-secondary)" }}>{r.recordedBy?.fullName ?? "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{new Date(r.recordedAt).toLocaleDateString()}</td>
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
