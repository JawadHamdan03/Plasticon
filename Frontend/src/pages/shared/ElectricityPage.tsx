import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Zap, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle,
  Calculator, Pencil, X, BarChart3, List,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, pictureUrl as globalPictureUrl, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";

type Shift = { id: number; name: string };
type User  = { id: number; fullName: string; username: string };
type KwhPrice = { id: number; price: number; effectiveFrom: string };
type ElectricityReading = {
  id: number;
  date: string;
  shift: { id: number; name: string };
  startReading: number;
  endReading: number;
  isMeterReset: boolean;
  maxMeterValue: number | null;
  consumption: number;
  kwhPriceSnap: number;
  shiftCost: number;
  notes: string | null;
  imagePath: string | null;
  recordedBy: { fullName: string; username: string };
  responsibleEngineer: { fullName: string; username: string } | null;
  createdAt: string;
};

type DayGroup = {
  date: string;
  shifts: { shiftName: string; consumption: number; cost: number; count: number }[];
  totalConsumption: number;
  totalCost: number;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

function shiftBadge(name: string) {
  const colors: Record<string, string> = { A: "#3b82f6", B: "#f97316", C: "#8b5cf6" };
  const bg = Object.entries(colors).find(([k]) => name.includes(k))?.[1] ?? "#64748b";
  return (
    <span style={{ display: "inline-block", padding: ".15rem .55rem", borderRadius: "999px", background: bg, color: "#fff", fontSize: ".8rem", fontWeight: 700 }}>
      {name}
    </span>
  );
}

const fmtNum  = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

function groupByDay(readings: ElectricityReading[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const r of readings) {
    const day = r.date.slice(0, 10);
    if (!map.has(day)) map.set(day, { date: day, shifts: [], totalConsumption: 0, totalCost: 0 });
    const g = map.get(day)!;
    const existing = g.shifts.find(s => s.shiftName === r.shift.name);
    if (existing) {
      existing.consumption += r.consumption;
      existing.cost        += r.shiftCost;
      existing.count       += 1;
    } else {
      g.shifts.push({ shiftName: r.shift.name, consumption: r.consumption, cost: r.shiftCost, count: 1 });
    }
    g.totalConsumption += r.consumption;
    g.totalCost        += r.shiftCost;
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function ElectricityPage() {
  const { user }   = useAuth();
  const { locale } = useLocale();
  const t = (en: string, ar: string) => locale === "ar" ? ar : en;

  const role        = user?.role ?? "";
  const isAdmin     = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const showPrice   = isAdmin || isAccountant;
  const canWrite    = isAdmin || role === "ENGINEER" || role === "WORKER";

  const [shifts,    setShifts]    = useState<Shift[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [kwhPrice,  setKwhPrice]  = useState<KwhPrice | null>(null);
  const [readings,  setReadings]  = useState<ElectricityReading[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [viewMode,  setViewMode]  = useState<"summary" | "records">(showPrice ? "summary" : "records");

  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate,   setFilterToDate]   = useState("");
  const [filterShift,    setFilterShift]    = useState("");

  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null);
  const [editStart,  setEditStart]  = useState("");
  const [editEnd,    setEditEnd]    = useState("");
  const [editReset,  setEditReset]  = useState(false);
  const [editMaxVal, setEditMaxVal] = useState("");
  const [editNotes,  setEditNotes]  = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  // Form
  const [fDate,      setFDate]      = useState(new Date().toISOString().slice(0, 10));
  const [fShiftId,   setFShiftId]   = useState("");
  const [fStart,     setFStart]     = useState("");
  const [fEnd,       setFEnd]       = useState("");
  const [fReset,     setFReset]     = useState(false);
  const [fMaxVal,    setFMaxVal]    = useState("");
  const [fNotes,     setFNotes]     = useState("");
  const [fEngineerId,setFEngineerId]= useState("");
  const [fImage,     setFImage]     = useState<File | null>(null);

  const startNum = parseFloat(fStart);
  const endNum   = parseFloat(fEnd);
  const maxNum   = parseFloat(fMaxVal);
  const previewConsumption = fReset
    ? (Number.isFinite(maxNum) && Number.isFinite(startNum) && Number.isFinite(endNum)) ? (maxNum - startNum) + endNum : null
    : (Number.isFinite(startNum) && Number.isFinite(endNum) && endNum > startNum) ? endNum - startNum : null;
  const previewCost = previewConsumption !== null && kwhPrice ? previewConsumption * kwhPrice.price : null;

  const alreadyRecorded = fShiftId !== "" && readings.some(r => r.shift.id === Number(fShiftId) && r.date.slice(0, 10) === fDate);

  const dayGroups = useMemo(() => groupByDay(readings), [readings]);

  const grandTotal = useMemo(() => ({
    consumption: readings.reduce((s, r) => s + r.consumption, 0),
    cost:        readings.reduce((s, r) => s + r.shiftCost, 0),
  }), [readings]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        ...(filterFromDate ? { fromDate: filterFromDate } : {}),
        ...(filterToDate   ? { toDate:   filterToDate   } : {}),
        ...(filterShift    ? { shiftId:  filterShift    } : {}),
      });
      const [sh, pr, rds] = await Promise.all([
        apiFetch<Shift[]>("/shifts").catch(() => [] as Shift[]),
        apiFetch<KwhPrice | null>("/electricity/kwh-price").catch(() => null),
        apiFetch<ElectricityReading[]>(`/electricity/readings?${params}`).catch(() => [] as ElectricityReading[]),
      ]);
      setShifts(Array.isArray(sh) ? sh : []);
      setKwhPrice(pr);
      setReadings(rds);
      if (isAdmin) {
        const users = await apiFetch<User[]>("/users/all").catch(() => []);
        setEngineers(users);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed to load", "فشل التحميل"));
    } finally {
      setLoading(false);
    }
  }, [filterFromDate, filterToDate, filterShift, isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fReset && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum <= startNum) {
      setError(t("End value must be greater than start", "القراءة النهائية يجب أن تكون أكبر من الأولية"));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("date", fDate);
      fd.append("shiftId", String(Number(fShiftId)));
      fd.append("startReading", fStart);
      fd.append("endReading", fEnd);
      fd.append("isMeterReset", String(fReset));
      if (fReset) fd.append("maxMeterValue", fMaxVal);
      if (fNotes) fd.append("notes", fNotes);
      if (fEngineerId) fd.append("responsibleEngineerId", fEngineerId);
      if (fImage) fd.append("image", fImage);
      const token = localStorage.getItem("plasticon_token");
      const res = await fetch(`${API_BASE_URL}/electricity/readings`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd, credentials: "include",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(t("Reading recorded successfully", "تم تسجيل القراءة بنجاح"));
      setFStart(""); setFEnd(""); setFNotes(""); setFReset(false); setFMaxVal(""); setFEngineerId(""); setFImage(null);
      setShowForm(false);
      void loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed to submit", "فشل الإرسال"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(t("Delete this reading?", "هل تريد حذف هذه القراءة؟"), { danger: true, confirmText: t("Delete", "حذف") }))) return;
    try {
      await apiFetch(`/electricity/readings/${id}`, { method: "DELETE" });
      setReadings(prev => prev.filter(r => r.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : t("Delete failed", "فشل الحذف")); }
  };

  const openEdit = (r: ElectricityReading) => {
    setEditingReading(r);
    setEditStart(String(r.startReading));
    setEditEnd(String(r.endReading));
    setEditReset(r.isMeterReset);
    setEditMaxVal(r.maxMeterValue != null ? String(r.maxMeterValue) : "");
    setEditNotes(r.notes ?? "");
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingReading) return;
    setEditSaving(true); setEditError("");
    try {
      await apiFetch(`/electricity/readings/${editingReading.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startReading: Number(editStart), endReading: Number(editEnd), isMeterReset: editReset, maxMeterValue: editReset ? Number(editMaxVal) : undefined, notes: editNotes || undefined }),
      });
      setEditingReading(null);
      void loadData();
    } catch (e) { setEditError(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ")); }
    finally { setEditSaving(false); }
  };

  const shiftColor: Record<string, { bg: string; text: string }> = {
    A: { bg: "#eff6ff", text: "#1d4ed8" },
    B: { bg: "#fff7ed", text: "#c2410c" },
    C: { bg: "#f5f3ff", text: "#6d28d9" },
  };
  const getShiftColor = (name: string) =>
    Object.entries(shiftColor).find(([k]) => name.includes(k))?.[1] ?? { bg: "#f1f5f9", text: "#475569" };

  return (
    <ModulePageShell
      title={t("Electricity Consumption", "استهلاك الكهرباء")}
      subtitle={t("Track shift electricity readings, consumption and cost.", "تتبع قراءات الكهرباء لكل شفت والاستهلاك والتكلفة.")}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
          {showPrice && kwhPrice && (
            <span style={{ fontSize: ".8rem", fontWeight: 700, padding: ".3rem .75rem", borderRadius: "999px", background: "var(--bg-subtle)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
              <Zap size={12} style={{ display: "inline", marginRight: 4 }} />
              {t("Rate", "السعر")}: {fmtNum(kwhPrice.price)} ILS/kWh
            </span>
          )}
          {canWrite && (
            <button type="button" className="auth-button" onClick={() => setShowForm(v => !v)}>
              <Plus size={15} /> {t("Record Reading", "تسجيل قراءة")}
            </button>
          )}
        </div>
      }
    >
      {error   && <div className="auth-alert auth-alert--error mb-4">{error}</div>}
      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "#dcfce7", color: "#15803d", marginBottom: "1rem", fontSize: ".9rem", fontWeight: 600 }}>
          <CheckCircle size={16} />{success}
        </div>
      )}

      {/* ── Recording form ── */}
      {showForm && canWrite && (
        <Card className="mb-6 p-5">
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <Calculator size={18} style={{ color: "var(--brand-primary)" }} />
            {t("New Electricity Reading", "قراءة كهرباء جديدة")}
          </h3>
          <form onSubmit={e => void handleSubmit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Date *", "التاريخ *")}</span>
                <input type="date" className="module-form__input" required value={fDate} onChange={e => setFDate(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Shift *", "الشفت *")}</span>
                <select className="module-form__input" required value={fShiftId} onChange={e => setFShiftId(e.target.value)}>
                  <option value="">{t("Select shift…", "اختر شفت…")}</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            {alreadyRecorded && (
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".6rem .875rem", marginBottom: "1rem", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.4)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", fontWeight: 600, color: "#b45309" }}>
                <AlertTriangle size={15} />
                {t("A reading for this shift/date already exists", "توجد قراءة لهذا الشفت في هذا التاريخ بالفعل")}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Start Meter (kWh) *", "قراءة البداية (kWh) *")}</span>
                <input type="number" className="module-form__input" min={0} step="any" required value={fStart} onChange={e => setFStart(e.target.value)} placeholder="e.g. 12500" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("End Meter (kWh) *", "قراءة النهاية (kWh) *")}</span>
                <input type="number" className="module-form__input" min={0} step="any" required value={fEnd} onChange={e => setFEnd(e.target.value)} placeholder="e.g. 12650"
                  style={!fReset && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum <= startNum ? { borderColor: "var(--clr-danger)" } : {}} />
              </label>
              {isAdmin && engineers.length > 0 && (
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                  <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Responsible Engineer", "المهندس المسؤول")}</span>
                  <select className="module-form__input" value={fEngineerId} onChange={e => setFEngineerId(e.target.value)}>
                    <option value="">{t("None", "لا يوجد")}</option>
                    {engineers.filter(u => (u as any).role === "ENGINEER").map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                </label>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1rem", cursor: "pointer", fontSize: ".9rem", fontWeight: 600, color: "var(--text-primary)" }}>
              <input type="checkbox" checked={fReset} onChange={e => setFReset(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--brand-primary)" }} />
              <RefreshCw size={15} style={{ color: "var(--brand-primary)" }} />
              {t("Meter Reset", "إعادة تشغيل العداد")}
            </label>

            {fReset && (
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1rem", maxWidth: 240 }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Max Meter Value *", "الحد الأقصى للعداد *")}</span>
                <input type="number" className="module-form__input" min={1} step="any" required value={fMaxVal} onChange={e => setFMaxVal(e.target.value)} placeholder="e.g. 99999" />
              </label>
            )}

            {previewConsumption !== null && (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--bg-subtle)", border: "1px solid var(--border-default)", marginBottom: "1rem" }}>
                <div>
                  <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600 }}>{t("Consumption", "الاستهلاك")}</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--brand-primary)" }}>{fmtNum(previewConsumption)} kWh</p>
                </div>
                {showPrice && previewCost !== null && (
                  <div>
                    <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600 }}>{t("Estimated Cost", "التكلفة التقديرية")}</p>
                    <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#15803d" }}>{fmtNum(previewCost)} ILS</p>
                  </div>
                )}
              </div>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Meter Photo (optional)", "صورة العداد (اختياري)")}</span>
              <input type="file" accept="image/*" className="module-form__input" onChange={e => setFImage(e.target.files?.[0] ?? null)} style={{ padding: ".35rem" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t("Notes", "ملاحظات")}</span>
              <textarea className="module-form__input" rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder={t("Optional notes…", "ملاحظات اختيارية…")} style={{ resize: "vertical" }} />
            </label>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button type="submit" className="auth-button" disabled={submitting || !kwhPrice}>
                {submitting ? t("Saving…", "جاري الحفظ…") : t("Save Reading", "حفظ القراءة")}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowForm(false)}>{t("Cancel", "إلغاء")}</button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Filters ── */}
      <Card className="mb-6 p-4">
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end" }}>
          {(["from", "to"] as const).map(k => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              {k === "from" ? t("From", "من") : t("To", "إلى")}
              <input type="date" value={k === "from" ? filterFromDate : filterToDate}
                onChange={e => k === "from" ? setFilterFromDate(e.target.value) : setFilterToDate(e.target.value)}
                style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }} />
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {t("Shift", "الشفت")}
            <select value={filterShift} onChange={e => setFilterShift(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}>
              <option value="">{t("All shifts", "جميع الشفتات")}</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button type="button" className="auth-button" onClick={() => void loadData()}>{t("Apply", "تطبيق")}</button>
          <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFilterFromDate(""); setFilterToDate(""); setFilterShift(""); }}>
            {t("Clear", "مسح")}
          </button>
        </div>
      </Card>

      {/* ── View toggle (admin/accountant only) ── */}
      {showPrice && (
        <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
          {(["summary", "records"] as const).map(mode => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)}
              style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".45rem 1rem", borderRadius: "999px", border: "1.5px solid", fontSize: ".83rem", fontWeight: 700, cursor: "pointer", transition: "all .15s",
                background:   viewMode === mode ? "var(--brand-primary)" : "var(--bg-surface)",
                borderColor:  viewMode === mode ? "var(--brand-primary)" : "var(--border-default)",
                color:        viewMode === mode ? "#fff"                 : "var(--text-secondary)",
              }}>
              {mode === "summary" ? <><BarChart3 size={14} /> {t("Daily Summary", "الملخص اليومي")}</> : <><List size={14} /> {t("All Records", "جميع السجلات")}</>}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>{t("Loading…", "جاري التحميل…")}</div>
      ) : readings.length === 0 ? (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <Zap size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{t("No readings found", "لا توجد قراءات")}</p>
          {canWrite && !showForm && (
            <button type="button" className="auth-button" style={{ marginTop: "1rem" }} onClick={() => setShowForm(true)}>
              <Plus size={15} /> {t("Record First Reading", "سجّل أول قراءة")}
            </button>
          )}
        </Card>
      ) : viewMode === "summary" && showPrice ? (
        /* ── DAILY SUMMARY VIEW ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Grand totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {[
              { label: t("Total Consumption", "إجمالي الاستهلاك"), value: `${fmtNum(grandTotal.consumption)} kWh`, color: "var(--brand-primary)" },
              { label: t("Total Cost", "إجمالي التكلفة"),        value: `${fmtNum(grandTotal.cost)} ILS`,         color: "#15803d" },
              { label: t("Days Covered", "عدد الأيام"),           value: String(dayGroups.length),                  color: "var(--text-primary)" },
            ].map(card => (
              <Card key={card.label} className="p-4" style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{card.label}</p>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: card.color }}>{card.value}</p>
              </Card>
            ))}
          </div>

          {/* Per-day breakdown */}
          {dayGroups.map(day => (
            <Card key={day.date} className="overflow-hidden">
              {/* Day header */}
              <div style={{ padding: ".75rem 1.25rem", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                <span style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--text-primary)" }}>{fmtDate(day.date)}</span>
                <div style={{ display: "flex", gap: "1.25rem" }}>
                  <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--brand-primary)", fontWeight: 800 }}>{fmtNum(day.totalConsumption)}</span> kWh
                  </span>
                  <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span style={{ color: "#15803d", fontWeight: 800 }}>{fmtNum(day.totalCost)}</span> ILS
                  </span>
                </div>
              </div>
              {/* Shifts */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 0, borderBottom: "none" }}>
                {day.shifts.map(s => {
                  const sc = getShiftColor(s.shiftName);
                  return (
                    <div key={s.shiftName} style={{ padding: "1rem 1.25rem", borderRight: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                        {shiftBadge(s.shiftName)}
                        <span style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 500 }}>{s.count} {t("reading(s)", "قراءة")}</span>
                      </div>
                      <p style={{ margin: "0 0 .2rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--brand-primary)" }}>
                        {fmtNum(s.consumption)} <span style={{ fontSize: ".72rem", fontWeight: 500, color: "var(--text-muted)" }}>kWh</span>
                      </p>
                      <p style={{ margin: 0, fontSize: ".9rem", fontWeight: 700, color: "#15803d" }}>
                        {fmtNum(s.cost)} <span style={{ fontSize: ".72rem", fontWeight: 500, color: "var(--text-muted)" }}>ILS</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* ── RECORDS TABLE ── */
        <Card className="overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Date", "التاريخ")}</th>
                  <th>{t("Shift", "الشفت")}</th>
                  <th>{t("Start (kWh)", "بداية")}</th>
                  <th>{t("End (kWh)", "نهاية")}</th>
                  <th>{t("Consumption", "الاستهلاك")}</th>
                  {showPrice && <th>{t("Price/kWh", "سعر/kWh")}</th>}
                  {showPrice && <th>{t("Shift Cost (ILS)", "تكلفة الشفت")}</th>}
                  <th>{t("Reset", "تهيئة")}</th>
                  <th>{t("Recorded By", "سجّله")}</th>
                  <th>{t("Notes", "ملاحظات")}</th>
                  <th>{t("Photo", "صورة")}</th>
                  {!isAccountant && <th></th>}
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("en-GB")}</td>
                    <td>{shiftBadge(r.shift.name)}</td>
                    <td>{fmtNum(r.startReading)}</td>
                    <td>{fmtNum(r.endReading)}</td>
                    <td><strong style={{ color: "var(--brand-primary)" }}>{fmtNum(r.consumption)}</strong> <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>kWh</span></td>
                    {showPrice && <td style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>{fmtNum(r.kwhPriceSnap)}</td>}
                    {showPrice && <td><strong style={{ color: "#15803d" }}>{fmtNum(r.shiftCost)}</strong> <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>ILS</span></td>}
                    <td>{r.isMeterReset ? <span style={{ fontSize: ".75rem", padding: ".15rem .4rem", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>{t("Reset", "تهيئة")}</span> : "—"}</td>
                    <td style={{ fontSize: ".85rem" }}>{r.recordedBy.fullName}</td>
                    <td style={{ fontSize: ".8rem", color: "var(--text-secondary)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes ?? "—"}</td>
                    <td>
                      {r.imagePath ? (
                        <a href={globalPictureUrl(r.imagePath)} target="_blank" rel="noreferrer">
                          <img src={globalPictureUrl(r.imagePath)} alt="meter" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border-default)" }} />
                        </a>
                      ) : "—"}
                    </td>
                    {!isAccountant && (
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                          {isAdmin && (
                            <button type="button" onClick={() => openEdit(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: ".25rem" }} title={t("Edit", "تعديل")}>
                              <Pencil size={14} />
                            </button>
                          )}
                          {(isAdmin || !isAccountant) && (
                            <button type="button" onClick={() => void handleDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-danger)", padding: ".25rem" }} title={t("Delete", "حذف")}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {showPrice && (
                <tfoot>
                  <tr style={{ background: "var(--bg-subtle)", fontWeight: 700 }}>
                    <td colSpan={5} style={{ textAlign: "right", paddingRight: "1rem" }}>{t("Total", "المجموع")}</td>
                    <td />
                    <td style={{ color: "#15803d" }}>{fmtNum(grandTotal.cost)} ILS</td>
                    <td colSpan={4} />
                    {!isAccountant && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* ── Admin edit modal ── */}
      {editingReading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setEditingReading(null)}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t("Fix / Correct Reading", "تصحيح القراءة")}</h3>
              <button type="button" onClick={() => setEditingReading(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: ".65rem .875rem", background: "rgba(245,158,11,.08)", borderRadius: 8, marginBottom: "1rem", fontSize: ".8rem", color: "#92400e", fontWeight: 600 }}>
              📅 {t("Date", "التاريخ")}: {new Date(editingReading.date).toLocaleDateString()} — {t("Shift", "الشفت")}: {editingReading.shift.name}
            </div>
            {editError && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{editError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: ".75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {t("Start (kWh)", "القراءة البدائية")}
                <input type="number" className="input" value={editStart} onChange={e => setEditStart(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {t("End (kWh)", "القراءة النهائية")}
                <input type="number" className="input" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".85rem", fontWeight: 600, marginBottom: ".75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={editReset} onChange={e => setEditReset(e.target.checked)} />
              {t("Meter was reset", "تمت إعادة تعيين العداد")}
            </label>
            {editReset && (
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: ".75rem" }}>
                {t("Max value before reset", "أقصى قيمة قبل الإعادة")}
                <input type="number" className="input" value={editMaxVal} onChange={e => setEditMaxVal(e.target.value)} />
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: "1rem" }}>
              {t("Notes", "ملاحظات")}
              <textarea className="input" rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditingReading(null)} style={{ padding: ".5rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 }}>
                {t("Cancel", "إلغاء")}
              </button>
              <button type="button" disabled={editSaving} onClick={() => void handleEditSave()} style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: ".85rem", fontWeight: 700 }}>
                {editSaving ? t("Saving…", "جاري الحفظ…") : t("Save Correction", "حفظ التصحيح")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
