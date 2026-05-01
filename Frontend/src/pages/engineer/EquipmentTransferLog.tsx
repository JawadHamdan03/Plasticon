import { useEffect, useState, type FormEvent } from "react";
import { History, Plus, X } from "lucide-react";
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

interface Machine { id: number; name: string; type?: string }
interface Shift  { id: number; name: string }
interface Transfer {
  id: number; machineId: number;
  machine?: { id: number; name: string; type?: string };
  partsUsed: string; downtimeReason: string; downtimeMinutes?: number | null;
  reportText?: string | null; createdAt: string;
  engineer?: { id: number; fullName: string };
}

const DOWNTIME_REASONS = [
  "BELT_FAILURE","MOTOR_ISSUE","HYDRAULIC_FAILURE","SEAL_LEAK",
  "ELECTRICAL","SENSOR_MALFUNCTION","SCHEDULED_MAINTENANCE","OTHER",
];

const emptyForm = () => ({ machineId: "", shiftId: "", partsUsed: "", downtimeMinutes: "", downtimeReason: "OTHER", reportText: "" });

export default function EquipmentTransferLog() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isEngineer = user?.role === "ENGINEER";
  const isAdmin = user?.role === "ADMIN";

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
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
      const [tRes, mRes, sRes] = await Promise.all([
        apiFetch("/maintenance/all"),
        apiFetch("/machines"),
        apiFetch("/shifts"),
      ]);
      if (tRes.ok) { const d = await tRes.json(); setTransfers(Array.isArray(d) ? d : (d.data ?? [])); }
      if (mRes.ok) { const d = await mRes.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
      if (sRes.ok) { const d = await sRes.json(); setShifts(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.machineId) { setError(nav("Select a machine", "اختر آلة")); return; }
    if (!form.partsUsed.trim()) { setError(nav("Parts used is required", "القطع المستخدمة مطلوبة")); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        machineId: Number(form.machineId),
        partsUsed: form.partsUsed.trim(),
        downtimeReason: form.downtimeReason,
        reportText: form.reportText || undefined,
      };
      if (form.downtimeMinutes) body.downtimeMinutes = Number(form.downtimeMinutes);
      if (form.shiftId) body.shiftId = Number(form.shiftId);

      const res = await apiFetch("/maintenance", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(nav("Transfer/service record saved", "تم حفظ سجل النقل/الخدمة"));
      setForm(emptyForm());
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const uniqueMachines = new Set(transfers.map(t => t.machineId)).size;
  const withPartsCount = transfers.filter(t => t.partsUsed?.trim()).length;

  return (
    <ModulePageShell
      title={nav("Equipment Transfer Log", "سجل نقل المعدات")}
      subtitle={nav("Log and track equipment service and transfer events", "تسجيل وتتبع أحداث خدمة ونقل المعدات")}
      icon={<History size={22} />}
      actions={isEngineer ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Log Event", "تسجيل حدث")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Records", "إجمالي السجلات"),     value: transfers.length, icon: "📋", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Machines Involved", "الآلات المعنية"), value: uniqueMachines,    icon: "🔧", color: "#7c3aed", bg: "#ede9fe" },
          { label: nav("Parts Replaced", "قطع مستبدلة"),       value: withPartsCount,   icon: "🔩", color: "#d97706", bg: "#fef3c7" },
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
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("New Service / Transfer Record", "سجل خدمة / نقل جديد")}</h3>
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
              <label>{nav("Shift (optional)", "الشفت (اختياري)")}
                <select className="input" value={form.shiftId} onChange={e => setForm(p => ({ ...p, shiftId: e.target.value }))}>
                  <option value="">{nav("Use my assigned shift", "استخدام شفتي المعين")}</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>{nav("Parts Used", "القطع المستخدمة")} *
                <input type="text" className="input" value={form.partsUsed} onChange={e => setForm(p => ({ ...p, partsUsed: e.target.value }))} placeholder={nav("e.g. belt, pump, manifold...", "مثال: بكرة، مضخة...")} required />
              </label>
              <label>{nav("Downtime (min)", "وقت التوقف (د)")}
                <input type="number" min={0} className="input" value={form.downtimeMinutes} onChange={e => setForm(p => ({ ...p, downtimeMinutes: e.target.value }))} placeholder="0" />
              </label>
              <label>{nav("Downtime Reason", "سبب التوقف")}
                <select className="input" value={form.downtimeReason} onChange={e => setForm(p => ({ ...p, downtimeReason: e.target.value }))}>
                  {DOWNTIME_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </label>
            </div>
            <label>{nav("Report Details", "تفاصيل التقرير")}
              <textarea rows={3} className="input" value={form.reportText} onChange={e => setForm(p => ({ ...p, reportText: e.target.value }))} placeholder={nav("Additional details about the work done...", "تفاصيل إضافية عن العمل المنجز...")} />
            </label>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Record", "حفظ السجل")}</Button>
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
          ) : transfers.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
              <History size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
              <p style={{ fontWeight: 600 }}>{nav("No transfer records yet", "لا توجد سجلات نقل بعد")}</p>
              {isEngineer && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Log Event' to add a service record", "انقر على 'تسجيل حدث' لإضافة سجل خدمة")}</p>}
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Parts Used", "القطع المستخدمة")}</th>
                  <th>{nav("Reason", "السبب")}</th>
                  <th>{nav("Downtime", "وقت التوقف")}</th>
                  <th>{nav("Engineer", "المهندس")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.machine?.name ?? `#${t.machineId}`}</td>
                    <td style={{ color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.partsUsed || "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{t.downtimeReason?.replace(/_/g, " ") || "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{t.downtimeMinutes != null ? `${t.downtimeMinutes} min` : "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{t.engineer?.fullName ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
