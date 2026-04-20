import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";

/* ─── Constants ─────────────────────────────────────────── */
const PREFORM_MACHINE_ID = 430;
const CAPS_MACHINE_ID = 428;

/* ─── Types ────────────────────────────────────────────── */
type Machine = { id: number; name: string; type: string | null };
type Shift = { id: number; name: string; startTime?: string | null; endTime?: string | null };

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
  machine?: { id: number; name: string; type?: string | null };
  shift?: { id: number; name: string };
};

type AdminOverviewResponse = {
  totals: { totalRecords: number; totalCartons: number; totalPieces: number };
  byUser?: Array<{
    userId: number;
    fullName: string;
    username: string;
    role: string;
    recordsCount: number;
    cartonsCount: number;
    totalPieces: number;
  }>;
  byShift?: Array<{
    shiftId: number | null;
    shiftName: string;
    recordsCount: number;
    cartonsCount: number;
    totalPieces: number;
  }>;
  byShiftProduct?: Array<{
    date: string;
    shiftId: number | null;
    shiftName: string;
    capsCartons: number;
    preformCartons: number;
    totalCartons: number;
    totalPieces: number;
  }>;
  dailyByProduct?: Array<{
    date: string;
    capsCartons: number;
    preformCartons: number;
    totalCartons: number;
    totalPieces: number;
  }>;
  dailyRawMaterialUsage?: Array<{
    date: string;
    hdpe: number;
    ldpe: number;
    pet: number;
    adhesive: number;
    emptyBags: number;
    color: number;
    totalRawUsed: number;
  }>;
  recentRecords?: ProductionItem[];
};

/* ─── Auth helper ───────────────────────────────────────── */
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

/* ─── Empty form state ──────────────────────────────────── */
const emptyPreformForm = () => ({
  workingCavities: "72",
  cyclesCount: "",
  rawPetUsed: "",
  colorUsed: "",
  notes: "",
});

const emptyCapsForm = () => ({
  cartonsCount: "",
  rawHdpeUsed: "",
  rawLdpeUsed: "",
  colorUsed: "",
  notes: "",
});

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString();

function isPreformMachine(type: string | null | undefined) {
  if (!type) return false;
  const t = type.toUpperCase();
  return t.includes("PREFORM") || t.includes("PET");
}

function isCapsMachine(type: string | null | undefined) {
  if (!type) return false;
  const t = type.toUpperCase();
  return t.includes("CAP");
}

function getCurrentShift(shifts: Shift[]): Shift | null {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (end > start) {
      if (cur >= start && cur < end) return s;
    } else {
      if (cur >= start || cur < end) return s;
    }
  }
  return shifts[0] ?? null;
}

/* ─── Component ─────────────────────────────────────────── */
export function ProductionPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";
  const canCreate = user?.role === "WORKER";
  const canSeeAll = isAdmin || isAccountant;

  /* Data */
  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myRecords, setMyRecords] = useState<ProductionItem[]>([]);
  const [allRecords, setAllRecords] = useState<ProductionItem[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  /* Date filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* Admin tab */
  const [adminTab, setAdminTab] = useState<"overview" | "daily" | "shifts" | "raw" | "records" | "workers">("overview");

  /* Forms */
  const [preformForm, setPreformForm] = useState(emptyPreformForm());
  const [capsForm, setCapsForm] = useState(emptyCapsForm());
  const [preformError, setPreformError] = useState("");
  const [capsError, setCapsError] = useState("");
  const [preformSuccess, setPreformSuccess] = useState("");
  const [capsSuccess, setCapsSuccess] = useState("");
  const [savingPreform, setSavingPreform] = useState(false);
  const [savingCaps, setSavingCaps] = useState(false);

  /* Derived machine lists (used in admin/accountant view) */
  const preformMachines = useMemo(
    () => machines.filter((m) => isPreformMachine(m.type)),
    [machines],
  );
  const capsMachines = useMemo(
    () => machines.filter((m) => isCapsMachine(m.type)),
    [machines],
  );

  /* Fixed machines and auto-shift for worker form */
  const preformMachine = machines.find((m) => m.id === PREFORM_MACHINE_ID);
  const capsMachine = machines.find((m) => m.id === CAPS_MACHINE_ID);
  const currentShift = getCurrentShift(shifts);

  /* Live totals */
  const preformTotal = useMemo(() => {
    const cycles = parseInt(preformForm.cyclesCount) || 0;
    const cavities = parseInt(preformForm.workingCavities) || 72;
    return cycles * cavities;
  }, [preformForm.cyclesCount, preformForm.workingCavities]);

  const capsTotal = useMemo(() => {
    const cartons = parseInt(capsForm.cartonsCount) || 0;
    return cartons * 6000;
  }, [capsForm.cartonsCount]);

  /* ── Fetch ──────────────────────────────────────────────── */
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
      if (mineRes.ok) setMyRecords((await mineRes.json()) as ProductionItem[]);

      if (canSeeAll) {
        const allRes = await fetchWithAuth("/production/all");
        if (allRes.ok) setAllRecords((await allRes.json()) as ProductionItem[]);
      }

      if (isAdmin) {
        const qs = new URLSearchParams();
        if (fromDate) qs.set("fromDate", fromDate);
        if (toDate) qs.set("toDate", toDate);
        const q = qs.toString();
        const ovRes = await fetchWithAuth(`/production/admin/overview${q ? `?${q}` : ""}`);
        if (ovRes.ok) setAdminOverview((await ovRes.json()) as AdminOverviewResponse);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [canSeeAll, isAdmin, fromDate, toDate]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  /* ── Submit Preform ─────────────────────────────────────── */
  const submitPreform = async (e: FormEvent) => {
    e.preventDefault();
    setPreformError("");
    setPreformSuccess("");
    setSavingPreform(true);
    try {
      const autoShift = getCurrentShift(shifts);
      const res = await fetchWithAuth("/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: PREFORM_MACHINE_ID,
          shiftId: autoShift?.id,
          cartonsCount: parseInt(preformForm.cyclesCount) || 0,
          workingCavities: parseInt(preformForm.workingCavities) || 72,
          rawPetUsed: preformForm.rawPetUsed ? Number(preformForm.rawPetUsed) : undefined,
          colorUsed: preformForm.colorUsed ? Number(preformForm.colorUsed) : undefined,
          notes: preformForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setPreformSuccess(isAr ? "تم حفظ سجل البريفورم بنجاح" : "Preform record saved successfully");
      setPreformForm(emptyPreformForm());
      void loadAll();
    } catch (err) {
      setPreformError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingPreform(false);
    }
  };

  /* ── Submit Caps ────────────────────────────────────────── */
  const submitCaps = async (e: FormEvent) => {
    e.preventDefault();
    setCapsError("");
    setCapsSuccess("");
    setSavingCaps(true);
    try {
      const autoShift = getCurrentShift(shifts);
      const res = await fetchWithAuth("/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: CAPS_MACHINE_ID,
          shiftId: autoShift?.id,
          cartonsCount: parseInt(capsForm.cartonsCount) || 0,
          rawHdpeUsed: capsForm.rawHdpeUsed ? Number(capsForm.rawHdpeUsed) : undefined,
          rawLdpeUsed: capsForm.rawLdpeUsed ? Number(capsForm.rawLdpeUsed) : undefined,
          colorUsed: capsForm.colorUsed ? Number(capsForm.colorUsed) : undefined,
          notes: capsForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setCapsSuccess(isAr ? "تم حفظ سجل الكابس بنجاح" : "Caps record saved successfully");
      setCapsForm(emptyCapsForm());
      void loadAll();
    } catch (err) {
      setCapsError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingCaps(false);
    }
  };

  /* ── KPIs from my records ───────────────────────────────── */
  const myPreforms = myRecords.filter((r) => isPreformMachine(r.machine?.type));
  const myCaps = myRecords.filter((r) => isCapsMachine(r.machine?.type));
  const myPreformPcs = myPreforms.reduce((s, r) => s + (r.totalPieces ?? 0), 0);
  const myCapsPcs = myCaps.reduce((s, r) => s + (r.totalPieces ?? 0), 0);

  /* ── Admin daily data ───────────────────────────────────── */
  const dailyData = adminOverview?.dailyByProduct ?? [];
  const rawDaily = adminOverview?.dailyRawMaterialUsage ?? [];
  const shiftData = adminOverview?.byShiftProduct ?? [];

  /* ─────────────────────────────────────────────────────── */
  return (
    <ModulePageShell
      title={isAr ? "الإنتاج" : "Production"}
      subtitle={isAr ? "تسجيل ومتابعة الإنتاج اليومي" : "Record and track daily production"}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => void loadAll()}
        >
          {isAr ? "تحديث" : "Refresh"}
        </button>
      }
    >
      {loading && <TruckLoader />}

      {/* ── WORKER: Two Production Cards ─────────────────── */}
      {canCreate && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* ── PREFORM Card ── */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                gap: ".6rem",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--brand-primary)",
                }}
              />
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {isAr ? "إنتاج البريفورم" : "Preform Production"}
              </h3>
            </div>

            <div style={{ padding: "1.25rem" }}>
              {/* Live total preview */}
              {preformTotal > 0 && (
                <div
                  style={{
                    padding: ".75rem 1rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: ".82rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {isAr ? "الإجمالي المحسوب" : "Calculated Total"}
                  </span>
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "var(--brand-primary)",
                    }}
                  >
                    {fmt(preformTotal)} {isAr ? "قطعة" : "pcs"}
                  </span>
                </div>
              )}

              {preformError && (
                <div
                  className="auth-alert auth-alert--error"
                  style={{ marginBottom: ".75rem", fontSize: ".82rem" }}
                >
                  {preformError}
                </div>
              )}
              {preformSuccess && (
                <div
                  className="auth-alert"
                  style={{ marginBottom: ".75rem", fontSize: ".82rem" }}
                >
                  {preformSuccess}
                </div>
              )}

              <form
                className="module-form"
                onSubmit={(e) => void submitPreform(e)}
              >
                {/* Machine + Shift info badges */}
                <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".3rem .75rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", fontSize: ".8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand-primary)", display: "inline-block" }} />
                    {preformMachine?.name ?? `#${PREFORM_MACHINE_ID}`}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".3rem .75rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    ⏱ {currentShift ? currentShift.name : (isAr ? "لا يوجد شفت" : "No active shift")}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: ".75rem",
                  }}
                >
                  <label>
                    {isAr ? "عدد الكافيتي الشغّالة (من 72)" : "Working Cavities (of 72)"}
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={preformForm.workingCavities}
                      onChange={(e) =>
                        setPreformForm((p) => ({
                          ...p,
                          workingCavities: e.target.value,
                        }))
                      }
                      placeholder="72"
                    />
                  </label>

                  <label>
                    {isAr ? "عدد الدورات (Cycles)" : "Cycles Count"} *
                    <input
                      type="number"
                      min={0}
                      value={preformForm.cyclesCount}
                      onChange={(e) =>
                        setPreformForm((p) => ({
                          ...p,
                          cyclesCount: e.target.value,
                        }))
                      }
                      required
                      placeholder="0"
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: ".75rem",
                  }}
                >
                  <label>
                    {isAr ? "PET المستخدم (كغ)" : "PET Used (kg)"}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={preformForm.rawPetUsed}
                      onChange={(e) =>
                        setPreformForm((p) => ({
                          ...p,
                          rawPetUsed: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label>
                    {isAr ? "اللون (كغ)" : "Color (kg)"}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={preformForm.colorUsed}
                      onChange={(e) =>
                        setPreformForm((p) => ({
                          ...p,
                          colorUsed: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                </div>

                <label>
                  {isAr ? "ملاحظات" : "Notes"}
                  <textarea
                    rows={2}
                    value={preformForm.notes}
                    onChange={(e) =>
                      setPreformForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder={isAr ? "ملاحظات اختيارية..." : "Optional notes..."}
                  />
                </label>

                <button
                  type="submit"
                  className="auth-button"
                  disabled={savingPreform}
                  style={{ width: "100%" }}
                >
                  {savingPreform
                    ? isAr
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isAr
                      ? "حفظ إنتاج البريفورم"
                      : "Save Preform Production"}
                </button>
              </form>
            </div>
          </div>

          {/* ── CAPS Card ── */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                gap: ".6rem",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--brand-accent, #f97316)",
                }}
              />
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {isAr ? "إنتاج الكابس" : "Caps Production"}
              </h3>
            </div>

            <div style={{ padding: "1.25rem" }}>
              {/* Live total preview */}
              {capsTotal > 0 && (
                <div
                  style={{
                    padding: ".75rem 1rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: ".82rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {isAr ? "الإجمالي المحسوب" : "Calculated Total"}
                  </span>
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "var(--brand-accent, #f97316)",
                    }}
                  >
                    {fmt(capsTotal)} {isAr ? "قطعة" : "pcs"}
                  </span>
                </div>
              )}

              {capsError && (
                <div
                  className="auth-alert auth-alert--error"
                  style={{ marginBottom: ".75rem", fontSize: ".82rem" }}
                >
                  {capsError}
                </div>
              )}
              {capsSuccess && (
                <div
                  className="auth-alert"
                  style={{ marginBottom: ".75rem", fontSize: ".82rem" }}
                >
                  {capsSuccess}
                </div>
              )}

              <form
                className="module-form"
                onSubmit={(e) => void submitCaps(e)}
              >
                {/* Machine + Shift info badges */}
                <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".3rem .75rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", fontSize: ".8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand-accent, #f97316)", display: "inline-block" }} />
                    {capsMachine?.name ?? `#${CAPS_MACHINE_ID}`}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".3rem .75rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "999px", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    ⏱ {currentShift ? currentShift.name : (isAr ? "لا يوجد شفت" : "No active shift")}
                  </span>
                </div>

                <label>
                  {isAr ? "عدد الكراتين (6000 قطعة/كرتون)" : "Cartons Count (6,000 pcs/carton)"} *
                  <input
                    type="number"
                    min={0}
                    value={capsForm.cartonsCount}
                    onChange={(e) =>
                      setCapsForm((p) => ({
                        ...p,
                        cartonsCount: e.target.value,
                      }))
                    }
                    required
                    placeholder="0"
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: ".75rem",
                  }}
                >
                  <label>
                    {isAr ? "HDPE (كغ)" : "HDPE (kg)"}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={capsForm.rawHdpeUsed}
                      onChange={(e) =>
                        setCapsForm((p) => ({
                          ...p,
                          rawHdpeUsed: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label>
                    {isAr ? "LDPE (كغ)" : "LDPE (kg)"}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={capsForm.rawLdpeUsed}
                      onChange={(e) =>
                        setCapsForm((p) => ({
                          ...p,
                          rawLdpeUsed: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label>
                    {isAr ? "اللون (كغ)" : "Color (kg)"}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={capsForm.colorUsed}
                      onChange={(e) =>
                        setCapsForm((p) => ({
                          ...p,
                          colorUsed: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                </div>

                <label>
                  {isAr ? "ملاحظات" : "Notes"}
                  <textarea
                    rows={2}
                    value={capsForm.notes}
                    onChange={(e) =>
                      setCapsForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder={isAr ? "ملاحظات اختيارية..." : "Optional notes..."}
                  />
                </label>

                <button
                  type="submit"
                  className="auth-button"
                  disabled={savingCaps}
                  style={{ width: "100%" }}
                >
                  {savingCaps
                    ? isAr
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isAr
                      ? "حفظ إنتاج الكابس"
                      : "Save Caps Production"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── My Production Summary (non-admin workers) ─────── */}
      {!isAdmin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".3rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
            <span style={{ fontSize: "1.2rem" }}>🏭</span>
            <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{isAr ? "سجلاتي - البريفورم" : "My Preform Records"}</p>
            <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{myPreforms.length}</p>
            <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myPreformPcs)} {isAr ? "قطعة" : "pcs"}</p>
          </div>
          <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".3rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
            <span style={{ fontSize: "1.2rem" }}>🧢</span>
            <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{isAr ? "سجلاتي - الكابس" : "My Caps Records"}</p>
            <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{myCaps.length}</p>
            <p style={{ margin: 0, fontSize: ".75rem", opacity: .8 }}>{fmt(myCapsPcs)} {isAr ? "قطعة" : "pcs"}</p>
          </div>
        </div>
      )}

      {/* ── My Recent Records list ────────────────────────── */}
      {!isAdmin && myRecords.length > 0 && (
        <div className="module-panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginBottom: ".75rem" }}>
            {isAr ? "آخر سجلاتي" : "My Recent Records"}
          </h2>
          <div className="module-list">
            {myRecords.slice(0, 10).map((r) => (
              <div className="module-row" key={r.id}>
                <strong>
                  {new Date(r.createdAt).toLocaleString()}{" "}
                  <span
                    style={{
                      fontSize: ".72rem",
                      padding: ".15rem .45rem",
                      borderRadius: "999px",
                      background: isPreformMachine(r.machine?.type)
                        ? "var(--blue-100)"
                        : "var(--orange-100)",
                      color: isPreformMachine(r.machine?.type)
                        ? "var(--blue-700)"
                        : "var(--orange-700)",
                    }}
                  >
                    {isPreformMachine(r.machine?.type)
                      ? isAr
                        ? "بريفورم"
                        : "PREFORM"
                      : isAr
                        ? "كابس"
                        : "CAPS"}
                  </span>
                </strong>
                <span>
                  {r.machine?.name ?? "-"} •{" "}
                  {isAr ? "الشفت" : "Shift"}: {r.shift?.name ?? "-"}
                  {r.workingCavities
                    ? ` • ${isAr ? "كافيتي" : "Cavities"}: ${r.workingCavities}/72`
                    : ""}
                </span>
                <small>
                  {isPreformMachine(r.machine?.type)
                    ? `${r.cartonsCount ?? 0} ${isAr ? "دورة" : "cycles"} × ${r.workingCavities ?? 72} ${isAr ? "كافيتي" : "cavities"}`
                    : `${r.cartonsCount ?? 0} ${isAr ? "كرتون" : "cartons"}`}{" "}
                  •{" "}
                  {fmt(r.totalPieces ?? 0)} {isAr ? "قطعة" : "pcs"}
                  {isPreformMachine(r.machine?.type) && r.rawPetUsed ? ` • PET: ${r.rawPetUsed}kg` : ""}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADMIN DASHBOARD ───────────────────────────────── */}
      {isAdmin && (
        <>
          {/* ── Filter bar ── */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", padding: "1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {isAr ? "من تاريخ" : "From Date"}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {isAr ? "إلى تاريخ" : "To Date"}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: ".4rem .75rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem" }} />
            </label>
            <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFromDate(""); setToDate(""); }}>
              {isAr ? "إعادة ضبط" : "Clear"}
            </button>
            {(fromDate || toDate) && (
              <span style={{ fontSize: ".8rem", color: "var(--orange-600,#ea580c)", fontWeight: 600, alignSelf: "center" }}>
                {isAr ? "🔍 فلترة نشطة" : "🔍 Filtered"}
              </span>
            )}
          </div>

          {/* ── Tab bar ── */}
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {([
              ["overview", isAr ? "نظرة عامة" : "Overview"],
              ["daily",    isAr ? "التقرير اليومي" : "Daily Report"],
              ["shifts",   isAr ? "الشفتات" : "Shifts"],
              ["raw",      isAr ? "المواد الخام" : "Raw Materials"],
              ["records",  isAr ? "جميع السجلات" : "All Records"],
              ["workers",  isAr ? "العمال" : "By Worker"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAdminTab(key)}
                style={{
                  padding: ".45rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: adminTab === key ? "var(--orange-500,#f97316)" : "var(--bg-surface)",
                  color: adminTab === key ? "#fff" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: ".83rem",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {adminTab === "overview" && adminOverview && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>
                {[
                  { label: isAr ? "إجمالي السجلات" : "Total Records",    value: adminOverview.totals.totalRecords,                                      gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "📋" },
                  { label: isAr ? "كراتين/صناديق" : "Total Cartons",     value: fmt(adminOverview.totals.totalCartons),                                  gradient: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: "📦" },
                  { label: isAr ? "إجمالي القطع" : "Total Pieces",        value: fmt(adminOverview.totals.totalPieces),                                   gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🔢" },
                  { label: isAr ? "كراتين الكابس" : "Caps Cartons",       value: fmt(dailyData.reduce((s, d) => s + d.capsCartons, 0)),                   gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🧢" },
                  { label: isAr ? "صناديق البريفورم" : "Preform Boxes",   value: fmt(dailyData.reduce((s, d) => s + d.preformCartons, 0)),                gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "🏭" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
                    <span style={{ fontSize: "1.3rem" }}>{kpi.icon}</span>
                    <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{kpi.label}</p>
                    <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Shift summary table */}
              {(adminOverview.byShift ?? []).length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                    {isAr ? "ملخص حسب الشفت" : "Summary by Shift"}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{isAr ? "الشفت" : "Shift"}</th>
                          <th>{isAr ? "السجلات" : "Records"}</th>
                          <th>{isAr ? "الكراتين" : "Cartons"}</th>
                          <th>{isAr ? "القطع" : "Pieces"}</th>
                        </tr>
                      </thead>
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

          {/* ── DAILY REPORT TAB ── */}
          {adminTab === "daily" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {isAr ? "التقرير اليومي للإنتاج" : "Daily Production Report"}
                <span style={{ marginLeft: ".75rem", fontSize: ".78rem", fontWeight: 500, color: "var(--text-secondary)" }}>({dailyData.length} {isAr ? "يوم" : "days"})</span>
              </div>
              {dailyData.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data for this period"}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {[isAr ? "التاريخ" : "Date", isAr ? "كراتين الكابس" : "Caps Cartons", isAr ? "قطع الكابس" : "Caps Pcs", isAr ? "صناديق البريفورم" : "Preform Boxes", isAr ? "قطع البريفورم" : "Preform Pcs", isAr ? "الإجمالي" : "Total Pcs"].map((h) => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((row) => {
                        const capsPcs = row.capsCartons * 6000;
                        const preformPcs = row.totalPieces - capsPcs;
                        return (
                          <tr key={row.date}>
                            <td style={{ fontWeight: 700 }}>{row.date}</td>
                            <td>{fmt(row.capsCartons)}</td>
                            <td>{fmt(capsPcs)}</td>
                            <td>{fmt(row.preformCartons)}</td>
                            <td>{fmt(preformPcs > 0 ? preformPcs : 0)}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--bg-surface)", borderTop: "2px solid var(--border-default)" }}>
                        <td style={{ fontWeight: 700 }}>{isAr ? "الإجمالي" : "Total"}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(dailyData.reduce((s, d) => s + d.capsCartons, 0))}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(dailyData.reduce((s, d) => s + d.capsCartons * 6000, 0))}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(dailyData.reduce((s, d) => s + d.preformCartons, 0))}</td>
                        <td style={{ fontWeight: 700 }}>—</td>
                        <td style={{ fontWeight: 700 }}>{fmt(dailyData.reduce((s, d) => s + d.totalPieces, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SHIFTS TAB ── */}
          {adminTab === "shifts" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {isAr ? "إنتاج الشفتات يومياً" : "Shift Production Breakdown"}
              </div>
              {shiftData.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {[isAr ? "التاريخ" : "Date", isAr ? "الشفت" : "Shift", isAr ? "كراتين الكابس" : "Caps Cartons", isAr ? "صناديق البريفورم" : "Preform Boxes", isAr ? "الإجمالي (قطع)" : "Total (pcs)"].map((h) => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {shiftData.map((row) => (
                        <tr key={`${row.date}-${row.shiftId}`}>
                          <td style={{ fontWeight: 600 }}>{row.date}</td>
                          <td>{row.shiftName}</td>
                          <td>{fmt(row.capsCartons)}</td>
                          <td>{fmt(row.preformCartons)}</td>
                          <td style={{ fontWeight: 700 }}>{fmt(row.totalPieces)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── RAW MATERIALS TAB ── */}
          {adminTab === "raw" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {isAr ? "استهلاك المواد الخام اليومي" : "Daily Raw Material Usage"}
              </div>
              {rawDaily.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {[isAr ? "التاريخ" : "Date", "HDPE (kg)", "LDPE (kg)", "PET (kg)", isAr ? "لاصق" : "Adhesive", isAr ? "أكياس" : "Bags", isAr ? "لون" : "Color", isAr ? "الإجمالي" : "Total"].map((h) => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rawDaily.map((row) => (
                        <tr key={row.date}>
                          <td style={{ fontWeight: 700 }}>{row.date}</td>
                          <td>{row.hdpe > 0 ? row.hdpe : "—"}</td>
                          <td>{row.ldpe > 0 ? row.ldpe : "—"}</td>
                          <td>{row.pet > 0 ? row.pet : "—"}</td>
                          <td>{row.adhesive > 0 ? row.adhesive : "—"}</td>
                          <td>{row.emptyBags > 0 ? row.emptyBags : "—"}</td>
                          <td>{row.color > 0 ? row.color : "—"}</td>
                          <td style={{ fontWeight: 700 }}>{fmt(row.totalRawUsed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── ALL RECORDS TAB ── */}
          {adminTab === "records" && (() => {
            const records = adminOverview?.recentRecords ?? allRecords.slice(0, 50);
            return (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                  {isAr ? `السجلات الأخيرة (${records.length})` : `Recent Records (${records.length})`}
                  {(fromDate || toDate) && <span style={{ marginLeft: ".5rem", fontSize: ".78rem", color: "var(--orange-600,#ea580c)" }}>— {isAr ? "مفلترة" : "filtered"}</span>}
                </div>
                {records.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد سجلات" : "No records"}</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {[isAr ? "التاريخ" : "Date", isAr ? "العامل" : "Worker", isAr ? "الآلة / النوع" : "Machine / Type", isAr ? "الشفت" : "Shift", isAr ? "الكمية" : "Count", isAr ? "الكافيتي" : "Cavities", isAr ? "القطع" : "Pieces", isAr ? "المادة (كغ)" : "Material (kg)", isAr ? "لون (كغ)" : "Color (kg)"].map((h) => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r) => {
                          const isPreform = isPreformMachine(r.machine?.type);
                          return (
                            <tr key={r.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                              <td>
                                {r.machine?.name ?? "—"}
                                <span style={{ marginLeft: ".4rem", fontSize: ".7rem", padding: ".1rem .4rem", borderRadius: "999px", background: isPreform ? "rgba(59,130,246,.12)" : "rgba(249,115,22,.12)", color: isPreform ? "#1d4ed8" : "#ea580c" }}>
                                  {isPreform ? "PREFORM" : "CAPS"}
                                </span>
                              </td>
                              <td>{r.shift?.name ?? "—"}</td>
                              <td>{isPreform ? `${r.cartonsCount ?? 0} ${isAr ? "دورة" : "cycles"}` : `${r.cartonsCount ?? 0} ${isAr ? "كرتون" : "cartons"}`}</td>
                              <td>{isPreform ? (r.workingCavities ? `${r.workingCavities}/72` : "72/72") : "—"}</td>
                              <td style={{ fontWeight: 700 }}>{fmt(r.totalPieces ?? 0)}</td>
                              <td>{isPreform ? (r.rawPetUsed ? `PET: ${r.rawPetUsed}` : "—") : (r.rawHdpeUsed || r.rawLdpeUsed ? `H:${r.rawHdpeUsed ?? 0} L:${r.rawLdpeUsed ?? 0}` : "—")}</td>
                              <td>{r.colorUsed ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── BY WORKER TAB ── */}
          {adminTab === "workers" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {isAr ? "الإنتاج حسب العامل" : "Production by Worker"}
              </div>
              {(adminOverview?.byUser ?? []).length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{isAr ? "لا توجد بيانات" : "No data"}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{isAr ? "الاسم" : "Name"}</th>
                        <th>{isAr ? "اسم المستخدم" : "Username"}</th>
                        <th>{isAr ? "الدور" : "Role"}</th>
                        <th>{isAr ? "السجلات" : "Records"}</th>
                        <th>{isAr ? "الكراتين" : "Cartons"}</th>
                        <th>{isAr ? "إجمالي القطع" : "Total Pieces"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminOverview?.byUser ?? []).map((w, i) => (
                        <tr key={w.userId}>
                          <td style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700 }}>{w.fullName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{w.username}</td>
                          <td>
                            <span style={{ padding: ".2rem .6rem", borderRadius: "999px", fontSize: ".72rem", fontWeight: 600, background: "rgba(249,115,22,.1)", color: "#ea580c" }}>
                              {w.role}
                            </span>
                          </td>
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

      {/* ── Accountant view ── */}
      {isAccountant && (
        <>
          {/* KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              { label: isAr ? "إجمالي السجلات" : "Total Records", value: allRecords.length, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: "📋" },
              { label: isAr ? "سجلات البريفورم" : "Preform Records", value: allRecords.filter((r) => isPreformMachine(r.machine?.type)).length, gradient: "linear-gradient(135deg,#06b6d4,#0284c7)", icon: "🏭" },
              { label: isAr ? "سجلات الكابس" : "Caps Records", value: allRecords.filter((r) => isCapsMachine(r.machine?.type)).length, gradient: "linear-gradient(135deg,#f97316,#ea580c)", icon: "🧢" },
              { label: isAr ? "إجمالي القطع" : "Total Pieces", value: fmt(allRecords.reduce((s, r) => s + (r.totalPieces ?? 0), 0)), gradient: "linear-gradient(135deg,#10b981,#059669)", icon: "🔢" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: "var(--radius-xl)", padding: "1.1rem 1.25rem", color: "#fff", display: "flex", flexDirection: "column", gap: ".35rem", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
                <span style={{ fontSize: "1.3rem" }}>{kpi.icon}</span>
                <p style={{ margin: 0, fontSize: ".75rem", opacity: .85, fontWeight: 500 }}>{kpi.label}</p>
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Records Table */}
          {allRecords.length > 0 && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", fontWeight: 700, fontSize: ".9rem" }}>
                {isAr ? `جميع السجلات (${allRecords.length})` : `All Records (${allRecords.length})`}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: ".82rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                      {[
                        isAr ? "التاريخ" : "Date",
                        isAr ? "العامل" : "Worker",
                        isAr ? "الآلة / النوع" : "Machine / Type",
                        isAr ? "الشفت" : "Shift",
                        isAr ? "الكمية" : "Count",
                        isAr ? "القطع" : "Pieces",
                        isAr ? "المادة (كغ)" : "Material (kg)",
                      ].map((h) => (
                        <th key={h} style={{ padding: ".6rem .875rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRecords.slice(0, 50).map((r, i) => {
                      const isPreform = isPreformMachine(r.machine?.type);
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: "1px solid var(--border-default)",
                            background: i % 2 === 0 ? "transparent" : "var(--bg-surface)",
                          }}
                        >
                          <td style={{ padding: ".5rem .875rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: ".5rem .875rem", fontWeight: 600 }}>{r.user?.fullName ?? "—"}</td>
                          <td style={{ padding: ".5rem .875rem" }}>
                            {r.machine?.name ?? "—"}
                            <span
                              style={{
                                marginLeft: ".4rem",
                                fontSize: ".7rem",
                                padding: ".1rem .4rem",
                                borderRadius: "999px",
                                background: isPreform ? "var(--blue-100)" : "var(--orange-100)",
                                color: isPreform ? "var(--blue-700)" : "var(--orange-700)",
                              }}
                            >
                              {isPreform ? "PREFORM" : "CAPS"}
                            </span>
                          </td>
                          <td style={{ padding: ".5rem .875rem", color: "var(--text-secondary)" }}>{r.shift?.name ?? "—"}</td>
                          <td style={{ padding: ".5rem .875rem" }}>
                            {isPreform
                              ? `${r.cartonsCount ?? 0} ${isAr ? "دورة" : "cycles"} × ${r.workingCavities ?? 72}`
                              : `${r.cartonsCount ?? 0} ${isAr ? "كرتون" : "cartons"}`}
                          </td>
                          <td style={{ padding: ".5rem .875rem", fontWeight: 700 }}>{fmt(r.totalPieces ?? 0)}</td>
                          <td style={{ padding: ".5rem .875rem", color: "var(--text-secondary)" }}>
                            {isPreform
                              ? (r.rawPetUsed ? `PET: ${r.rawPetUsed}kg` : "—")
                              : (r.rawHdpeUsed || r.rawLdpeUsed ? `H:${r.rawHdpeUsed ?? 0} L:${r.rawLdpeUsed ?? 0}` : "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </ModulePageShell>
  );
}
