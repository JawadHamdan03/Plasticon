import { useEffect, useState } from "react";
import { DollarSign, Wrench, Plus, X, Save } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MaintenanceRecord {
  id: number;
  partsUsed: string;
  downtimeReason: string;
  downtimeMinutes?: number | null;
  reportText?: string | null;
  createdAt: string;
  machine?: { id: number; name: string };
  engineer?: { id: number; fullName: string };
}

interface CostRecord {
  id: number;
  laborHours: number;
  laborCostPerHour: number;
  laborTotal: number;
  sparesTotal: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
  maintenance: { id: number; description: string; machine: { id: number; name: string; type: string } };
  createdBy: { id: number; fullName: string };
}

const emptyForm = { maintenanceId: "", laborHours: "", laborCostPerHour: "", sparesTotal: "", notes: "" };

export default function MaintenanceCosts() {
  const { user } = useAuth();
  const nav = (_en: string, ar: string) => ar;

  const role = user?.role ?? "";
  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const isEngineer = role === "ENGINEER";
  const canEdit = isAccountant || isAdmin;

  const [records, setRecords] = useState<CostRecord[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const endpoint = "/maintenance/all";
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE_URL}/maintenance-costs`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}${endpoint}`, { headers: authHeaders(), credentials: "include" }),
      ]);
      if (r1.ok) {
        const d = await r1.json();
        setRecords(Array.isArray(d) ? d : (d.data ?? []));
      }
      if (r2.ok) {
        const d = await r2.json();
        const arr: MaintenanceRecord[] = Array.isArray(d) ? d : (d.records ?? d.data ?? []);
        // Only show records that have parts used
        setMaintenances(arr.filter(m => m.partsUsed?.trim()));
      }
    } catch { } finally { setLoading(false); }
  };

  const laborTotal = parseFloat(form.laborHours || "0") * parseFloat(form.laborCostPerHour || "0");
  const totalCostCalc = laborTotal + parseFloat(form.sparesTotal || "0");

  const handleSave = async () => {
    if (!form.maintenanceId) { setError("اختر سجل صيانة"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          maintenanceId: parseInt(form.maintenanceId),
          laborHours: parseFloat(form.laborHours || "0"),
          laborCostPerHour: parseFloat(form.laborCostPerHour || "0"),
          sparesTotal: parseFloat(form.sparesTotal || "0"),
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) { setShowForm(false); setForm(emptyForm); void fetchAll(); }
      else {
        const err = await res.json().catch(() => ({}));
        setError((err as any).message ?? "Failed to save");
      }
    } catch { setError("Failed to save"); } finally { setSaving(false); }
  };

  const totalCost = records.reduce((a, b) => a + b.totalCost, 0);
  const totalSpares = records.reduce((a, b) => a + b.sparesTotal, 0);
  const totalLabor = records.reduce((a, b) => a + b.laborTotal, 0);

  // Map maintenanceId → costRecord for quick lookup
  const costByMaintenanceId = new Map(records.map(r => [r.maintenance.id, r]));

  return (
    <ModulePageShell
      title={"تكاليف الصيانة"}
      subtitle={"تكاليف قطع الغيار والعمالة لكل مهمة صيانة"}
      icon={<DollarSign size={22} />}
      actions={isAccountant ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "إلغاء" : "إضافة تكلفة"}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "المهام المسعّرة",    value: records.length,                                                                        gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: "تكلفة قطع الغيار",   value: `₪${totalSpares.toLocaleString(undefined,{maximumFractionDigits:2})}`,                  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: "التكلفة الإجمالية",  value: `₪${totalCost.toLocaleString(undefined,{maximumFractionDigits:2})}`,                     gradient: "linear-gradient(135deg,#10b981,#059669)" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Add cost form — accountant only */}
      {isAccountant && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{"إضافة سجل تكلفة"}</h3>
          {error && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{"مهمة الصيانة (بقطع مستخدمة) *"}</label>
              <select className="input" value={form.maintenanceId} onChange={e => setForm(p => ({ ...p, maintenanceId: e.target.value }))}>
                <option value="">{"اختر سجل الصيانة..."}</option>
                {maintenances.map(m => (
                  <option key={m.id} value={m.id} disabled={costByMaintenanceId.has(m.id)}>
                    {m.machine?.name ?? `#${m.id}`} — {m.partsUsed} {costByMaintenanceId.has(m.id) ? `(${"مسعّر"})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{"ساعات العمل"}</label>
              <input type="number" min={0} step="0.5" className="input" value={form.laborHours} onChange={e => setForm(p => ({ ...p, laborHours: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"تكلفة العمل/ساعة ($)"}</label>
              <input type="number" min={0} step="0.01" className="input" value={form.laborCostPerHour} onChange={e => setForm(p => ({ ...p, laborCostPerHour: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"تكلفة قطع الغيار ($)"}</label>
              <input type="number" min={0} step="0.01" className="input" value={form.sparesTotal} onChange={e => setForm(p => ({ ...p, sparesTotal: e.target.value }))} />
            </div>
            <div>
              <label className="label">{"التكلفة الإجمالية (تلقائي)"}</label>
              <input type="number" className="input" value={totalCostCalc.toFixed(2)} readOnly style={{ background: "var(--bg-subtle)", cursor: "not-allowed" }} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{"ملاحظات"}</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: ".625rem" }}>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              <Save size={14} />
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{"إلغاء"}</Button>
          </div>
        </Card>
      )}

      {/* Maintenance records with parts — awaiting pricing */}
      {(isAccountant || isAdmin) && maintenances.length > 0 && (
        <div className="mb-6">
          <h3 style={{ margin: "0 0 .75rem", fontSize: ".9rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {"مهام الصيانة — قطع مستخدمة"}
          </h3>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>{"الآلة"}</th>
                    <th>{"القطع المستخدمة"}</th>
                    <th>{"السبب"}</th>
                    <th>{"المهندس"}</th>
                    <th>{"التاريخ"}</th>
                    <th>{"حالة التسعير"}</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenances.map(m => {
                    const cost = costByMaintenanceId.get(m.id);
                    return (
                      <tr key={m.id}>
                        <td className="font-medium">{m.machine?.name ?? `#${m.id}`}</td>
                        <td style={{ color: "var(--text-secondary)", maxWidth: "min(200px,40vw)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.partsUsed}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: ".8rem" }}>{m.downtimeReason?.replace(/_/g, " ")}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{m.engineer?.fullName ?? "—"}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td>
                          {cost ? (
                            <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: "#d1fae5", color: "#059669" }}>
                              ₪{cost.totalCost.toFixed(2)} ✓
                            </span>
                          ) : (
                            <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: "#fef3c7", color: "#d97706" }}>
                              {"بانتظار التسعير"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Costed records */}
      <h3 style={{ margin: "0 0 .75rem", fontSize: ".9rem", fontWeight: 700, color: "var(--text-primary)" }}>
        {"سجلات التكلفة المسعّرة"}
      </h3>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
              <Wrench size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
              <p style={{ fontWeight: 600 }}>{"لا توجد سجلات تكلفة بعد"}</p>
              {isAccountant && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{"انقر على 'إضافة تكلفة' لتسعير مهمة صيانة"}</p>}
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{"الآلة"}</th>
                  <th>{"القطع"}</th>
                  <th>{"ساعات عمل"}</th>
                  <th>{"تكلفة عمالة"}</th>
                  <th>{"قطع غيار"}</th>
                  <th>{"الإجمالي"}</th>
                  <th>{"سعّره"}</th>
                  <th>{"التاريخ"}</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.maintenance.machine.name}</td>
                    <td style={{ color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.maintenance.description}</td>
                    <td>{r.laborHours}h</td>
                    <td>₪{r.laborTotal.toFixed(2)}</td>
                    <td>₪{r.sparesTotal.toFixed(2)}</td>
                    <td><strong style={{ color: "#059669" }}>₪{r.totalCost.toFixed(2)}</strong></td>
                    <td style={{ color: "var(--text-secondary)" }}>{r.createdBy.fullName}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
              {records.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: "var(--bg-subtle)" }}>
                    <td colSpan={4}>{"المجاميع"}</td>
                    <td>₪{totalSpares.toFixed(2)}</td>
                    <td style={{ color: "#059669" }}>₪{totalCost.toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
