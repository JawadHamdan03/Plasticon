import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, pictureUrl as globalPictureUrl, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";

/* ─── Machine type / material helpers ────────────────────── */
function decodeMachineType(raw: string | null): { typeName: string; materials: string[] } {
  if (!raw) return { typeName: "", materials: [] };
  const idx = raw.indexOf(":");
  if (idx === -1) return { typeName: raw, materials: [] };
  return {
    typeName: raw.slice(0, idx),
    materials: raw.slice(idx + 1).split(",").filter(Boolean),
  };
}
function getMachineMaterials(type: string | null): string[] {
  if (!type) return ["HDPE", "LDPE", "COLOR"];
  const { materials } = decodeMachineType(type);
  if (materials.length > 0) return materials;
  const t = type.toUpperCase();
  if (t.includes("PREFORM") || t.includes("PET")) return ["PET", "COLOR"];
  if (t.includes("CAP")) return ["HDPE", "LDPE", "COLOR"];
  return ["HDPE", "LDPE", "COLOR"];
}

/* ─── Types ─────────────────────────────────────────────── */
type Machine = { id: number; name: string; type: string | null };
type Shift = { id: number; name: string; startTime?: string | null; endTime?: string | null };
type BoxEntry = { cavities: string; cycles: string; numberOfBoxes: string };
type MachineForm = {
  cartonsCount: string;
  showCalculator: boolean;
  boxes: BoxEntry[];
  notes: string;
  photoFile: File | null;
  saving: boolean; error: string; success: string;
  // material fields
  hdpeBags: string; hdpeKgPerBag: string;
  ldpeBags: string; ldpeKgPerBag: string;
  petBags: string;  petKgPerBag: string;
  colorKg: string;
  adhesiveKg: string;
  emptyBags: string;
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
  documentPath?: string | null;
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
  showCalculator: isPreformMachine(type),
  boxes: [defaultBox(type)],
  notes: "",
  photoFile: null,
  saving: false, error: "", success: "",
  hdpeBags: "", hdpeKgPerBag: "25",
  ldpeBags: "", ldpeKgPerBag: "25",
  petBags: "",  petKgPerBag: "",
  colorKg: "",
  adhesiveKg: "",
  emptyBags: "",
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

/* ─── Grouping helpers ──────────────────────────────────── */
type DayGroup = {
  date: string;
  shifts: Array<{ shiftId: number | null; shiftName: string; capsCartons: number; preformCartons: number; totalCartons: number; totalPieces: number }>;
  totalCartons: number;
  totalPieces: number;
  capsCartons: number;
  preformCartons: number;
};

function groupByDay(data: AdminOverviewResponse["byShiftProduct"]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const row of data ?? []) {
    let g = map.get(row.date);
    if (!g) {
      g = { date: row.date, shifts: [], totalCartons: 0, totalPieces: 0, capsCartons: 0, preformCartons: 0 };
      map.set(row.date, g);
    }
    g.shifts.push(row);
    g.totalCartons += row.totalCartons;
    g.totalPieces += row.totalPieces;
    g.capsCartons += row.capsCartons;
    g.preformCartons += row.preformCartons;
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
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
  const [adminTab, setAdminTab] = useState<"overview" | "daily" | "shifts" | "records" | "workers" | "electricity">("overview");
  const [prodViewMode, setProdViewMode] = useState<"summary" | "records">("summary");
  const [elKwhPrice, setElKwhPrice] = useState<{ id: number; price: number } | null>(null);
  const [elReadings, setElReadings] = useState<Array<{
    id: number; date: string; shift: { id: number; name: string };
    startReading: number; endReading: number; consumption: number;
    kwhPriceSnap: number; shiftCost: number; notes: string | null;
    recordedBy: { fullName: string };
  }>>([]);
  const [elFromDate, setElFromDate] = useState("");
  const [elToDate, setElToDate] = useState("");
  const [elShiftId, setElShiftId] = useState("");
  const [elKwhInput, setElKwhInput] = useState("");
  const [elLoading, setElLoading] = useState(false);
  const [elPriceSaving, setElPriceSaving] = useState(false);
  const [forms, setForms] = useState<Record<number, MachineForm>>({});
  const [filterMachineId, setFilterMachineId] = useState<string>("");
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
        setMyRecords(Array.isArray(all) ? all : []);
      }
      if (canSeeAll) {
        const allRes = await fetchWithAuth("/production/all");
        if (allRes.ok) {
          const all = (await allRes.json()) as ProductionItem[];
          setAllRecords(Array.isArray(all) ? all : []);
        }
      }
      if (isAdmin || isAccountant) {
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

  const loadElectricity = useCallback(async () => {
    setElLoading(true);
    try {
      const qs = new URLSearchParams();
      if (elFromDate) qs.set("fromDate", elFromDate);
      if (elToDate) qs.set("toDate", elToDate);
      if (elShiftId) qs.set("shiftId", elShiftId);
      const [prRes, rdRes] = await Promise.all([
        fetchWithAuth("/electricity/kwh-price"),
        fetchWithAuth(`/electricity/readings?${qs.toString()}`),
      ]);
      if (prRes.ok) { const d = await prRes.json(); setElKwhPrice(d); setElKwhInput(String(d?.price ?? "")); }
      if (rdRes.ok) { const d = await rdRes.json(); setElReadings(Array.isArray(d) ? d : []); }
    } catch { /* silent */ }
    finally { setElLoading(false); }
  }, [elFromDate, elToDate, elShiftId]);

  useEffect(() => { if (adminTab === "electricity") void loadElectricity(); }, [adminTab, loadElectricity]);

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
          patchForm(machine.id, { saving: false, error: "أدخل القيم في الحاسبة (كافيتي × دورات × صناديق)" });
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
          patchForm(machine.id, { saving: false, error: "أدخل عدد الكراتين" });
          return;
        }
        body.cartonsCount = n;
      }

      // Append any material consumption entered for this machine
      const hdpeBags = parseFloat(f.hdpeBags) || 0;
      if (hdpeBags > 0) body.rawHdpeUsed = hdpeBags * (parseFloat(f.hdpeKgPerBag) || 25);
      const ldpeBags = parseFloat(f.ldpeBags) || 0;
      if (ldpeBags > 0) body.rawLdpeUsed = ldpeBags * (parseFloat(f.ldpeKgPerBag) || 25);
      const petBags = parseFloat(f.petBags) || 0;
      if (petBags > 0) body.rawPetUsed = petBags * (parseFloat(f.petKgPerBag) || 25);
      if (parseFloat(f.colorKg) > 0) body.colorUsed = parseFloat(f.colorKg);
      if (parseFloat(f.adhesiveKg) > 0) body.adhesiveUsed = parseFloat(f.adhesiveKg);
      if (parseFloat(f.emptyBags) > 0) body.emptyBagsUsed = parseFloat(f.emptyBags);

      let res: Response;
      if (f.photoFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(body)) {
          if (v !== undefined && v !== null) {
            fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
          }
        }
        fd.append("document", f.photoFile);
        res = await fetchWithAuth("/production", { method: "POST", body: fd });
      } else {
        res = await fetchWithAuth("/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error(await readApiError(res));
      patchForm(machine.id, { ...emptyForm(machine.type), success: "تم الحفظ ✓" });
      void loadAll();
    } catch (err) {
      patchForm(machine.id, { saving: false, error: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyRecordedForMachine = (machineId: number) =>
    currentShift !== null &&
    myRecords.some(
      (r) =>
        r.machineId === machineId &&
        r.shiftId === currentShift.id &&
        r.createdAt.slice(0, 10) === todayStr,
    );

  const myPreforms = myRecords.filter((r) => isPreformMachine(r.machine?.type));
  const myCaps = myRecords.filter((r) => isCapsMachine(r.machine?.type));
  const dailyData = adminOverview?.dailyByProduct ?? [];
  const shiftData = adminOverview?.byShiftProduct ?? [];
  const dayGroups = groupByDay(adminOverview?.byShiftProduct);

  const shiftColors = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#06b6d4"];

  const ProdSummaryView = ({ groups }: { groups: DayGroup[] }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {groups.length === 0 ? (
        <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)" }}>
          {"لا توجد بيانات إنتاج"}
        </div>
      ) : groups.map((day) => (
        <div key={day.date} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          {/* Day header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".875rem 1.25rem", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <span style={{ fontSize: "1.1rem" }}>📅</span>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>{day.date}</span>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                🧢 {fmt(day.capsCartons)} {"كرتون"}
                &nbsp;·&nbsp;
                🏭 {fmt(day.preformCartons)} {"صندوق"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".3rem .875rem", borderRadius: 999, background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.25)" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#1d4ed8" }}>
                  {fmt(day.totalPieces)} {"قطعة"}
                </span>
              </div>
            </div>
          </div>
          {/* Shift breakdown */}
          <div style={{ padding: ".75rem 1.25rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
            {day.shifts.map((sh, i) => {
              const color = shiftColors[i % shiftColors.length];
              const pct = day.totalPieces > 0 ? (sh.totalPieces / day.totalPieces) * 100 : 0;
              return (
                <div key={sh.shiftId ?? i} style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: ".75rem", alignItems: "center" }}>
                  <span style={{ fontSize: ".8rem", fontWeight: 700, color, padding: ".25rem .6rem", borderRadius: 999, background: `${color}15`, border: `1px solid ${color}30`, textAlign: "center", whiteSpace: "nowrap" }}>
                    {sh.shiftName}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg-surface)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap", minWidth: 34 }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: ".75rem", fontSize: ".8rem", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    <span>🧢 {fmt(sh.capsCartons)}</span>
                    <span>🏭 {fmt(sh.preformCartons)}</span>
                    <span style={{ color, minWidth: 90, textAlign: "end" }}>{fmt(sh.totalPieces)} {"قطعة"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Day total row */}
          <div style={{ padding: ".5rem 1.25rem .75rem", display: "flex", justifyContent: "flex-end", gap: "1.25rem", borderTop: "1px solid var(--border-default)", background: "var(--bg-surface)" }}>
            <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              {"إجمالي اليوم:"}&nbsp;
              <span style={{ color: "#1d4ed8" }}>{fmt(day.totalCartons)} {"كرتون"}</span>
              &nbsp;·&nbsp;
              <span style={{ color: "#059669" }}>{fmt(day.totalPieces)} {"قطعة"}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <ModulePageShell
      title={"الإنتاج"}
      subtitle={"تسجيل إنتاج البريفورم والكابس"}
      actions={
        <button type="button" className="auth-button auth-button--ghost" onClick={() => void loadAll()}>
          {"تحديث"}
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
                  {"الشفت الحالي"}
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
                  {"حالة الشفت"}
                </span>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-secondary)", marginTop: ".1rem" }}>
                  {"لا يوجد شفت نشط حالياً"}
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
              ⚡ {"تسجيل قراءة الكهرباء"}
            </a>
          </div>

          {machines.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", background: "var(--bg-card)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>🏭</div>
              <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: ".25rem" }}>
                {"لا توجد ماكينات متاحة"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>
                {"اطلب من المدير إضافة ماكينات، أو سجّل المواد في صفحة الاستهلاك"}
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
                            : ("لا يوجد شفت")}
                        </span>
                      </div>

                      {alreadyRecordedForMachine(machine.id) && (
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
                            ? `تم تسجيل إنتاج ${machine.name} في هذا الشفت اليوم — يمكنك إضافة سجل آخر إذا لزم`
                            : `Production for ${machine.name} already recorded this shift today — you can still add another if needed`}
                        </div>
                      )}
                      {f.error && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{f.error}</div>}
                      {f.success && <div className="auth-alert" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{f.success}</div>}

                      <form className="module-form" onSubmit={(e) => void submitProduction(e, machine)}>

                        {/* ── PREFORM: cavities × cycles × boxes calculator ── */}
                        {isPreform && (
                          <div style={{ background: "var(--bg-surface)", border: `1px solid ${accent}22`, borderRadius: "var(--radius-lg)", padding: ".875rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                              <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {"كافيتي × دورات × صناديق"}
                              </span>
                              {calcTotal > 0 && (
                                <span style={{ fontSize: "1rem", fontWeight: 800, color: accent }}>
                                  = {fmt(calcTotal)} {"قطعة"}
                                </span>
                              )}
                            </div>

                            <div style={{ overflowX: "auto", marginInline: "-.1rem" }}>
                            {/* column headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: ".4rem", fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: ".35rem", padding: "0 .1rem", minWidth: "360px" }}>
                              <span>{"كافيتي"}</span>
                              <span>{"دورات"}</span>
                              <span>{"صناديق"}</span>
                              <span>{"إجمالي"}</span>
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
                              + {"إضافة صف"}
                            </button>

                            {calcTotal > 0 && (
                              <div style={{ marginTop: ".75rem", padding: ".6rem .875rem", background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>{"الإجمالي الكلي"}</span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: accent }}>{fmt(calcTotal)} {"قطعة"}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── CAPS: cartons × 6,000 ── */}
                        {isCaps && (
                          <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: ".4rem", fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
                              {"عدد الكراتين المنتجة"}
                              <input
                                type="number"
                                min={1}
                                value={f.cartonsCount}
                                onChange={(e) => patchForm(machine.id, { cartonsCount: e.target.value })}
                                placeholder={"مثال: 50"}
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
                                  {parseInt(f.cartonsCount).toLocaleString()} {"كرتون × 6,000"}
                                </span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: accent }}>
                                  = {fmt(parseInt(f.cartonsCount) * 6000)} {"قطعة"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Unknown machine type: simple carton input ── */}
                        {!isPreform && !isCaps && (
                          <label style={{ display: "flex", flexDirection: "column", gap: ".4rem", fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
                            {"عدد الكراتين / الصناديق"}
                            <input
                              type="number" min={1} value={f.cartonsCount}
                              onChange={(e) => patchForm(machine.id, { cartonsCount: e.target.value })}
                              placeholder={"مثال: 50"}
                              style={{ padding: ".6rem .75rem", border: `2px solid ${accent}`, borderRadius: "var(--radius-lg)", background: "var(--bg-card)", fontSize: "1.1rem", fontWeight: 700, width: "100%" }}
                            />
                          </label>
                        )}

                        {/* ── Materials used this shift ── */}
                        {(() => {
                          const mats = getMachineMaterials(machine.type);
                          const matConfig: Record<string, { label: string; color: string }> = {
                            HDPE:       { label: "HDPE",              color: "#3b82f6" },
                            LDPE:       { label: "LDPE",              color: "#06b6d4" },
                            PET:        { label: "PET",               color: "#10b981" },
                            COLOR:      { label: "لون",     color: "#f97316" },
                            ADHESIVE:   { label: "لاصق", color: "#8b5cf6" },
                            EMPTY_BAGS: { label: "أكياس فارغة", color: "#64748b" },
                          };
                          const bagMats = ["HDPE", "LDPE", "PET"];
                          const kgMats  = ["COLOR", "ADHESIVE"];
                          const cntMats = ["EMPTY_BAGS"];
                          const bagFields: Record<string, { bags: keyof MachineForm; kpb: keyof MachineForm; defaultKpb: string }> = {
                            HDPE: { bags: "hdpeBags", kpb: "hdpeKgPerBag", defaultKpb: "25" },
                            LDPE: { bags: "ldpeBags", kpb: "ldpeKgPerBag", defaultKpb: "25" },
                            PET:  { bags: "petBags",  kpb: "petKgPerBag",  defaultKpb: "" },
                          };
                          const kgFields: Record<string, keyof MachineForm> = {
                            COLOR: "colorKg", ADHESIVE: "adhesiveKg",
                          };
                          if (mats.length === 0) return null;
                          return (
                            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: ".875rem", display: "flex", flexDirection: "column", gap: ".65rem" }}>
                              <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: ".4rem" }}>
                                <span>📦</span>
                                {"المواد المستخدمة في هذا الشفت (اختياري)"}
                              </div>
                              {mats.map((mat) => {
                                const cfg = matConfig[mat];
                                if (!cfg) return null;
                                if (bagMats.includes(mat)) {
                                  const bf = bagFields[mat];
                                  const bags = parseFloat(String(f[bf.bags])) || 0;
                                  const kpb  = parseFloat(String(f[bf.kpb]))  || 0;
                                  const totalKg = bags > 0 && kpb > 0 ? (bags * kpb).toFixed(1) : bags > 0 ? String(bags * 25) : null;
                                  return (
                                    <div key={mat} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: ".5rem", alignItems: "end" }}>
                                      <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".78rem", fontWeight: 600, color: cfg.color }}>
                                        {cfg.label} — {"أكياس"}
                                        <input type="number" min={0} step="0.5" value={String(f[bf.bags])} placeholder="0"
                                          onChange={(e) => patchForm(machine.id, { [bf.bags]: e.target.value } as Partial<MachineForm>)}
                                          style={{ padding: ".35rem .5rem", border: `1px solid ${cfg.color}44`, borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem" }} />
                                      </label>
                                      <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                        {"كغ/كيس"}
                                        <input type="number" min={0} step="0.1" value={String(f[bf.kpb])} placeholder={bf.defaultKpb || "—"}
                                          onChange={(e) => patchForm(machine.id, { [bf.kpb]: e.target.value } as Partial<MachineForm>)}
                                          style={{ padding: ".35rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem" }} />
                                      </label>
                                      {totalKg && (
                                        <div style={{ padding: ".35rem .5rem", background: `${cfg.color}12`, border: `1px solid ${cfg.color}33`, borderRadius: "var(--radius-md)", fontSize: ".8rem", fontWeight: 700, color: cfg.color, whiteSpace: "nowrap" }}>
                                          = {totalKg} kg
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                if (kgMats.includes(mat)) {
                                  const kf = kgFields[mat];
                                  return (
                                    <label key={mat} style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".78rem", fontWeight: 600, color: cfg.color }}>
                                      {cfg.label} (kg)
                                      <input type="number" min={0} step="0.01" value={String(f[kf])} placeholder="0"
                                        onChange={(e) => patchForm(machine.id, { [kf]: e.target.value } as Partial<MachineForm>)}
                                        style={{ padding: ".35rem .5rem", border: `1px solid ${cfg.color}44`, borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", maxWidth: 160 }} />
                                    </label>
                                  );
                                }
                                if (cntMats.includes(mat)) {
                                  return (
                                    <label key={mat} style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".78rem", fontWeight: 600, color: cfg.color }}>
                                      {cfg.label}
                                      <input type="number" min={0} step="1" value={String(f.emptyBags)} placeholder="0"
                                        onChange={(e) => patchForm(machine.id, { emptyBags: e.target.value })}
                                        style={{ padding: ".35rem .5rem", border: `1px solid ${cfg.color}44`, borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", maxWidth: 160 }} />
                                    </label>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        })()}

                        {/* ── Notes ── */}
                        <label>{"ملاحظات"}
                          <textarea rows={2} value={f.notes} onChange={(e) => patchForm(machine.id, { notes: e.target.value })}
                            placeholder={"ملاحظات اختيارية..."} />
                        </label>

                        {/* ── Photo upload ── */}
                        <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                          {"صورة الإنتاج (اختياري)"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ padding: ".3rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".8rem" }}
                            onChange={(e) => patchForm(machine.id, { photoFile: e.target.files?.[0] ?? null })}
                          />
                          {f.photoFile && <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{f.photoFile.name}</span>}
                        </label>

                        <button type="submit" className="auth-button" disabled={f.saving} style={{ width: "100%" }}>
                          {f.saving
                            ? ("جاري الحفظ...")
                            : (`حفظ إنتاج ${machine.name}`)}
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
              <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", opacity: .85 }}>{"سجلات البريفورم"}</p>
              <p style={{ margin: ".2rem 0 0", fontSize: "1.6rem", fontWeight: 800 }}>{myPreforms.length}</p>
              <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myPreforms.reduce((s, r) => s + (r.totalPieces ?? 0), 0))} {"قطعة"}</p>
            </div>
            <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff" }}>
              <span style={{ fontSize: "1.2rem" }}>🧢</span>
              <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", opacity: .85 }}>{"سجلات الكابس"}</p>
              <p style={{ margin: ".2rem 0 0", fontSize: "1.6rem", fontWeight: 800 }}>{myCaps.length}</p>
              <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myCaps.reduce((s, r) => s + (r.totalPieces ?? 0), 0))} {"قطعة"}</p>
            </div>
          </div>
          <div className="module-panel" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginBottom: ".75rem" }}>{"آخر سجلاتي"}</h2>
            <div className="module-list">
              {myRecords.slice(0, 8).map((r) => (
                <div className="module-row" key={r.id}>
                  <strong>
                    {new Date(r.createdAt).toLocaleString()}{" "}
                    <span style={{ fontSize: ".72rem", padding: ".15rem .45rem", borderRadius: "999px", background: isPreformMachine(r.machine?.type) ? "rgba(59,130,246,.12)" : "rgba(249,115,22,.12)", color: isPreformMachine(r.machine?.type) ? "#1d4ed8" : "#ea580c", fontWeight: 700 }}>
                      {isPreformMachine(r.machine?.type) ? "PREFORM" : "CAPS"}
                    </span>
                  </strong>
                  <span>{r.machine?.name ?? "—"} • {"الشفت"}: {r.shift?.name ?? "—"}</span>
                  <small>{r.cartonsCount ?? 0} {"كرتون"} • {fmt(r.totalPieces ?? 0)} {"قطعة"}</small>
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
              {"من تاريخ"}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {"إلى تاريخ"}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFromDate(""); setToDate(""); }}>{"مسح"}</button>
          </div>

          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {([ ["overview", "نظرة عامة"], ["daily", "يومي"], ["shifts", "الشفتات"], ["records", "السجلات"], ["workers", "العمال"], ["electricity", "إدارة الكهرباء"] ] as const).map(([key, label]) => (
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
                  { label: "إجمالي السجلات", value: adminOverview.totals.totalRecords, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "📋" },
                  { label: "إجمالي الكراتين", value: fmt(adminOverview.totals.totalCartons), gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "📦" },
                  { label: "إجمالي القطع", value: fmt(adminOverview.totals.totalPieces), gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🔢" },
                  { label: "كراتين الكابس", value: fmt(dailyData.reduce((s, d) => s + d.capsCartons, 0)), gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🧢" },
                  { label: "صناديق البريفورم", value: fmt(dailyData.reduce((s, d) => s + d.preformCartons, 0)), gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)", icon: "🏭" },
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
                  <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{"ملخص حسب الشفت"}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead><tr><th>{"الشفت"}</th><th>{"السجلات"}</th><th>{"الكراتين"}</th><th>{"القطع"}</th></tr></thead>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
                  {"التقرير اليومي حسب الشفت"}
                </span>
                <div style={{ display: "flex", gap: ".35rem" }}>
                  {(["summary", "records"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setProdViewMode(m)}
                      style={{ padding: ".35rem .875rem", borderRadius: 999, border: "1px solid var(--border-default)", background: prodViewMode === m ? "var(--brand-primary,#3b82f6)" : "var(--bg-surface)", color: prodViewMode === m ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".8rem", cursor: "pointer" }}>
                      {m === "summary" ? ("ملخص يومي") : ("كل السجلات")}
                    </button>
                  ))}
                </div>
              </div>
              {prodViewMode === "summary" ? (
                <ProdSummaryView groups={dayGroups} />
              ) : (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  {dailyData.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div> : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="admin-table">
                        <thead><tr>{["التاريخ", "كراتين الكابس", "صناديق البريفورم", "إجمالي الكراتين", "إجمالي القطع"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {dailyData.map((row) => <tr key={row.date}><td style={{ fontWeight: 700 }}>{row.date}</td><td>{fmt(row.capsCartons)}</td><td>{fmt(row.preformCartons)}</td><td>{fmt(row.totalCartons)}</td><td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td></tr>)}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "var(--bg-surface)", fontWeight: 700 }}>
                            <td>{"الإجمالي"}</td>
                            <td>{fmt(dailyData.reduce((s, r) => s + r.capsCartons, 0))}</td>
                            <td>{fmt(dailyData.reduce((s, r) => s + r.preformCartons, 0))}</td>
                            <td>{fmt(dailyData.reduce((s, r) => s + r.totalCartons, 0))}</td>
                            <td style={{ color: "#1d4ed8" }}>{fmt(dailyData.reduce((s, r) => s + r.totalPieces, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {adminTab === "shifts" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{"إنتاج الشفتات يومياً"}</div>
              {shiftData.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead><tr>{["التاريخ", "الشفت", "كراتين الكابس", "صناديق البريفورم", "القطع"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{shiftData.map((row) => <tr key={`${row.date}-${row.shiftId}`}><td style={{ fontWeight: 600 }}>{row.date}</td><td>{row.shiftName}</td><td>{fmt(row.capsCartons)}</td><td>{fmt(row.preformCartons)}</td><td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === "records" && (() => {
            const allRecs = adminOverview?.recentRecords ?? allRecords;
            const filteredRecs = filterMachineId
              ? allRecs.filter((r) => r.machineId === Number(filterMachineId))
              : allRecs;
            return (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{`السجلات (${filteredRecs.length})`}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {"الآلة:"}
                    <select
                      value={filterMachineId}
                      onChange={(e) => setFilterMachineId(e.target.value)}
                      style={{ padding: ".3rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", fontSize: ".82rem" }}
                    >
                      <option value="">{"الكل"}</option>
                      {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                </div>
                {filteredRecs.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد سجلات"}</div> : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead><tr>{["التاريخ", "العامل", "الآلة", "الشفت", "كراتين", "القطع", "صورة"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredRecs.slice(0, 50).map((r) => (
                          <tr key={r.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                            <td>{r.machine?.name ?? "—"} <span style={{ fontSize: ".7rem", padding: ".1rem .3rem", borderRadius: "4px", background: "rgba(249,115,22,.1)", color: "#ea580c" }}>{isPreformMachine(r.machine?.type) ? "PRE" : "CAPS"}</span></td>
                            <td>{r.shift?.name ?? "—"}</td>
                            <td>{r.cartonsCount ?? 0}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(r.totalPieces ?? 0)}</td>
                            <td>
                              {r.documentPath ? (
                                <a href={globalPictureUrl(r.documentPath)} target="_blank" rel="noreferrer">
                                  <img src={globalPictureUrl(r.documentPath)} alt="doc" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border-default)" }} />
                                </a>
                              ) : "—"}
                            </td>
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
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{"الإنتاج حسب العامل"}</div>
              {(adminOverview?.byUser ?? []).length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{"لا توجد بيانات"}</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>{"الاسم"}</th><th>{"السجلات"}</th><th>{"الكراتين"}</th><th>{"القطع"}</th></tr></thead>
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

          {adminTab === "electricity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Description + Current Price card */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start" }}>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                    <span style={{ fontSize: "1.3rem" }}>⚡</span>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {"إدارة الكهرباء"}
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: ".85rem", color: "var(--text-secondary)" }}>
                    {isAr
                      ? "مراقبة استهلاك الكهرباء حسب الشفت وإدارة سعر الكيلوواط ساعة وعرض تقارير التكلفة"
                      : "Monitor electricity consumption by shift, manage kWh pricing and view cost reports."}
                  </p>
                  {elKwhPrice && (
                    <div style={{ marginTop: ".75rem", display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".35rem .875rem", borderRadius: 99, background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.3)", color: "#ea580c", fontWeight: 700, fontSize: ".85rem" }}>
                      ⚡ {"السعر الحالي:"} {elKwhPrice.price.toFixed(4)} ILS/kWh
                    </div>
                  )}
                </div>

                {/* kWh Price editor */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "1.25rem", minWidth: 220 }}>
                  <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)", marginBottom: ".75rem" }}>
                    {"سعر الكيلوواط"}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                    <input
                      type="number" step="0.0001" min={0}
                      value={elKwhInput}
                      onChange={(e) => setElKwhInput(e.target.value)}
                      placeholder="0.0000"
                      style={{ flex: 1, padding: ".45rem .65rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-card)", fontSize: ".9rem", color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={async () => {
                        const price = parseFloat(elKwhInput);
                        if (!price || price <= 0) return;
                        setElPriceSaving(true);
                        try {
                          await fetchWithAuth("/electricity/kwh-price", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ price }),
                          });
                          void loadElectricity();
                        } catch { /* silent */ }
                        finally { setElPriceSaving(false); }
                      }}
                      disabled={elPriceSaving}
                      style={{ padding: ".45rem .875rem", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", opacity: elPriceSaving ? 0.6 : 1 }}
                    >
                      {elPriceSaving ? "..." : ("حفظ")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Consumption report filter */}
              <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", flexWrap: "wrap", padding: "1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {"من تاريخ"}
                  <input type="date" value={elFromDate} onChange={(e) => setElFromDate(e.target.value)}
                    style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-card)", fontSize: ".875rem" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {"إلى تاريخ"}
                  <input type="date" value={elToDate} onChange={(e) => setElToDate(e.target.value)}
                    style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-card)", fontSize: ".875rem" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {"الشفت"}
                  <select value={elShiftId} onChange={(e) => setElShiftId(e.target.value)}
                    style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-card)", fontSize: ".875rem" }}>
                    <option value="">{"الكل"}</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <button type="button" className="auth-button" style={{ padding: ".45rem 1rem", fontSize: ".85rem" }}
                  onClick={() => void loadElectricity()}>
                  {"تطبيق"}
                </button>
                <button type="button" className="auth-button auth-button--ghost" style={{ padding: ".45rem 1rem", fontSize: ".85rem" }}
                  onClick={() => { setElFromDate(""); setElToDate(""); setElShiftId(""); }}>
                  {"مسح"}
                </button>
              </div>

              {/* Consumption Report table */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: ".9rem" }}>
                    {`تقرير الاستهلاك (${elReadings.length})`}
                  </span>
                  {elReadings.length > 0 && (
                    <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#ea580c" }}>
                      {"الإجمالي:"} {elReadings.reduce((s, r) => s + r.consumption, 0).toFixed(2)} kWh
                      {" · "}
                      {elReadings.reduce((s, r) => s + r.shiftCost, 0).toFixed(2)} ILS
                    </span>
                  )}
                </div>
                {elLoading ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    {"جاري التحميل..."}
                  </div>
                ) : elReadings.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    {"لا توجد بيانات"}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{"التاريخ"}</th>
                          <th>{"الشفت"}</th>
                          <th>{"البداية"}</th>
                          <th>{"النهاية"}</th>
                          <th>{"الاستهلاك"}</th>
                          <th>{"التكلفة"}</th>
                          <th>{"بواسطة"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {elReadings.map((r) => (
                          <tr key={r.id}>
                            <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{r.date.slice(0, 10)}</td>
                            <td>{r.shift.name}</td>
                            <td>{r.startReading.toLocaleString()}</td>
                            <td>{r.endReading.toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: "#ea580c" }}>{r.consumption.toFixed(2)}</td>
                            <td style={{ fontWeight: 700 }}>{r.shiftCost.toFixed(2)}</td>
                            <td style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{r.recordedBy.fullName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ACCOUNTANT: grouped daily/shift summary ─────────── */}
      {isAccountant && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* KPI cards */}
          {adminOverview && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              {[
                { label: "إجمالي السجلات", value: adminOverview.totals.totalRecords, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "📋" },
                { label: "إجمالي الكراتين", value: fmt(adminOverview.totals.totalCartons), gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "📦" },
                { label: "إجمالي القطع", value: fmt(adminOverview.totals.totalPieces), gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🔢" },
                { label: "كراتين الكابس", value: fmt(dailyData.reduce((s, d) => s + d.capsCartons, 0)), gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🧢" },
                { label: "صناديق البريفورم", value: fmt(dailyData.reduce((s, d) => s + d.preformCartons, 0)), gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)", icon: "🏭" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
                  <span style={{ fontSize: "1.3rem" }}>{kpi.icon}</span>
                  <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{kpi.label}</p>
                  <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
            <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)" }}>
              {"الإنتاج حسب اليوم والشفت"}
            </span>
            <div style={{ display: "flex", gap: ".35rem" }}>
              {(["summary", "records"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setProdViewMode(m)}
                  style={{ padding: ".35rem .875rem", borderRadius: 999, border: "1px solid var(--border-default)", background: prodViewMode === m ? "var(--brand-primary,#3b82f6)" : "var(--bg-surface)", color: prodViewMode === m ? "#fff" : "var(--text-secondary)", fontWeight: 600, fontSize: ".8rem", cursor: "pointer" }}>
                  {m === "summary" ? ("ملخص يومي") : ("كل السجلات")}
                </button>
              ))}
            </div>
          </div>

          {prodViewMode === "summary" ? (
            <ProdSummaryView groups={dayGroups} />
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {`سجلات الإنتاج (${allRecords.length})`}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>{["التاريخ", "العامل", "الآلة", "الشفت", "كراتين", "القطع"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
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
                  <tfoot>
                    <tr style={{ background: "var(--bg-surface)", fontWeight: 700 }}>
                      <td colSpan={4}>{"الإجمالي"}</td>
                      <td>{allRecords.reduce((s, r) => s + (r.cartonsCount ?? 0), 0)}</td>
                      <td style={{ color: "#1d4ed8" }}>{fmt(allRecords.reduce((s, r) => s + (r.totalPieces ?? 0), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ENGINEER: read-only table ─────────── */}
      {(!isAdmin && !isAccountant && canSeeAll) && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginTop: "1.5rem" }}>
          <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>{`سجلات الإنتاج (${allRecords.length})`}</div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr>{["التاريخ", "العامل", "الآلة", "الشفت", "كراتين", "القطع"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
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
