import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";

/* ─── Types ─────────────────────────────────────────────── */
type Machine = { id: number; name: string; type: string | null };
type Shift = { id: number; name: string; startTime?: string | null; endTime?: string | null };
type BoxEntry = { cavities: string; cycles: string; numberOfBoxes: string };
type MachineForm = {
  cartonsCount: string;
  showCalculator: boolean;
  boxes: BoxEntry[];
  notes: string;
  saving: boolean; error: string; success: string;
};

type ProductionItem = {
  id: number;
  shiftId?: number | null;
  machineId?: number | null;
  cartonsCount?: number | null;
  piecesPerCarton?: number | null;
  totalPieces?: number | null;
  workingCavities?: number | null;
  rawHdpeUsed?: number | null;
  rawLdpeUsed?: number | null;
  rawPetUsed?: number | null;
  colorUsed?: number | null;
  notes?: string | null;
  createdAt: string;
  user?: { id: number; fullName: string; role: string };
  machine?: { id: number; name: string; type?: string | null } | null;
  shift?: { id: number; name: string };
};

type AdminOverviewResponse = {
  totals: { totalRecords: number; totalCartons: number; totalPieces: number };
  byUser?: Array<{ userId: number; fullName: string; username: string; role: string; recordsCount: number; cartonsCount: number; totalPieces: number }>;
  byShift?: Array<{ shiftId: number | null; shiftName: string; recordsCount: number; cartonsCount: number; totalPieces: number }>;
  byShiftProduct?: Array<{ date: string; shiftId: number | null; shiftName: string; capsCartons: number; preformCartons: number; totalCartons: number; totalPieces: number }>;
  dailyByProduct?: Array<{ date: string; capsCartons: number; preformCartons: number; totalCartons: number; totalPieces: number }>;
  recentRecords?: ProductionItem[];
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

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString();

const defaultBox = (type: string | null): BoxEntry => ({
  cavities: isPreformMachine(type) ? "72" : "48",
  cycles: "",
  numberOfBoxes: "1",
});

const emptyForm = (type: string | null): MachineForm => ({
  cartonsCount: "",
  showCalculator: isPreformMachine(type), // preform always uses calculator
  boxes: [defaultBox(type)],
  notes: "",
  saving: false, error: "", success: "",
});

const boxTotal = (b: BoxEntry) =>
  (parseInt(b.cavities) || 0) * (parseInt(b.cycles) || 0) * (parseInt(b.numberOfBoxes) || 0);

/* Shift times are stored as "1970-01-01THH:MM:00.000Z" where HH:MM is what
   the admin typed (treated as UTC). Use UTC accessors so the extracted hour
   matches exactly what was entered, regardless of the browser's timezone. */
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

function isPreformMachine(type: string | null | undefined) {
  if (!type) return false;
  const t = type.toUpperCase();
  return t.includes("PREFORM") || t.includes("PET");
}
function isCapsMachine(type: string | null | undefined) {
  if (!type) return false;
  return type.toUpperCase().includes("CAP");
}
function getCurrentShift(shifts: Shift[], nowMinutes: number): Shift | null {
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const start = minutesInDay(s.startTime);
    const end = minutesInDay(s.endTime);
    if (isNaN(start) || isNaN(end)) continue;
    // overnight shift: end < start (e.g. 22:00–06:00)
    if (end <= start) {
      if (nowMinutes >= start || nowMinutes < end) return s;
    } else {
      if (nowMinutes >= start && nowMinutes < end) return s;
    }
  }
  return null;
}

/* ─── Component ─────────────────────────────────────────── */
export function ProductionPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";
  const canCreate = ["WORKER", "ENGINEER"].includes(user?.role ?? "");
  const canSeeAll = isAdmin || isAccountant || user?.role === "ENGINEER";

  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myRecords, setMyRecords] = useState<ProductionItem[]>([]);
  const [allRecords, setAllRecords] = useState<ProductionItem[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [adminTab, setAdminTab] = useState<"overview" | "daily" | "shifts" | "records" | "workers">("overview");
  const [forms, setForms] = useState<Record<number, MachineForm>>({});
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  });

  // refresh every minute so the active-shift badge stays accurate
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getUTCHours() * 60 + d.getUTCMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const getForm = (m: Machine) => forms[m.id] ?? emptyForm(m.type);
  const patchForm = (machineId: number, patch: Partial<MachineForm>) =>
    setForms((prev) => {
      const cur = prev[machineId] ?? emptyForm(null);
      return { ...prev, [machineId]: { ...cur, ...patch } };
    });

  const currentShift = useMemo(() => getCurrentShift(shifts, nowMinutes), [shifts, nowMinutes]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [machRes, shiftRes, mineRes] = await Promise.all([
        fetchWithAuth("/machines"),
        fetchWithAuth("/shifts"),
        fetchWithAuth("/production/me"),
      ]);
      if (machRes.ok) {
        const d = await machRes.json();
        setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? []));
      }
      if (shiftRes.ok) {
        const d = await shiftRes.json();
        setShifts(Array.isArray(d) ? d : (d.data ?? []));
      }
      if (mineRes.ok) {
        const all = (await mineRes.json()) as ProductionItem[];
        setMyRecords(all.filter((r) => (r.cartonsCount ?? 0) > 0 || r.machine != null));
      }
      if (canSeeAll) {
        const allRes = await fetchWithAuth("/production/all");
        if (allRes.ok) {
          const all = (await allRes.json()) as ProductionItem[];
          setAllRecords(all.filter((r) => (r.cartonsCount ?? 0) > 0 || r.machine != null));
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

  const submitProduction = async (e: FormEvent, machine: Machine) => {
    e.preventDefault();
    patchForm(machine.id, { saving: true, error: "", success: "" });
    try {
      const autoShift = getCurrentShift(shifts, nowMinutes);
      const f = getForm(machine);
      const isPreform = isPreformMachine(machine.type);

      const body: Record<string, unknown> = {
        machineId: machine.id,
        shiftId: autoShift?.id,
        notes: f.notes || undefined,
      };

      if (isPreform) {
        // Preform: must use the cavities × cycles × boxes calculator
        const calcTotal = f.boxes.reduce((s, b) =>
          s + (parseInt(b.cavities) || 0) * (parseInt(b.cycles) || 0) * (parseInt(b.numberOfBoxes) || 0), 0);
        if (calcTotal <= 0) {
          patchForm(machine.id, { saving: false, error: isAr ? "أدخل القيم في الحاسبة (كافيتي × دورات × صناديق)" : "Enter values in the calculator (cavities × cycles × boxes)" });
          return;
        }
        body.boxes = f.boxes.map((b) => ({
          cavities: parseInt(b.cavities) || 72,
          cycles: parseInt(b.cycles) || 0,
          numberOfBoxes: parseInt(b.numberOfBoxes) || 1,
        }));
      } else {
        // Caps / other: simple carton count
        const n = parseInt(f.cartonsCount);
        if (!n || n <= 0) {
          patchForm(machine.id, { saving: false, error: isAr ? "أدخل عدد الكراتين" : "Enter cartons count" });
          return;
        }
        body.cartonsCount = n;
      }

      const res = await fetchWithAuth("/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      patchForm(machine.id, { ...emptyForm(machine.type), success: isAr ? "تم الحفظ ✓" : "Saved ✓" });
      void loadAll();
    } catch (err) {
      patchForm(machine.id, { saving: false, error: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const myPreforms = myRecords.filter((r) => isPreformMachine(r.machine?.type));
  const myCaps = myRecords.filter((r) => isCapsMachine(r.machine?.type));
  const dailyData = adminOverview?.dailyByProduct ?? [];
  const shiftData = adminOverview?.byShiftProduct ?? [];

  return (
    <ModulePageShell
      title={isAr ? "الإنتاج" : "Production"}
      subtitle={isAr ? "تسجيل إنتاج البريفورم والكابس" : "Record Preform & CAPS piece production"}
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={() => void loadAll()}>
          {isAr ? "تحديث" : "Refresh"}
        </button>
      }
    >
      {loading && <TruckLoader />}

      {/* ── Active shift banner ─────────────────────────────── */}
      {shifts.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: ".875rem",
          padding: "1rem 1.25rem", marginBottom: "1.25rem",
          background: currentShift ? "linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.06))" : "var(--bg-surface)",
          border: `1.5px solid ${currentShift ? "rgba(16,185,129,.4)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-xl)",
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
            background: currentShift ? "#10b981" : "var(--text-secondary)",
            boxShadow: currentShift ? "0 0 0 4px rgba(16,185,129,.2)" : "none",
          }} />
          <div style={{ flex: 1 }}>
            {currentShift ? (
              <>
                <span style={{ fontSize: ".75rem", fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {isAr ? "الشفت الحالي" : "Current Shift"}
                </span>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: ".1rem" }}>
                  {currentShift.name}
                  {currentShift.startTime && currentShift.endTime && (
                    <span style={{ fontSize: ".82rem", fontWeight: 500, color: "var(--text-secondary)", marginInlineStart: ".6rem" }}>
                      {formatShiftTime(currentShift.startTime)} – {formatShiftTime(currentShift.endTime)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {isAr ? "حالة الشفت" : "Shift Status"}
                </span>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-secondary)", marginTop: ".1rem" }}>
                  {isAr ? "لا يوجد شفت نشط حالياً" : "No active shift right now"}
                </div>
              </>
            )}
          </div>
          {shifts.map((s) => s.startTime && s.endTime && (
            <div key={s.id} style={{
              padding: ".3rem .75rem", borderRadius: "999px", fontSize: ".75rem", fontWeight: 600,
              background: currentShift?.id === s.id ? "rgba(16,185,129,.15)" : "var(--bg-card)",
              color: currentShift?.id === s.id ? "#059669" : "var(--text-secondary)",
              border: `1px solid ${currentShift?.id === s.id ? "rgba(16,185,129,.35)" : "var(--border-default)"}`,
            }}>
              {s.name} {formatShiftTime(s.startTime)}–{formatShiftTime(s.endTime)}
            </div>
          ))}
        </div>
      )}

      {/* ── Machine recording form (WORKER / ENGINEER / ADMIN) ── */}
      {canCreate && (
        <div style={{ marginBottom: "1.5rem" }}>
          {/* Quick link to electricity recording */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: ".75rem" }}>
            <a href="/electricity"
              style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".45rem 1rem", borderRadius: 8, border: "1px solid rgba(249,115,22,.35)", background: "rgba(249,115,22,.07)", color: "#ea580c", fontWeight: 700, fontSize: ".82rem", textDecoration: "none" }}>
              ⚡ {isAr ? "تسجيل قراءة الكهرباء" : "Record Electricity Reading"}
            </a>
          </div>

          {machines.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", background: "var(--bg-card)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>🏭</div>
              <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: ".25rem" }}>
                {isAr ? "لا توجد ماكينات متاحة" : "No machines available"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>
                {isAr ? "اطلب من المدير إضافة ماكينات، أو سجّل المواد في صفحة الاستهلاك" : "Ask your admin to add machines, or record materials on the Consumption page"}
              </p>
            </div>
          ) : (
            <div className="machine-form-grid">
              {machines.map((machine) => {
                const f = getForm(machine);
                const isPreform = isPreformMachine(machine.type);
                const isCaps = isCapsMachine(machine.type);
                const accent = isPreform ? "var(--brand-primary)" : isCaps ? "#f97316" : "#8b5cf6";

                const calcTotal = f.showCalculator
                  ? f.boxes.reduce((s, b) => s + boxTotal(b), 0)
                  : 0;

                return (
                  <div key={machine.id} className="machine-form-card">
                    {/* Header */}
                    <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".6rem" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{machine.name}</h3>
                      {machine.type && (
                        <span style={{ fontSize: ".7rem", padding: ".2rem .5rem", borderRadius: "999px", background: isPreform ? "rgba(59,130,246,.12)" : "rgba(249,115,22,.12)", color: accent, fontWeight: 700 }}>
                          {machine.type.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="machine-form-card__body">
                      {/* Shift badge */}
                      <div style={{ marginBottom: "1rem" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: ".35rem",
                          padding: ".3rem .75rem",
                          background: currentShift ? "rgba(16,185,129,.1)" : "var(--bg-surface)",
                          border: `1px solid ${currentShift ? "rgba(16,185,129,.35)" : "var(--border-default)"}`,
                          borderRadius: "999px", fontSize: ".8rem", fontWeight: 600,
                          color: currentShift ? "#059669" : "var(--text-secondary)",
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: currentShift ? "#10b981" : "var(--text-secondary)", flexShrink: 0 }} />
                          {currentShift
                            ? `${currentShift.name}${currentShift.startTime && currentShift.endTime ? ` (${formatShiftTime(currentShift.startTime)} – ${formatShiftTime(currentShift.endTime)})` : ""}`
                            : (isAr ? "لا يوجد شفت" : "No shift")}
                        </span>
                      </div>

                      {f.error && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{f.error}</div>}
                      {f.success && <div className="auth-alert" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{f.success}</div>}

                      <form className="module-form" onSubmit={(e) => void submitProduction(e, machine)}>

                        {/* ── PREFORM: cavities × cycles × boxes calculator ── */}
                        {isPreform && (
                          <div style={{ background: "var(--bg-surface)", border: `1px solid ${accent}22`, borderRadius: "var(--radius-lg)", padding: ".875rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                              <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {isAr ? "كافيتي × دورات × صناديق" : "Cavities × Cycles × Boxes"}
                              </span>
                              {calcTotal > 0 && (
                                <span style={{ fontSize: "1rem", fontWeight: 800, color: accent }}>
                                  = {fmt(calcTotal)} {isAr ? "قطعة" : "pcs"}
                                </span>
                              )}
                            </div>

                            <div style={{ overflowX: "auto", marginInline: "-.1rem" }}>
                            {/* column headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: ".4rem", fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: ".35rem", padding: "0 .1rem", minWidth: "360px" }}>
                              <span>{isAr ? "كافيتي" : "Cavities"}</span>
                              <span>{isAr ? "دورات" : "Cycles"}</span>
                              <span>{isAr ? "صناديق" : "Boxes"}</span>
                              <span>{isAr ? "إجمالي" : "Total pcs"}</span>
                              <span />
                            </div>

                            {f.boxes.map((box, idx) => {
                              const t = boxTotal(box);
                              return (
                                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: ".4rem", alignItems: "center", marginBottom: ".4rem", minWidth: "360px" }}>
                                  <input type="number" min={1} max={96} value={box.cavities} placeholder="72"
                                    onChange={(e) => patchForm(machine.id, { boxes: f.boxes.map((b, i) => i === idx ? { ...b, cavities: e.target.value } : b) })}
                                    style={{ padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", width: "100%" }} />
                                  <input type="number" min={0} value={box.cycles} placeholder="0"
                                    onChange={(e) => patchForm(machine.id, { boxes: f.boxes.map((b, i) => i === idx ? { ...b, cycles: e.target.value } : b) })}
                                    style={{ padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", width: "100%" }} />
                                  <input type="number" min={1} value={box.numberOfBoxes} placeholder="1"
                                    onChange={(e) => patchForm(machine.id, { boxes: f.boxes.map((b, i) => i === idx ? { ...b, numberOfBoxes: e.target.value } : b) })}
                                    style={{ padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", width: "100%" }} />
                                  <span style={{ fontSize: ".82rem", fontWeight: 800, color: t > 0 ? accent : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                    {t > 0 ? fmt(t) : "—"}
                                  </span>
                                  {f.boxes.length > 1
                                    ? <button type="button" onClick={() => patchForm(machine.id, { boxes: f.boxes.filter((_, i) => i !== idx) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "1rem", padding: "0 .2rem" }}>✕</button>
                                    : <span />}
                                </div>
                              );
                            })}

                            </div>{/* end overflow-x scroll wrapper */}

                            <button type="button" onClick={() => patchForm(machine.id, { boxes: [...f.boxes, defaultBox(machine.type)] })}
                              style={{ marginTop: ".25rem", background: "none", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", padding: ".3rem .65rem", fontSize: ".78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                              + {isAr ? "إضافة صف" : "Add row"}
                            </button>

                            {calcTotal > 0 && (
                              <div style={{ marginTop: ".75rem", padding: ".6rem .875rem", background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>{isAr ? "الإجمالي الكلي" : "Grand Total"}</span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: accent }}>{fmt(calcTotal)} {isAr ? "قطعة" : "pcs"}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── CAPS: cartons × 6,000 ── */}
                        {isCaps && (
                          <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: ".4rem", fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
                              {isAr ? "عدد الكراتين المنتجة" : "Cartons Produced"}
                              <input
                                type="number"
                                min={1}
                                value={f.cartonsCount}
                                onChange={(e) => patchForm(machine.id, { cartonsCount: e.target.value })}
                                placeholder={isAr ? "مثال: 50" : "e.g. 50"}
                                style={{
                                  padding: ".65rem .85rem",
                                  border: `2px solid ${accent}`,
                                  borderRadius: "var(--radius-lg)",
                                  background: "var(--bg-card)",
                                  fontSize: "1.15rem",
                                  fontWeight: 700,
                                  color: "var(--text-primary)",
                                  width: "100%",
                                }}
                              />
                            </label>
                            {f.cartonsCount && parseInt(f.cartonsCount) > 0 && (
                              <div style={{ padding: ".65rem .875rem", background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: ".82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                  {parseInt(f.cartonsCount).toLocaleString()} {isAr ? "كرتون × 6,000" : "cartons × 6,000"}
                                </span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: accent }}>
                                  = {fmt(parseInt(f.cartonsCount) * 6000)} {isAr ? "قطعة" : "pcs"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Unknown machine type: simple carton input ── */}
                        {!isPreform && !isCaps && (
                          <label style={{ display: "flex", flexDirection: "column", gap: ".4rem", fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
                            {isAr ? "عدد الكراتين / الصناديق" : "Cartons / Boxes"}
                            <input
                              type="number" min={1} value={f.cartonsCount}
                              onChange={(e) => patchForm(machine.id, { cartonsCount: e.target.value })}
                              placeholder={isAr ? "مثال: 50" : "e.g. 50"}
                              style={{ padding: ".6rem .75rem", border: `2px solid ${accent}`, borderRadius: "var(--radius-lg)", background: "var(--bg-card)", fontSize: "1.1rem", fontWeight: 700, width: "100%" }}
                            />
                          </label>
                        )}

                        {/* ── Materials ── */}
                        <label>{isAr ? "ملاحظات" : "Notes"}
                          <textarea rows={2} value={f.notes} onChange={(e) => patchForm(machine.id, { notes: e.target.value })}
                            placeholder={isAr ? "ملاحظات اختيارية..." : "Optional notes..."} />
                        </label>

                        <button type="submit" className="auth-button" disabled={f.saving} style={{ width: "100%" }}>
                          {f.saving
                            ? (isAr ? "جاري الحفظ..." : "Saving...")
                            : (isAr ? `حفظ إنتاج ${machine.name}` : `Save ${machine.name} Production`)}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── My recent records (non-admin who can create) ─────── */}
      {canCreate && !isAdmin && myRecords.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff" }}>
              <span style={{ fontSize: "1.2rem" }}>🏭</span>
              <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", opacity: .85 }}>{isAr ? "سجلات البريفورم" : "Preform Records"}</p>
              <p style={{ margin: ".2rem 0 0", fontSize: "1.6rem", fontWeight: 800 }}>{myPreforms.length}</p>
              <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myPreforms.reduce((s, r) => s + (r.totalPieces ?? 0), 0))} {isAr ? "قطعة" : "pcs"}</p>
            </div>
            <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff" }}>
              <span style={{ fontSize: "1.2rem" }}>🧢</span>
              <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", opacity: .85 }}>{isAr ? "سجلات الكابس" : "Caps Records"}</p>
              <p style={{ margin: ".2rem 0 0", fontSize: "1.6rem", fontWeight: 800 }}>{myCaps.length}</p>
              <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myCaps.reduce((s, r) => s + (r.totalPieces ?? 0), 0))} {isAr ? "قطعة" : "pcs"}</p>
            </div>
          </div>
          <div className="module-panel" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginBottom: ".75rem" }}>{isAr ? "آخر سجلاتي" : "My Recent Records"}</h2>
            <div className="module-list">
              {myRecords.slice(0, 8).map((r) => (
                <div className="module-row" key={r.id}>
                  <strong>
                    {new Date(r.createdAt).toLocaleString()}{" "}
                    <span style={{ fontSize: ".72rem", padding: ".15rem .45rem", borderRadius: "999px", background: isPreformMachine(r.machine?.type) ? "rgba(59,130,246,.12)" : "rgba(249,115,22,.12)", color: isPreformMachine(r.machine?.type) ? "#1d4ed8" : "#ea580c", fontWeight: 700 }}>
                      {isPreformMachine(r.machine?.type) ? "PREFORM" : "CAPS"}
                    </span>
                  </strong>
                  <span>{r.machine?.name ?? "—"} • {isAr ? "الشفت" : "Shift"}: {r.shift?.name ?? "—"}</span>
                  <small>{r.cartonsCount ?? 0} {isAr ? "كرتون" : "cartons"} • {fmt(r.totalPieces ?? 0)} {isAr ? "قطعة" : "pcs"}</small>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── ADMIN analytics tabs ─────────────────────────────── */}
      {isAdmin && (
        <>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", padding: "1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {isAr ? "من تاريخ" : "From Date"}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {isAr ? "إلى تاريخ" : "To Date"}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFromDate(""); setToDate(""); }}>{isAr ? "مسح" : "Clear"}</button>
          </div>

          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {([ ["overview", isAr ? "نظرة عامة" : "Overview"], ["daily", isAr ? "يومي" : "Daily"], ["shifts", isAr ? "الشفتات" : "Shifts"], ["records", isAr ? "السجلات" : "Records"], ["workers", isAr ? "العمال" : "Workers"] ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setAdminTab(key)}
                style={{ padding: ".45rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: adminTab === key ? "var(--orange-500,#f97316)" : "var(--bg-surface)", color: adminTab === key ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".83rem", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {adminTab === "overview" && adminOverview && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                {[
                  { label: isAr ? "إجمالي السجلات" : "Total Records", value: adminOverview.totals.totalRecords, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "📋" },
                  { label: isAr ? "إجمالي الكراتين" : "Total Cartons", value: fmt(adminOverview.totals.totalCartons), gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "📦" },
                  { label: isAr ? "إجمالي القطع" : "Total Pieces", value: fmt(adminOverview.totals.totalPieces), gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🔢" },
                  { label: isAr ? "كراتين الكابس" : "Caps Cartons", value: fmt(dailyData.reduce((s, d) => s + d.capsCartons, 0)), gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🧢" },
                  { label: isAr ? "صناديق البريفورم" : "Preform Boxes", value: fmt(dailyData.reduce((s, d) => s + d.preformCartons, 0)), gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)", icon: "🏭" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
                    <span style={{ fontSize: "1.3rem" }}>{kpi.icon}</span>
                    <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{kpi.label}</p>
                    <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>{kpi.value}</p>
                  </div>
                ))}
              </div>
              {(adminOverview.byShift ?? []).length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? "ملخص حسب الشفت" : "Summary by Shift"}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead><tr><th>{isAr ? "الشفت" : "Shift"}</th><th>{isAr ? "السجلات" : "Records"}</th><th>{isAr ? "الكراتين" : "Cartons"}</th><th>{isAr ? "القطع" : "Pieces"}</th></tr></thead>
                      <tbody>
                        {(adminOverview.byShift ?? []).map((row) => (
                          <tr key={row.shiftId ?? "none"}>
                            <td style={{ fontWeight: 600 }}>{row.shiftName}</td>
                            <td>{row.recordsCount}</td>
                            <td>{fmt(row.cartonsCount)}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {adminTab === "daily" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? "التقرير اليومي" : "Daily Production Report"}</div>
              {dailyData.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead><tr>{[isAr ? "التاريخ" : "Date", isAr ? "كراتين الكابس" : "Caps Cartons", isAr ? "صناديق البريفورم" : "Preform Boxes", isAr ? "إجمالي القطع" : "Total Pcs"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{dailyData.map((row) => <tr key={row.date}><td style={{ fontWeight: 700 }}>{row.date}</td><td>{fmt(row.capsCartons)}</td><td>{fmt(row.preformCartons)}</td><td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === "shifts" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? "إنتاج الشفتات يومياً" : "Shift Production Breakdown"}</div>
              {shiftData.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead><tr>{[isAr ? "التاريخ" : "Date", isAr ? "الشفت" : "Shift", isAr ? "كراتين الكابس" : "Caps", isAr ? "صناديق البريفورم" : "Preform", isAr ? "القطع" : "Pcs"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{shiftData.map((row) => <tr key={`${row.date}-${row.shiftId}`}><td style={{ fontWeight: 600 }}>{row.date}</td><td>{row.shiftName}</td><td>{fmt(row.capsCartons)}</td><td>{fmt(row.preformCartons)}</td><td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === "records" && (() => {
            const records = (adminOverview?.recentRecords ?? allRecords).filter((r) => (r.cartonsCount ?? 0) > 0 || r.machine != null);
            return (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? `السجلات (${records.length})` : `Records (${records.length})`}</div>
                {records.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد سجلات" : "No records"}</div> : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead><tr>{[isAr ? "التاريخ" : "Date", isAr ? "العامل" : "Worker", isAr ? "الآلة" : "Machine", isAr ? "الشفت" : "Shift", isAr ? "كراتين" : "Cartons", isAr ? "القطع" : "Pieces"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {records.slice(0, 50).map((r) => (
                          <tr key={r.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                            <td>{r.machine?.name ?? "—"} <span style={{ fontSize: ".7rem", padding: ".1rem .3rem", borderRadius: "4px", background: "rgba(249,115,22,.1)", color: "#ea580c" }}>{isPreformMachine(r.machine?.type) ? "PRE" : "CAPS"}</span></td>
                            <td>{r.shift?.name ?? "—"}</td>
                            <td>{r.cartonsCount ?? 0}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(r.totalPieces ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {adminTab === "workers" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? "الإنتاج حسب العامل" : "Production by Worker"}</div>
              {(adminOverview?.byUser ?? []).length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>{isAr ? "الاسم" : "Name"}</th><th>{isAr ? "السجلات" : "Records"}</th><th>{isAr ? "الكراتين" : "Cartons"}</th><th>{isAr ? "القطع" : "Pieces"}</th></tr></thead>
                    <tbody>
                      {(adminOverview?.byUser ?? []).map((w, i) => (
                        <tr key={w.userId}>
                          <td style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700 }}>{w.fullName}</td>
                          <td>{w.recordsCount}</td>
                          <td>{fmt(w.cartonsCount)}</td>
                          <td style={{ fontWeight: 800, color: "var(--brand-primary)" }}>{fmt(w.totalPieces)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ACCOUNTANT / ENGINEER: read-only table ─────────── */}
      {(isAccountant || (!isAdmin && canSeeAll)) && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginTop: isAccountant ? 0 : "1.5rem" }}>
          <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{isAr ? `سجلات الإنتاج (${allRecords.length})` : `Production Records (${allRecords.length})`}</div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr>{[isAr ? "التاريخ" : "Date", isAr ? "العامل" : "Worker", isAr ? "الآلة" : "Machine", isAr ? "الشفت" : "Shift", isAr ? "كراتين" : "Cartons", isAr ? "القطع" : "Pieces"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {allRecords.slice(0, 50).map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg-surface)" }}>
                    <td style={{ padding: ".5rem .875rem", whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: ".5rem .875rem", fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                    <td style={{ padding: ".5rem .875rem" }}>{r.machine?.name ?? "—"}</td>
                    <td style={{ padding: ".5rem .875rem" }}>{r.shift?.name ?? "—"}</td>
                    <td style={{ padding: ".5rem .875rem" }}>{r.cartonsCount ?? 0}</td>
                    <td style={{ padding: ".5rem .875rem", fontWeight: 700 }}>{fmt(r.totalPieces ?? 0)}</td>
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
