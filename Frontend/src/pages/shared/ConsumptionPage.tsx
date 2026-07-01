import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";

/* ─── Types ─────────────────────────────────────────────── */
type Shift = { id: number; name: string; startTime?: string | null; endTime?: string | null };
type Machine = { id: number; name: string; type?: string | null };

type ConsumptionRecord = {
  id: number;
  rawHdpeUsed?: number | null;
  rawLdpeUsed?: number | null;
  rawPetUsed?: number | null;
  colorUsed?: number | null;
  adhesiveUsed?: number | null;
  emptyBagsUsed?: number | null;
  cartonsCount?: number | null;
  totalPieces?: number | null;
  notes?: string | null;
  createdAt: string;
  shift?: { id: number; name: string } | null;
  machine?: { id: number; name: string; type?: string | null } | null;
  user?: { id: number; fullName: string; username: string; role: string };
};

type ShiftRawUsage = {
  date: string;
  shiftId: number | null;
  shiftName: string;
  hdpeKg: number;
  ldpeKg: number;
  petKg: number;
  colorKg: number;
};

type DailyRawUsage = {
  date: string;
  hdpe: number;
  ldpe: number;
  pet: number;
  adhesive: number;
  emptyBags: number;
  color: number;
  totalRawUsed: number;
};

type AdminOverviewResponse = {
  totals: { totalRecords: number; totalCartons: number; totalPieces: number };
  byShiftRawUsage?: ShiftRawUsage[];
  dailyRawMaterialUsage?: DailyRawUsage[];
  byUser?: Array<{ userId: number; fullName: string; username: string; role: string; recordsCount: number; cartonsCount: number; totalPieces: number }>;
  recentRecords?: ConsumptionRecord[];
};

type ConsumptionForm = {
  hdpeBags: string;
  hdpeKgPerBag: string;
  ldpeBags: string;
  ldpeKgPerBag: string;
  petBags: string;
  petKgPerBag: string;
  colorKg: string;
  adhesiveKg: string;
  emptyBags: string;
  notes: string;
  saving: boolean;
  error: string;
  success: string;
};

/* ─── Auth ──────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

/* ─── Machine material helpers ──────────────────────────── */
function decodeMachineType(raw: string): { typeName: string; materials: string[] } {
  const idx = raw.indexOf(":");
  if (idx === -1) return { typeName: raw, materials: [] };
  return { typeName: raw.slice(0, idx), materials: raw.slice(idx + 1).split(",").filter(Boolean) };
}

function getMachineMaterials(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const { materials } = decodeMachineType(raw);
  if (materials.length > 0) return materials;
  const t = raw.toUpperCase();
  if (t.includes("PREFORM") || t.includes("PET")) return ["PET", "COLOR"];
  if (t.includes("CAP")) return ["HDPE", "LDPE", "COLOR"];
  return [];
}

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString();
const fmtKg = (n: number | null | undefined) => (n ? `${Number(n).toFixed(1)} kg` : "—");
// HDPE/LDPE stored in BAGS (1 bag = 25 kg); show "Y kg (X bags)"
const fmtBags = (n: number | null | undefined) => {
  if (!n || Number(n) === 0) return "—";
  const bags = Number(n);
  const kg = bags * 25;
  return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg (${bags % 1 === 0 ? bags : bags.toFixed(1)} bags)`;
};

const isMaterialRecord = (r: ConsumptionRecord) =>
  (r.rawHdpeUsed ?? 0) > 0 ||
  (r.rawLdpeUsed ?? 0) > 0 ||
  (r.rawPetUsed ?? 0) > 0 ||
  (r.colorUsed ?? 0) > 0 ||
  (r.adhesiveUsed ?? 0) > 0 ||
  (r.emptyBagsUsed ?? 0) > 0;

const emptyForm = (): ConsumptionForm => ({
  hdpeBags: "", hdpeKgPerBag: "25",
  ldpeBags: "", ldpeKgPerBag: "25",
  petBags: "", petKgPerBag: "",
  colorKg: "", adhesiveKg: "", emptyBags: "",
  notes: "", saving: false, error: "", success: "",
});

function minutesInDay(timeStr: string): number {
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d.getUTCHours() * 60 + d.getUTCMinutes();
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatShiftTime(timeStr: string): string {
  const d = new Date(timeStr);
  if (!isNaN(d.getTime()))
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return timeStr;
}

function getCurrentShift(shifts: Shift[], nowMinutes: number): Shift | null {
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const start = minutesInDay(s.startTime);
    const end = minutesInDay(s.endTime);
    if (isNaN(start) || isNaN(end)) continue;
    if (end <= start) {
      if (nowMinutes >= start || nowMinutes < end) return s;
    } else {
      if (nowMinutes >= start && nowMinutes < end) return s;
    }
  }
  return null;
}

/* ─── Component ─────────────────────────────────────────── */
export function ConsumptionPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";
  const isEngineer = user?.role === "ENGINEER";
  const isWorker = user?.role === "WORKER";
  const canCreate = isWorker;
  const canSeeAll = isAdmin || isAccountant || isEngineer;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [myRecords, setMyRecords] = useState<ConsumptionRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ConsumptionRecord[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [adminTab, setAdminTab] = useState<"overview" | "by-shift" | "daily" | "records" | "workers">("overview");
  const [form, setForm] = useState<ConsumptionForm>(emptyForm());
  const [docFile, setDocFile] = useState<File | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getUTCHours() * 60 + d.getUTCMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const patchForm = (patch: Partial<ConsumptionForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const currentShift = useMemo(() => getCurrentShift(shifts, nowMinutes), [shifts, nowMinutes]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftRes, mineRes, machinesRes] = await Promise.all([
        fetchWithAuth("/shifts"),
        fetchWithAuth("/production/me"),
        fetchWithAuth("/machines"),
      ]);
      if (shiftRes.ok) {
        const d = await shiftRes.json();
        setShifts(Array.isArray(d) ? d : (d.data ?? []));
      }
      if (machinesRes.ok) {
        const d = await machinesRes.json();
        setMachines(Array.isArray(d) ? d : (d.data ?? []));
      }
      if (mineRes.ok) {
        const all = (await mineRes.json()) as ConsumptionRecord[];
        setMyRecords(all.filter(isMaterialRecord));
      }
      if (canSeeAll) {
        const allRes = await fetchWithAuth("/production/all");
        if (allRes.ok) {
          const all = (await allRes.json()) as ConsumptionRecord[];
          setAllRecords(all.filter(isMaterialRecord));
        }
      }
      if (isAdmin) {
        const qs = new URLSearchParams();
        if (fromDate) qs.set("fromDate", fromDate);
        if (toDate) qs.set("toDate", toDate);
        const q = qs.toString();
        const ovRes = await fetchWithAuth(`/production/admin/overview${q ? `?${q}` : ""}`);
        if (ovRes.ok) setAdminOverview((await ovRes.json()) as AdminOverviewResponse);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [canSeeAll, isAdmin, fromDate, toDate]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const submitConsumption = async (e: FormEvent) => {
    e.preventDefault();
    const selMachine = machines.find((m) => m.id === Number(selectedMachineId));
    const mats = selMachine ? getMachineMaterials(selMachine.type) : ["HDPE", "LDPE", "PET", "COLOR"];
    const hasAny =
      (mats.includes("HDPE") && !!form.hdpeBags) ||
      (mats.includes("LDPE") && !!form.ldpeBags) ||
      (mats.includes("PET") && !!form.petBags) ||
      (mats.includes("COLOR") && !!form.colorKg) ||
      (mats.includes("ADHESIVE") && !!form.adhesiveKg) ||
      (mats.includes("EMPTY_BAGS") && !!form.emptyBags);
    if (!hasAny) {
      patchForm({ error: "يرجى إدخال كمية مادة واحدة على الأقل" });
      return;
    }
    patchForm({ saving: true, error: "", success: "" });
    try {
      const autoShift = getCurrentShift(shifts, nowMinutes);
      const hdpeBags = parseFloat(form.hdpeBags) || 0;
      const hdpeKgPerBag = parseFloat(form.hdpeKgPerBag) || 25;
      const ldpeBags = parseFloat(form.ldpeBags) || 0;
      const ldpeKgPerBag = parseFloat(form.ldpeKgPerBag) || 25;
      const petBags = parseFloat(form.petBags) || 0;
      const petKgPerBag = parseFloat(form.petKgPerBag) || 0;
      const colorKg = parseFloat(form.colorKg) || 0;
      const adhesiveKg = parseFloat(form.adhesiveKg) || 0;
      const emptyBagsCount = parseFloat(form.emptyBags) || 0;

      // PET requires explicit kg/bag because weight varies (22–30 kg)
      if (petBags > 0 && petKgPerBag <= 0) {
        patchForm({ saving: false, error: "يرجى إدخال وزن كيس PET (كغ/كيس)" });
        return;
      }

      const body: Record<string, unknown> = { shiftId: autoShift?.id };
      if (selMachine) body.machineId = selMachine.id;
      // Send KG to backend (bags × kg/bag)
      if (hdpeBags > 0) body.rawHdpeUsed = hdpeBags * hdpeKgPerBag;
      if (ldpeBags > 0) body.rawLdpeUsed = ldpeBags * ldpeKgPerBag;
      if (petBags > 0) body.rawPetUsed = petBags * petKgPerBag;
      if (colorKg > 0) body.colorUsed = colorKg;
      if (adhesiveKg > 0) body.adhesiveUsed = adhesiveKg;
      if (emptyBagsCount > 0) body.emptyBagsUsed = emptyBagsCount;
      if (form.notes) body.notes = form.notes;

      const fd = new FormData();
      Object.entries(body).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
      if (docFile) fd.append("document", docFile);
      const res = await fetchWithAuth("/production", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readApiError(res));
      setDocFile(null);
      setForm({ ...emptyForm(), success: "تم الحفظ بنجاح ✓" });
      void loadAll();
    } catch (err) {
      patchForm({ saving: false, error: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyConsumedThisShift =
    currentShift !== null &&
    myRecords.some(
      (r) =>
        r.shift?.id === currentShift.id &&
        r.createdAt.slice(0, 10) === todayStr,
    );

  /* ── Dynamic materials for selected machine ─────────────── */
  const selectedMachine = machines.find((m) => m.id === Number(selectedMachineId));
  const activeMaterials: string[] = selectedMachine
    ? getMachineMaterials(selectedMachine.type)
    : ["HDPE", "LDPE", "PET", "COLOR"];

  /* ── Aggregated totals from admin overview ─────────────── */
  const shiftRawData = adminOverview?.byShiftRawUsage ?? [];
  const dailyRawData = adminOverview?.dailyRawMaterialUsage ?? [];

  const totalHdpe = shiftRawData.reduce((s, r) => s + r.hdpeKg, 0);
  const totalLdpe = shiftRawData.reduce((s, r) => s + r.ldpeKg, 0);
  const totalPet = shiftRawData.reduce((s, r) => s + r.petKg, 0);
  const totalColor = shiftRawData.reduce((s, r) => s + r.colorKg, 0);

  /* ── Worker: my consumption summary ────────────────────── */
  const myTotalHdpe = myRecords.reduce((s, r) => s + Number(r.rawHdpeUsed ?? 0), 0);
  const myTotalLdpe = myRecords.reduce((s, r) => s + Number(r.rawLdpeUsed ?? 0), 0);
  const myTotalPet = myRecords.reduce((s, r) => s + Number(r.rawPetUsed ?? 0), 0);
  const myTotalColor = myRecords.reduce((s, r) => s + Number(r.colorUsed ?? 0), 0);

  return (
    <ModulePageShell
      title={"الاستهلاك"}
      subtitle={"تسجيل استهلاك المواد الخام (HDPE، LDPE، PET، اللون)"}
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={() => void loadAll()}>
          {"تحديث"}
        </button>
      }
    >
      {loading && <TruckLoader />}

      {/* ── WORKER: consumption form ────────────────────────── */}
      {canCreate && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".6rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand-primary)", flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {"تسجيل استهلاك المواد"}
            </h3>
            <span style={{
              marginInlineStart: "auto", fontSize: ".8rem", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: ".35rem",
              padding: ".25rem .65rem", borderRadius: "999px",
              background: currentShift ? "rgba(16,185,129,.1)" : "var(--bg-surface)",
              border: `1px solid ${currentShift ? "rgba(16,185,129,.35)" : "var(--border-default)"}`,
              color: currentShift ? "#059669" : "var(--text-secondary)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: currentShift ? "#10b981" : "var(--text-secondary)", flexShrink: 0 }} />
              {currentShift
                ? `${currentShift.name}${currentShift.startTime && currentShift.endTime ? ` (${formatShiftTime(currentShift.startTime)} – ${formatShiftTime(currentShift.endTime)})` : ""}`
                : ("لا يوجد شفت")}
            </span>
          </div>
          <div style={{ padding: "1.25rem" }}>
            {alreadyConsumedThisShift && (
              <div style={{
                display: "flex", alignItems: "center", gap: ".5rem",
                padding: ".6rem .875rem", marginBottom: ".75rem",
                background: "rgba(245,158,11,.1)",
                border: "1px solid rgba(245,158,11,.4)",
                borderRadius: "var(--radius-lg)",
                fontSize: ".82rem", fontWeight: 600, color: "#b45309",
              }}>
                <span style={{ fontSize: "1rem" }}>⚠️</span>
                {isAr
                  ? `تم تسجيل الاستهلاك لشفت ${currentShift?.name ?? ""} اليوم — يمكنك إضافة سجل آخر إذا لزم`
                  : `Consumption for shift ${currentShift?.name ?? ""} already recorded today — you can still add another if needed`}
              </div>
            )}
            {form.error && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{form.error}</div>}
            {form.success && <div className="auth-alert" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{form.success}</div>}
            <form className="module-form" onSubmit={(e) => void submitConsumption(e)}>
              {/* Machine selector */}
              {machines.length > 0 && (
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {"الماكينة (اختياري)"}
                  <select value={selectedMachineId} onChange={(e) => setSelectedMachineId(e.target.value)}
                    style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }}>
                    <option value="">{"— اختر ماكينة —"}</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {selectedMachine && (
                    <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginTop: ".15rem" }}>
                      {"المواد المُعدَّة:"} {activeMaterials.join(", ")}
                    </span>
                  )}
                </label>
              )}

              {/* Bag materials: HDPE, LDPE, PET */}
              {(["HDPE", "LDPE", "PET"] as const).filter((m) => activeMaterials.includes(m)).map((mat) => {
                const cfg = {
                  HDPE: { label: "HDPE", color: "#3b82f6", bg: "rgba(59,130,246,.1)", border: "rgba(59,130,246,.2)", textColor: "#1d4ed8", bags: form.hdpeBags, kpb: form.hdpeKgPerBag, defaultKpb: "25" },
                  LDPE: { label: "LDPE", color: "#06b6d4", bg: "rgba(6,182,212,.1)", border: "rgba(6,182,212,.2)", textColor: "#0e7490", bags: form.ldpeBags, kpb: form.ldpeKgPerBag, defaultKpb: "25" },
                  PET:  { label: "PET",  color: "#10b981", bg: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.2)", textColor: "#047857", bags: form.petBags, kpb: form.petKgPerBag, defaultKpb: "" },
                }[mat];
                const bagsNum = parseFloat(cfg.bags) || 0;
                const kpbNum = parseFloat(cfg.kpb) || 0;
                const totalKg = bagsNum > 0 && kpbNum > 0 ? (bagsNum * kpbNum).toFixed(1) : null;
                return (
                  <div key={mat} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>{cfg.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: ".75rem", alignItems: "end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {"عدد الأكياس"}
                        <input type="number" min={0} step="0.5" value={cfg.bags} placeholder="0"
                          onChange={(e) => patchForm(mat === "HDPE" ? { hdpeBags: e.target.value } : mat === "LDPE" ? { ldpeBags: e.target.value } : { petBags: e.target.value })}
                          style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {"كغ / الكيس"}
                        <input type="number" min={0} step="0.1" value={cfg.kpb} placeholder={cfg.defaultKpb || "—"}
                          onChange={(e) => patchForm(mat === "HDPE" ? { hdpeKgPerBag: e.target.value } : mat === "LDPE" ? { ldpeKgPerBag: e.target.value } : { petKgPerBag: e.target.value })}
                          style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }} />
                      </label>
                      <div style={{ padding: ".45rem .65rem", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "var(--radius-md)", fontSize: ".85rem", fontWeight: 700, color: cfg.textColor, whiteSpace: "nowrap", alignSelf: "end" }}>
                        {totalKg ? `= ${totalKg} kg` : bagsNum > 0 ? `= ${bagsNum * 25} kg` : "0 kg"}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Color row */}
              {activeMaterials.includes("COLOR") && (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>{"اللون (ملوّن)"}</span>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {"الكمية بالكيلوغرام"}
                    <input type="number" min={0} step="0.01" value={form.colorKg}
                      onChange={(e) => patchForm({ colorKg: e.target.value })} placeholder="0"
                      style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }} />
                  </label>
                </div>
              )}

              {/* Adhesive row */}
              {activeMaterials.includes("ADHESIVE") && (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>{"لاصق"}</span>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {"الكمية بالكيلوغرام"}
                    <input type="number" min={0} step="0.01" value={form.adhesiveKg}
                      onChange={(e) => patchForm({ adhesiveKg: e.target.value })} placeholder="0"
                      style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }} />
                  </label>
                </div>
              )}

              {/* Empty bags row */}
              {activeMaterials.includes("EMPTY_BAGS") && (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#64748b", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>{"أكياس فارغة"}</span>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {"العدد"}
                    <input type="number" min={0} step="1" value={form.emptyBags}
                      onChange={(e) => patchForm({ emptyBags: e.target.value })} placeholder="0"
                      style={{ padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".9rem" }} />
                  </label>
                </div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {"ملاحظات"}
                <textarea rows={2} value={form.notes} onChange={(e) => patchForm({ notes: e.target.value })}
                  placeholder={"ملاحظات اختيارية..."}
                  style={{ padding: ".5rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem", resize: "vertical" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {"إرفاق مستند أو صورة إثبات (اختياري)"}
                <input type="file" accept="image/*,application/pdf,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  style={{ padding: ".4rem .6rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".82rem" }} />
                {docFile && <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginTop: ".2rem" }}>📎 {docFile.name}</span>}
              </label>

              <button type="submit" className="auth-button" disabled={form.saving} style={{ width: "100%" }}>
                {form.saving ? ("جاري الحفظ...") : ("حفظ الاستهلاك")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── My consumption summary (worker) ─────────────────── */}
      {canCreate && myRecords.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "HDPE (kg)", value: `${(myTotalHdpe * 25).toFixed(0)} kg`, sub: `${myTotalHdpe} bags`, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
              { label: "LDPE (kg)", value: `${(myTotalLdpe * 25).toFixed(0)} kg`, sub: `${myTotalLdpe} bags`, gradient: "linear-gradient(135deg,#06b6d4,#0284c7)" },
              { label: "PET (kg)", value: fmtBags(myTotalPet), sub: "إجمالي استهلاكي", gradient: "linear-gradient(135deg,#10b981,#059669)" },
              { label: "اللون", value: fmtKg(myTotalColor), sub: "", gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1rem 1.25rem", color: "#fff" }}>
                <p style={{ margin: 0, fontSize: ".78rem", opacity: .85, fontWeight: 600 }}>{kpi.label}</p>
                <p style={{ margin: ".25rem 0 0", fontSize: "1.1rem", fontWeight: 800 }}>{kpi.value}</p>
                <p style={{ margin: 0, fontSize: ".7rem", opacity: .75 }}>{kpi.sub || ("إجمالي استهلاكي")}</p>
              </div>
            ))}
          </div>
          <div className="module-panel" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginBottom: ".75rem" }}>{"آخر سجلاتي"}</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{"التاريخ"}</th>
                    <th>{"الشفت"}</th>
                    <th>HDPE (kg)</th>
                    <th>LDPE (kg)</th>
                    <th>PET (kg)</th>
                    <th>{"اللون"} (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {myRecords.slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td>{r.shift?.name ?? "—"}</td>
                      <td>{fmtBags(r.rawHdpeUsed)}</td>
                      <td>{fmtBags(r.rawLdpeUsed)}</td>
                      <td>{fmtBags(r.rawPetUsed)}</td>
                      <td>{fmtKg(r.colorUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── ADMIN ────────────────────────────────────────────── */}
      {isAdmin && (
        <>
          {/* Date filter */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", padding: "1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {"من تاريخ"}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {"إلى تاريخ"}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFromDate(""); setToDate(""); }}>
              {"مسح"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {([
              ["overview", "نظرة عامة"],
              ["by-shift", "حسب الشفت"],
              ["daily", "يومي"],
              ["records", "السجلات"],
              ["workers", "العمال"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setAdminTab(key)}
                style={{ padding: ".45rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: adminTab === key ? "var(--brand-primary,#3b82f6)" : "var(--bg-surface)", color: adminTab === key ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".83rem", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {adminTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                {[
                  { label: `HDPE (${"كجم"})`, value: `${(totalHdpe * 25).toLocaleString()}`, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "🔵" },
                  { label: `LDPE (${"كجم"})`, value: `${(totalLdpe * 25).toLocaleString()}`, gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🩵" },
                  { label: `PET (${"كجم"})`, value: `${(totalPet * 25).toLocaleString()}`, gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "🟢" },
                  { label: "اللون", value: fmtKg(totalColor), gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🟠" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
                    <span style={{ fontSize: "1.3rem" }}>{kpi.icon}</span>
                    <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{kpi.label}</p>
                    <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {shiftRawData.length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                    {"أحدث استهلاك حسب الشفت"}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{"التاريخ"}</th>
                          <th>{"الشفت"}</th>
                          <th>HDPE ({"أكياس"})</th>
                          <th>LDPE ({"أكياس"})</th>
                          <th>PET ({"أكياس"})</th>
                          <th>{"اللون"} (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftRawData.slice(0, 10).map((row) => (
                          <tr key={`${row.date}-${row.shiftId}`}>
                            <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.date}</td>
                            <td>{row.shiftName}</td>
                            <td>{row.hdpeKg > 0 ? `${row.hdpeKg} bags` : "—"}</td>
                            <td>{row.ldpeKg > 0 ? `${row.ldpeKg} bags` : "—"}</td>
                            <td>{row.petKg > 0 ? `${row.petKg} bags` : "—"}</td>
                            <td>{fmtKg(row.colorKg)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By-Shift tab */}
          {adminTab === "by-shift" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {"استهلاك المواد حسب الشفت والتاريخ"}
              </div>
              {shiftRawData.length === 0
                ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{"التاريخ"}</th>
                          <th>{"الشفت"}</th>
                          <th>HDPE ({"أكياس"})</th>
                          <th>LDPE ({"أكياس"})</th>
                          <th>PET ({"أكياس"})</th>
                          <th>{"اللون"} (kg)</th>
                          <th>{"الإجمالي"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftRawData.map((row) => {
                          const total = row.hdpeKg + row.ldpeKg + row.petKg + row.colorKg;
                          return (
                            <tr key={`${row.date}-${row.shiftId}`}>
                              <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{row.date}</td>
                              <td style={{ fontWeight: 600 }}>{row.shiftName}</td>
                              <td>{row.hdpeKg > 0 ? `${row.hdpeKg.toFixed(1)}` : "—"}</td>
                              <td>{row.ldpeKg > 0 ? `${row.ldpeKg.toFixed(1)}` : "—"}</td>
                              <td>{row.petKg > 0 ? `${row.petKg.toFixed(1)}` : "—"}</td>
                              <td>{row.colorKg > 0 ? `${row.colorKg.toFixed(1)}` : "—"}</td>
                              <td style={{ fontWeight: 800, color: "var(--brand-primary)" }}>{total.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Daily tab */}
          {adminTab === "daily" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {"الاستهلاك اليومي للمواد الخام"}
              </div>
              {dailyRawData.length === 0
                ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{"التاريخ"}</th>
                          <th>HDPE ({"أكياس"})</th>
                          <th>LDPE ({"أكياس"})</th>
                          <th>PET ({"أكياس"})</th>
                          <th>{"اللون"} (kg)</th>
                          <th>{"لاصق"} (kg)</th>
                          <th>{"الإجمالي"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyRawData.map((row) => (
                          <tr key={row.date}>
                            <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{row.date}</td>
                            <td>{row.hdpe > 0 ? row.hdpe.toFixed(1) : "—"}</td>
                            <td>{row.ldpe > 0 ? row.ldpe.toFixed(1) : "—"}</td>
                            <td>{row.pet > 0 ? row.pet.toFixed(1) : "—"}</td>
                            <td>{row.color > 0 ? row.color.toFixed(1) : "—"}</td>
                            <td>{row.adhesive > 0 ? row.adhesive.toFixed(1) : "—"}</td>
                            <td style={{ fontWeight: 800, color: "var(--brand-primary)" }}>{row.totalRawUsed.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* All records tab */}
          {adminTab === "records" && (() => {
            const records = allRecords;
            return (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                  {`سجلات الاستهلاك (${records.length})`}
                </div>
                {records.length === 0
                  ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد سجلات"}</div>
                  : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{"التاريخ"}</th>
                            <th>{"العامل"}</th>
                            <th>{"الشفت"}</th>
                            <th>HDPE ({"أكياس"})</th>
                            <th>LDPE ({"أكياس"})</th>
                            <th>PET (kg)</th>
                            <th>{"اللون"} (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.slice(0, 50).map((r) => (
                            <tr key={r.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                              <td>{r.shift?.name ?? "—"}</td>
                              <td>{fmtBags(r.rawHdpeUsed)}</td>
                              <td>{fmtBags(r.rawLdpeUsed)}</td>
                              <td>{fmtKg(r.rawPetUsed)}</td>
                              <td>{fmtKg(r.colorUsed)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            );
          })()}

          {/* Workers tab */}
          {adminTab === "workers" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {"الاستهلاك حسب العامل"}
              </div>
              {allRecords.length === 0
                ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div>
                : (() => {
                  const byWorker = new Map<number, { name: string; hdpe: number; ldpe: number; pet: number; color: number; count: number }>();
                  for (const r of allRecords) {
                    const uid = r.user?.id ?? 0;
                    const cur = byWorker.get(uid) ?? { name: r.user?.fullName ?? "—", hdpe: 0, ldpe: 0, pet: 0, color: 0, count: 0 };
                    cur.hdpe += Number(r.rawHdpeUsed ?? 0);
                    cur.ldpe += Number(r.rawLdpeUsed ?? 0);
                    cur.pet += Number(r.rawPetUsed ?? 0);
                    cur.color += Number(r.colorUsed ?? 0);
                    cur.count += 1;
                    byWorker.set(uid, cur);
                  }
                  const rows = Array.from(byWorker.values()).sort((a, b) => (b.hdpe + b.ldpe + b.pet + b.color) - (a.hdpe + a.ldpe + a.pet + a.color));
                  return (
                    <div style={{ overflowX: "auto" }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{"الاسم"}</th>
                            <th>{"السجلات"}</th>
                            <th>HDPE (kg)</th>
                            <th>LDPE (kg)</th>
                            <th>PET (kg)</th>
                            <th>{"اللون"} (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((w, i) => (
                            <tr key={i}>
                              <td style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ fontWeight: 700 }}>{w.name}</td>
                              <td>{w.count}</td>
                              <td>{w.hdpe > 0 ? w.hdpe.toFixed(1) : "—"}</td>
                              <td>{w.ldpe > 0 ? w.ldpe.toFixed(1) : "—"}</td>
                              <td>{w.pet > 0 ? w.pet.toFixed(1) : "—"}</td>
                              <td>{w.color > 0 ? w.color.toFixed(1) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
            </div>
          )}
        </>
      )}

      {/* ── ACCOUNTANT / ENGINEER: read-only table ────────── */}
      {(isAccountant || isEngineer) && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
            {`سجلات الاستهلاك (${allRecords.length})`}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{"التاريخ"}</th>
                  <th>{"العامل"}</th>
                  <th>{"الشفت"}</th>
                  <th>HDPE (kg)</th>
                  <th>LDPE (kg)</th>
                  <th>PET (kg)</th>
                  <th>{"اللون"} (kg)</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.slice(0, 50).map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg-surface)" }}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                    <td>{r.shift?.name ?? "—"}</td>
                    <td>{fmtKg(r.rawHdpeUsed)}</td>
                    <td>{fmtKg(r.rawLdpeUsed)}</td>
                    <td>{fmtKg(r.rawPetUsed)}</td>
                    <td>{fmtKg(r.colorUsed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
