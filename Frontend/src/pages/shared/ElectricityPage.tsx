import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Pencil,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";

type Shift = { id: number; name: string };
type User = { id: number; fullName: string; username: string };
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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

function shiftBadge(name: string) {
  const c: Record<string, string> = {
    A: "#3b82f6",
    B: "#f97316",
    C: "#8b5cf6",
  };
  const bg = Object.entries(c).find(([k]) => name.includes(k))?.[1] ?? "#64748b";
  return (
    <span style={{
      display: "inline-block",
      padding: ".15rem .55rem",
      borderRadius: "999px",
      background: bg,
      color: "#fff",
      fontSize: ".8rem",
      fontWeight: 700,
    }}>
      {name}
    </span>
  );
}

const fmtNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ElectricityPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";
  const readOnly = isAccountant && !isAdmin;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [kwhPrice, setKwhPrice] = useState<KwhPrice | null>(null);
  const [readings, setReadings] = useState<ElectricityReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editReset, setEditReset] = useState(false);
  const [editMaxVal, setEditMaxVal] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Form state
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fShiftId, setFShiftId] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fReset, setFReset] = useState(false);
  const [fMaxVal, setFMaxVal] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fEngineerId, setFEngineerId] = useState("");
  const [fImage, setFImage] = useState<File | null>(null);

  // Live preview calculations
  const alreadyRecordedElectricity =
    fShiftId !== "" &&
    readings.some(
      (r) => r.shift.id === Number(fShiftId) && r.date.slice(0, 10) === fDate,
    );

  const startNum = parseFloat(fStart);
  const endNum = parseFloat(fEnd);
  const maxNum = parseFloat(fMaxVal);
  const previewConsumption = fReset
    ? (Number.isFinite(maxNum) && Number.isFinite(startNum) && Number.isFinite(endNum))
      ? (maxNum - startNum) + endNum
      : null
    : (Number.isFinite(startNum) && Number.isFinite(endNum) && endNum > startNum)
      ? endNum - startNum
      : null;
  const previewCost = previewConsumption !== null && kwhPrice
    ? previewConsumption * kwhPrice.price
    : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sh, pr, rds] = await Promise.all([
        api<Shift[]>("/shifts").catch(() => [] as Shift[]),
        api<KwhPrice | null>("/electricity/kwh-price").catch(() => null),
        api<ElectricityReading[]>(`/electricity/readings?${new URLSearchParams({
          ...(filterFromDate ? { fromDate: filterFromDate } : {}),
          ...(filterToDate ? { toDate: filterToDate } : {}),
          ...(filterShift ? { shiftId: filterShift } : {}),
        }).toString()}`).catch(() => [] as ElectricityReading[]),
      ]);
      setShifts(Array.isArray(sh) ? sh : []);
      setKwhPrice(pr);
      setReadings(rds);

      if (isAdmin) {
        const users = await api<User[]>("/users/all").catch(() => []);
        setEngineers(users);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to load data", "فشل تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }, [filterFromDate, filterToDate, filterShift, isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fReset && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum <= startNum) {
      setError(nav(
        "Invalid meter reading: End value must be greater than start value",
        "قراءة العداد غير صالحة: يجب أن تكون القراءة النهائية أكبر من القراءة الأولية",
      ));
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
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(nav("Reading recorded successfully", "تم تسجيل القراءة بنجاح"));
      setFStart(""); setFEnd(""); setFNotes(""); setFReset(false); setFMaxVal(""); setFEngineerId(""); setFImage(null);
      setShowForm(false);
      void loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to submit", "فشل الإرسال"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this reading?", "هل تريد حذف هذه القراءة؟"), { danger: true, confirmText: nav("Delete", "حذف") }))) return;
    try {
      await api(`/electricity/readings/${id}`, { method: "DELETE" });
      setReadings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Delete failed", "فشل الحذف"));
    }
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
    setEditSaving(true);
    setEditError("");
    try {
      await api(`/electricity/readings/${editingReading.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startReading: Number(editStart),
          endReading: Number(editEnd),
          isMeterReset: editReset,
          maxMeterValue: editReset ? Number(editMaxVal) : undefined,
          notes: editNotes || undefined,
        }),
      });
      setEditingReading(null);
      void loadData();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : nav("Save failed", "فشل الحفظ"));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <ModulePageShell
      title={nav("Electricity Consumption", "استهلاك الكهرباء")}
      subtitle={nav(
        "Record and track shift electricity meter readings, consumption and cost.",
        "تسجيل وتتبع قراءات عداد الكهرباء لكل شفت والاستهلاك والتكلفة.",
      )}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
          {kwhPrice ? (
            <span style={{
              fontSize: ".8rem", fontWeight: 700, padding: ".3rem .75rem",
              borderRadius: "999px", background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)", color: "var(--text-secondary)",
            }}>
              <Zap size={12} style={{ display: "inline", marginRight: 4 }} />
              {nav("Price", "السعر")}: {fmtNum(kwhPrice.price)} ILS/kWh
            </span>
          ) : (
            <span style={{ fontSize: ".8rem", color: "var(--clr-danger)", fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ display: "inline", marginRight: 4 }} />
              {nav("No kWh price set", "لم يتم تحديد سعر kWh")}
            </span>
          )}
          {!readOnly && (
            <button type="button" className="auth-button" onClick={() => setShowForm((v) => !v)}>
              <Plus size={15} />
              {nav("Record Reading", "تسجيل قراءة")}
            </button>
          )}
        </div>
      }
    >
      {error ? <div className="auth-alert auth-alert--error mb-4">{error}</div> : null}
      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "#dcfce7", color: "#15803d", marginBottom: "1rem", fontSize: ".9rem", fontWeight: 600 }}>
          <CheckCircle size={16} />
          {success}
        </div>
      ) : null}

      {/* Recording form */}
      {showForm && !readOnly && (
        <Card className="mb-6 p-5">
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <Calculator size={18} style={{ color: "var(--brand-primary)" }} />
            {nav("New Electricity Reading", "قراءة كهرباء جديدة")}
          </h3>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {/* Date */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Date *", "التاريخ *")}</span>
                <input type="date" className="module-form__input" required value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </label>

              {/* Shift */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Shift *", "الشفت *")}</span>
                <select className="module-form__input" required value={fShiftId} onChange={(e) => setFShiftId(e.target.value)}>
                  <option value="">{nav("Select shift…", "اختر شفت…")}</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            {alreadyRecordedElectricity && (
              <div style={{
                display: "flex", alignItems: "center", gap: ".5rem",
                padding: ".6rem .875rem", marginBottom: "1rem",
                background: "rgba(245,158,11,.1)",
                border: "1px solid rgba(245,158,11,.4)",
                borderRadius: "var(--radius-lg)",
                fontSize: ".82rem", fontWeight: 600, color: "#b45309",
              }}>
                <AlertTriangle size={15} />
                {nav(
                  `A reading for this shift and date already exists — submitting will add a second record`,
                  `توجد قراءة لهذا الشفت في هذا التاريخ بالفعل — الإرسال سيضيف سجلاً ثانياً`,
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {/* Start reading */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Start Meter Reading (kWh) *", "قراءة العداد الأولية (kWh) *")}</span>
                <input type="number" className="module-form__input" min={0} step="any" required value={fStart} onChange={(e) => setFStart(e.target.value)} placeholder="e.g. 12500.00" />
              </label>

              {/* End reading */}
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("End Meter Reading (kWh) *", "قراءة العداد النهائية (kWh) *")}</span>
                <input
                  type="number" className="module-form__input" min={0} step="any" required
                  value={fEnd} onChange={(e) => setFEnd(e.target.value)} placeholder="e.g. 12650.00"
                  style={!fReset && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum <= startNum ? { borderColor: "var(--clr-danger)" } : {}}
                />
                {!fReset && Number.isFinite(startNum) && Number.isFinite(endNum) && endNum <= startNum && (
                  <span style={{ fontSize: ".75rem", color: "var(--clr-danger)", fontWeight: 600 }}>
                    {nav("End must be greater than start", "يجب أن تكون أكبر من البداية")}
                  </span>
                )}
              </label>

              {/* Engineer */}
              {isAdmin && engineers.length > 0 && (
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                  <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Responsible Engineer", "المهندس المسؤول")}</span>
                  <select className="module-form__input" value={fEngineerId} onChange={(e) => setFEngineerId(e.target.value)}>
                    <option value="">{nav("None", "لا يوجد")}</option>
                    {engineers.filter((u) => (u as unknown as { role: string }).role === "ENGINEER").map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Meter reset checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1rem", cursor: "pointer", fontSize: ".9rem", fontWeight: 600, color: "var(--text-primary)" }}>
              <input type="checkbox" checked={fReset} onChange={(e) => setFReset(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--brand-primary)" }} />
              <RefreshCw size={15} style={{ color: "var(--brand-primary)" }} />
              {nav("Meter Reset", "إعادة تشغيل العداد")}
            </label>

            {fReset && (
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1rem", maxWidth: 240 }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Max Meter Value *", "الحد الأقصى للعداد *")}</span>
                <input type="number" className="module-form__input" min={1} step="any" required value={fMaxVal} onChange={(e) => setFMaxVal(e.target.value)} placeholder="e.g. 99999.99" />
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  {nav("Consumption = (Max - Start) + End", "الاستهلاك = (الحد الأقصى - البداية) + النهاية")}
                </span>
              </label>
            )}

            {/* Live preview */}
            {previewConsumption !== null && (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "var(--bg-subtle)", border: "1px solid var(--border-default)", marginBottom: "1rem" }}>
                <div>
                  <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600 }}>{nav("Consumption", "الاستهلاك")}</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--brand-primary)" }}>{fmtNum(previewConsumption)} kWh</p>
                </div>
                {previewCost !== null && (
                  <div>
                    <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600 }}>{nav("Estimated Cost", "التكلفة التقديرية")}</p>
                    <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#15803d" }}>{fmtNum(previewCost)} ILS</p>
                  </div>
                )}
                {kwhPrice && (
                  <div>
                    <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600 }}>{nav("kWh Price", "سعر kWh")}</p>
                    <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-secondary)" }}>{fmtNum(kwhPrice.price)} ILS</p>
                  </div>
                )}
              </div>
            )}

            {/* Meter photo */}
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Meter Photo (optional)", "صورة العداد (اختياري)")}</span>
              <input
                type="file"
                accept="image/*"
                className="module-form__input"
                onChange={(e) => setFImage(e.target.files?.[0] ?? null)}
                style={{ padding: ".35rem" }}
              />
              {fImage && (
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>{fImage.name}</span>
              )}
            </label>

            {/* Notes */}
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Notes", "ملاحظات")}</span>
              <textarea className="module-form__input" rows={2} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder={nav("Optional notes…", "ملاحظات اختيارية…")} style={{ resize: "vertical" }} />
            </label>

            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
              <button type="submit" className="auth-button" disabled={submitting || !kwhPrice}>
                {submitting ? nav("Saving…", "جاري الحفظ…") : nav("Save Reading", "حفظ القراءة")}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowForm(false)}>
                {nav("Cancel", "إلغاء")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {nav("From", "من")}
            <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {nav("To", "إلى")}
            <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {nav("Shift", "الشفت")}
            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}>
              <option value="">{nav("All shifts", "جميع الشفتات")}</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button type="button" className="auth-button" onClick={() => void loadData()}>{nav("Apply", "تطبيق")}</button>
          <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFilterFromDate(""); setFilterToDate(""); setFilterShift(""); }}>
            {nav("Clear", "مسح")}
          </button>
        </div>
      </Card>

      {/* Readings table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>{nav("Loading…", "جاري التحميل…")}</div>
      ) : readings.length === 0 ? (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <Zap size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{nav("No readings found", "لا توجد قراءات")}</p>
          {!readOnly && !showForm && (
            <button type="button" className="auth-button" style={{ marginTop: "1rem" }} onClick={() => setShowForm(true)}>
              <Plus size={15} />
              {nav("Record First Reading", "سجّل أول قراءة")}
            </button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{nav("Date", "التاريخ")}</th>
                  <th>{nav("Shift", "الشفت")}</th>
                  <th>{nav("Start (kWh)", "بداية (kWh)")}</th>
                  <th>{nav("End (kWh)", "نهاية (kWh)")}</th>
                  <th>{nav("Consumption", "الاستهلاك")}</th>
                  <th>{nav("Price/kWh", "سعر/kWh")}</th>
                  <th>{nav("Shift Cost", "تكلفة الشفت")}</th>
                  <th>{nav("Reset", "تهيئة")}</th>
                  <th>{nav("Recorded By", "سجّله")}</th>
                  <th>{nav("Notes", "ملاحظات")}</th>
                  <th>{nav("Photo", "صورة")}</th>
                  {!readOnly && <th></th>}
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("en-GB")}</td>
                    <td>{shiftBadge(r.shift.name)}</td>
                    <td>{fmtNum(r.startReading)}</td>
                    <td>{fmtNum(r.endReading)}</td>
                    <td>
                      <strong style={{ color: "var(--brand-primary)" }}>{fmtNum(r.consumption)}</strong>
                      <span style={{ fontSize: ".75rem", color: "var(--text-muted)", marginLeft: 4 }}>kWh</span>
                    </td>
                    <td style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>{fmtNum(r.kwhPriceSnap)}</td>
                    <td>
                      <strong style={{ color: "#15803d" }}>{fmtNum(r.shiftCost)}</strong>
                      <span style={{ fontSize: ".75rem", color: "var(--text-muted)", marginLeft: 4 }}>ILS</span>
                    </td>
                    <td>
                      {r.isMeterReset ? (
                        <span style={{ fontSize: ".75rem", padding: ".15rem .4rem", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
                          {nav("Reset", "تهيئة")}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: ".85rem" }}>{r.recordedBy.fullName}</td>
                    <td style={{ fontSize: ".8rem", color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.notes ?? "—"}
                    </td>
                    <td>
                      {r.imagePath ? (
                        <a href={`${API_BASE_URL.replace("/api", "")}/pictures/${r.imagePath}`} target="_blank" rel="noreferrer">
                          <img
                            src={`${API_BASE_URL.replace("/api", "")}/pictures/${r.imagePath}`}
                            alt="meter"
                            style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border-default)" }}
                          />
                        </a>
                      ) : "—"}
                    </td>
                    {!readOnly && (
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: ".25rem" }}
                              title={nav("Edit / Fix reading", "تعديل القراءة")}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(r.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-danger)", padding: ".25rem" }}
                            title={nav("Delete", "حذف")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Admin edit modal ────────────────────────────────────── */}
      {editingReading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setEditingReading(null)}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                {nav("Fix / Correct Reading", "تصحيح القراءة")}
              </h3>
              <button type="button" onClick={() => setEditingReading(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
            </div>

            <div style={{ padding: ".65rem .875rem", background: "rgba(245,158,11,.08)", borderRadius: 8, marginBottom: "1rem", fontSize: ".8rem", color: "#92400e", fontWeight: 600 }}>
              📅 {nav("Date", "التاريخ")}: {new Date(editingReading.date).toLocaleDateString()} — {nav("Shift", "الشفت")}: {editingReading.shift.name}
            </div>

            {editError && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", fontSize: ".82rem" }}>{editError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: ".75rem", marginBottom: ".75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("Start Reading (kWh)", "القراءة البدائية")}
                <input type="number" className="input" value={editStart} onChange={e => setEditStart(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600 }}>
                {nav("End Reading (kWh)", "القراءة النهائية")}
                <input type="number" className="input" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".85rem", fontWeight: 600, marginBottom: ".75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={editReset} onChange={e => setEditReset(e.target.checked)} />
              {nav("Meter was reset (counter restarted)", "تمت إعادة تعيين العداد (العداد بدأ من جديد)")}
            </label>

            {editReset && (
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: ".75rem" }}>
                {nav("Max Meter Value before reset", "أقصى قيمة للعداد قبل الإعادة")}
                <input type="number" className="input" value={editMaxVal} onChange={e => setEditMaxVal(e.target.value)} />
              </label>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".83rem", fontWeight: 600, marginBottom: "1rem" }}>
              {nav("Notes", "ملاحظات")}
              <textarea className="input" rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </label>

            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditingReading(null)}
                style={{ padding: ".5rem 1rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 }}>
                {nav("Cancel", "إلغاء")}
              </button>
              <button type="button" disabled={editSaving} onClick={() => void handleEditSave()}
                style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: ".85rem", fontWeight: 700 }}>
                {editSaving ? nav("Saving…", "جاري الحفظ…") : nav("Save Correction", "حفظ التصحيح")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
