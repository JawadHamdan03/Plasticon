import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle, Clock, AlertTriangle, Plus, X } from "lucide-react";
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

// Calibration status derived from efficiency
function calStatus(eff: number) {
  if (eff >= 90) return { label: "Valid", color: "#059669", bg: "#d1fae5", Icon: CheckCircle };
  if (eff >= 75) return { label: "Due Soon", color: "#d97706", bg: "#fef3c7", Icon: Clock };
  return { label: "Expired", color: "#dc2626", bg: "#fee2e2", Icon: AlertTriangle };
}

function nextDue(date: string) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString();
}

const OP_STATUSES = [
  { value: "OPERATIONAL", label: "Fully Calibrated" },
  { value: "MAINTENANCE", label: "Calibration Needed" },
  { value: "BROKEN",      label: "Failed Calibration" },
  { value: "OFFLINE",     label: "Out of Service" },
];

const emptyForm = () => ({ machineId: "", operationalStatus: "OPERATIONAL", efficiencyRating: "100", maintenanceHours: "0", downtimePercentage: "0", notes: "" });

export default function EquipmentCalibration() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isEngineer = user?.role === "ENGINEER";
  const isAdmin = user?.role === "ADMIN";
  const canAdd = isEngineer || isAdmin;

  const [records, setRecords] = useState<HealthRecord[]>([]);
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
      const [rRes, mRes] = await Promise.all([apiFetch("/machine-health"), apiFetch("/machines")]);
      if (rRes.ok) { const d = await rRes.json(); setRecords(Array.isArray(d) ? d : (d.data ?? [])); }
      if (mRes.ok) { const d = await mRes.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
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
      setSuccess(nav("Calibration record saved", "تم حفظ سجل المعايرة"));
      setForm(emptyForm());
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const validCount   = records.filter(r => calStatus(r.efficiencyRating).label === "Valid").length;
  const dueCount     = records.filter(r => calStatus(r.efficiencyRating).label === "Due Soon").length;
  const expiredCount = records.filter(r => calStatus(r.efficiencyRating).label === "Expired").length;

  return (
    <ModulePageShell
      title={nav("Equipment Calibration", "معايرة المعدات")}
      subtitle={nav("Log and track equipment calibration records", "تسجيل وتتبع سجلات معايرة المعدات")}
      icon={<CheckCircle size={22} />}
      actions={canAdd ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Log Calibration", "تسجيل معايرة")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Valid", "صحيح"), value: validCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Due Soon", "قيد الانتظار"), value: dueCount, icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Expired", "منتهي الصلاحية"), value: expiredCount, icon: "❌", color: "#dc2626", bg: "#fee2e2" },
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
      {canAdd && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("New Calibration Record", "سجل معايرة جديد")}</h3>
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
              <label>{nav("Calibration Result", "نتيجة المعايرة")}
                <select className="input" value={form.operationalStatus} onChange={e => setForm(p => ({ ...p, operationalStatus: e.target.value }))}>
                  {OP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label>{nav("Calibration Score (%)", "نتيجة المعايرة (%)")}
                <input type="number" min={0} max={100} className="input" value={form.efficiencyRating} onChange={e => setForm(p => ({ ...p, efficiencyRating: e.target.value }))} />
              </label>
              <label>{nav("Hours Spent", "الساعات المستغرقة")} *
                <input type="number" min={0} step="0.5" className="input" value={form.maintenanceHours} onChange={e => setForm(p => ({ ...p, maintenanceHours: e.target.value }))} required />
              </label>
              <label>{nav("Downtime (%)", "نسبة التوقف (%)")} *
                <input type="number" min={0} max={100} className="input" value={form.downtimePercentage} onChange={e => setForm(p => ({ ...p, downtimePercentage: e.target.value }))} required />
              </label>
            </div>
            <label>{nav("Notes", "ملاحظات")}
              <textarea rows={2} className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={nav("Calibration notes...", "ملاحظات المعايرة...")} />
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
          ) : records.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
              <CheckCircle size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
              <p style={{ fontWeight: 600 }}>{nav("No calibration records yet", "لا توجد سجلات معايرة بعد")}</p>
              {canAdd && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Log Calibration' to add a record", "انقر على 'تسجيل معايرة' لإضافة سجل")}</p>}
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Calibrated On", "تاريخ المعايرة")}</th>
                  <th>{nav("Next Due", "الموعد التالي")}</th>
                  <th>{nav("Score", "النتيجة")}</th>
                  <th>{nav("Status", "الحالة")}</th>
                  <th>{nav("By", "بواسطة")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const s = calStatus(r.efficiencyRating);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.machine?.name ?? `#${r.machineId}`}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{new Date(r.recordedAt).toLocaleDateString()}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{nextDue(r.recordedAt)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <div style={{ width: 48, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${r.efficiencyRating}%`, background: s.color }} />
                          </div>
                          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{r.efficiencyRating}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: s.bg, color: s.color }}>
                          <s.Icon size={11} />
                          {s.label}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{r.recordedBy?.fullName ?? "—"}</td>
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
