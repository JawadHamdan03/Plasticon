import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";
import { PhotoUploadButton } from "../../components/PhotoUploadButton";
import { API_BASE_URL, pictureUrl as globalPictureUrl, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { useLocale } from "../../context/LocaleContext";

type Reading = {
  id: number;
  machineName: string;
  readingType: string;
  value: number;
  unit: string;
  notes: string | null;
  imagePath: string | null;
  shift: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
};

type ReadingTypeMeta = {
  value: string;
  labelEn: string;
  labelAr: string;
  defaultUnit: string;
  color: string;
  icon: string;
};

const READING_TYPES: ReadingTypeMeta[] = [
  { value: "TEMPERATURE", labelEn: "Temperature", labelAr: "درجة حرارة", defaultUnit: "°C", color: "#ef4444", icon: "🌡️" },
  { value: "PRESSURE",    labelEn: "Pressure",    labelAr: "ضغط",         defaultUnit: "bar", color: "#f97316", icon: "💨" },
  { value: "RUN_HOURS",   labelEn: "Run Hours",   labelAr: "ساعات تشغيل", defaultUnit: "hrs", color: "#3b82f6", icon: "⏱️" },
  { value: "ELECTRICITY_KWH", labelEn: "Electricity", labelAr: "كهرباء", defaultUnit: "kWh", color: "#eab308", icon: "⚡" },
  { value: "VIBRATION",   labelEn: "Vibration",   labelAr: "اهتزاز",      defaultUnit: "mm/s", color: "#8b5cf6", icon: "📳" },
  { value: "HUMIDITY",    labelEn: "Humidity",    labelAr: "رطوبة",        defaultUnit: "%", color: "#06b6d4", icon: "💧" },
  { value: "CUSTOM",      labelEn: "Custom",      labelAr: "مخصص",         defaultUnit: "", color: "#6b7280", icon: "🔧" },
];

const MACHINE_SUGGESTIONS = [
  "Robot", "Chiller", "Dryer", "Heater", "Compressor",
  "Cutting Machine", "Air Compressor", "Cooling Tower", "Generator",
];

type Draft = {
  machineName: string;
  readingType: string;
  value: string;
  unit: string;
  shift: string;
  notes: string;
  image: File | null;
};

const defaultDraft: Draft = {
  machineName: "",
  readingType: "TEMPERATURE",
  value: "",
  unit: "°C",
  shift: "",
  notes: "",
  image: null,
};

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeader(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

const normImg = (value: string | null) => {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  return globalPictureUrl(value);
};

const getTypeMeta = (type: string) =>
  READING_TYPES.find((t) => t.value === type) ?? READING_TYPES[READING_TYPES.length - 1];

export function SupportMachineReadingsPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [history, setHistory] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "">("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/support-machine-readings/mine");
      if (!res.ok) throw new Error(await readApiError(res));
      setHistory((await res.json()) as Reading[]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load");
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleTypeChange = (type: string) => {
    const meta = getTypeMeta(type);
    setDraft((p) => ({ ...p, readingType: type, unit: meta.defaultUnit }));
  };

  const handleSubmit = async () => {
    const machineName = draft.machineName.trim();
    const value = Number(draft.value);
    const unit = draft.unit.trim();

    if (!machineName) {
      setMessageTone("error");
      setMessage("اسم الماكينة مطلوب");
      return;
    }
    if (!Number.isFinite(value)) {
      setMessageTone("error");
      setMessage("القيمة يجب أن تكون رقماً");
      return;
    }
    if (!unit) {
      setMessageTone("error");
      setMessage("الوحدة مطلوبة");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("machineName", machineName);
      formData.append("readingType", draft.readingType);
      formData.append("value", String(value));
      formData.append("unit", unit);
      if (draft.shift) formData.append("shift", draft.shift);
      if (draft.notes.trim()) formData.append("notes", draft.notes.trim());
      if (draft.image) formData.append("image", draft.image);

      const res = await apiFetch("/support-machine-readings", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await readApiError(res));

      setDraft(defaultDraft);
      setMessageTone("success");
      setMessage("تم الحفظ بنجاح");
      await loadHistory();
    } catch (err) {
      setMessageTone("error");
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Reading) => {
    const confirmed = await confirmDialog(
      isAr
        ? `حذف قراءة ${item.machineName}؟`
        : `Delete reading for ${item.machineName}?`,
      { danger: true, confirmText: "حذف" },
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await apiFetch(`/support-machine-readings/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMessageTone("success");
      setMessage("تم الحذف");
      await loadHistory();
    } catch (err) {
      setMessageTone("error");
      setMessage(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const machineSuggestions = useMemo(() => {
    const fromHistory = Array.from(new Set(history.map((h) => h.machineName)));
    return Array.from(new Set([...MACHINE_SUGGESTIONS, ...fromHistory]));
  }, [history]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return history.filter((h) => new Date(h.createdAt).toDateString() === today).length;
  }, [history]);

  const uniqueMachines = useMemo(
    () => new Set(history.map((h) => h.machineName)).size,
    [history],
  );

  return (
    <ModulePageShell
      title={"قراءات الماكينات الداعمة"}
      subtitle={
        isAr
          ? "سجّل قراءات الحرارة والضغط وساعات التشغيل للمعدات الداعمة"
          : "Log temperature, pressure, run hours and readings for support equipment"
      }
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => void loadHistory()}
        >
          {"تحديث"}
        </button>
      }
    >
      {/* KPI Row */}
      <div className="wt-kpi-grid">
        <div className="wt-kpi-card wt-kpi-card--blue">
          <span className="wt-kpi-icon">📋</span>
          <p className="wt-kpi-label">{"قراءات اليوم"}</p>
          <strong className="wt-kpi-value">{todayCount}</strong>
        </div>
        <div className="wt-kpi-card wt-kpi-card--green">
          <span className="wt-kpi-icon">⚙️</span>
          <p className="wt-kpi-label">{"الماكينات"}</p>
          <strong className="wt-kpi-value">{uniqueMachines}</strong>
        </div>
        <div className="wt-kpi-card wt-kpi-card--orange">
          <span className="wt-kpi-icon">📊</span>
          <p className="wt-kpi-label">{"إجمالي القراءات"}</p>
          <strong className="wt-kpi-value">{history.length}</strong>
        </div>
      </div>

      {/* Message */}
      {message ? (
        <div
          className={`auth-alert ${messageTone === "error" ? "auth-alert--error" : "auth-alert--success"}`}
          style={{ marginBottom: "1rem" }}
        >
          {message}
        </div>
      ) : null}

      <div className="wt-layout">
        {/* ── Form Panel ── */}
        <div>
          <div className="wt-card">
            <div className="wt-card__header wt-card__header--blue">
              <span className="wt-card__header-icon">⚙️</span>
              <div>
                <h2 className="wt-card__header-title">
                  {"تسجيل قراءة جديدة"}
                </h2>
                <p className="wt-card__header-sub">
                  {isAr
                    ? "سجّل الحرارة، الضغط، ساعات التشغيل وغيرها"
                    : "Temperature, pressure, run hours, electricity…"}
                </p>
              </div>
            </div>
            <div className="wt-card__body">
              <div className="wt-form-grid">
                {/* Machine name */}
                <div className="wt-field wt-field--full">
                  <label>{"اسم الماكينة"}</label>
                  <input
                    list="smr-machine-list"
                    value={draft.machineName}
                    placeholder={"مثال: Chiller-01"}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, machineName: e.target.value }))
                    }
                  />
                  <datalist id="smr-machine-list">
                    {machineSuggestions.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Reading type */}
                <div className="wt-field wt-field--full">
                  <label>{"نوع القراءة"}</label>
                  <select
                    value={draft.readingType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    {READING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div className="wt-field">
                  <label>{"القيمة"}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.value}
                    placeholder="0"
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, value: e.target.value }))
                    }
                  />
                </div>

                {/* Unit */}
                <div className="wt-field">
                  <label>{"الوحدة"}</label>
                  <input
                    value={draft.unit}
                    placeholder={"مثال: °C, bar, hrs"}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, unit: e.target.value }))
                    }
                  />
                </div>

                {/* Shift */}
                <div className="wt-field">
                  <label>{"الشفت"}</label>
                  <select
                    value={draft.shift}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, shift: e.target.value }))
                    }
                  >
                    <option value="">{"— اختياري —"}</option>
                    <option value="MORNING">{"صباحي"}</option>
                    <option value="AFTERNOON">{"مسائي"}</option>
                    <option value="NIGHT">{"ليلي"}</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="wt-field">
                  <label>{"ملاحظات"}</label>
                  <input
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>

                {/* Photo */}
                <div className="wt-field wt-field--full">
                  <label>{"صورة العداد / المقياس"}</label>
                  <PhotoUploadButton
                    label={"التقط صورة"}
                    selectedFileName={draft.image?.name ?? null}
                    onFileSelect={(file) =>
                      setDraft((p) => ({ ...p, image: file }))
                    }
                  />
                </div>
              </div>

              <div className="wt-form-actions">
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={() => setDraft(defaultDraft)}
                >
                  {"مسح"}
                </button>
                <button
                  type="button"
                  className="auth-button"
                  disabled={saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : "حفظ القراءة"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── History Panel ── */}
        <div>
          <div className="wt-card">
            <div className="wt-card__header wt-card__header--gray">
              <span className="wt-card__header-icon">🕐</span>
              <div>
                <h2 className="wt-card__header-title">
                  {"آخر القراءات"}
                </h2>
                <p className="wt-card__header-sub">
                  {history.length} {"سجل"}
                </p>
              </div>
            </div>
            <div className="wt-card__body">
              {loading ? <TruckLoader /> : null}
              {!loading && history.length === 0 ? (
                <div className="wt-empty">
                  <span className="wt-empty__icon">📭</span>
                  <p>{"لا توجد قراءات بعد"}</p>
                </div>
              ) : null}
              <div className="wt-log-cards">
                {history.slice(0, 40).map((item) => {
                  const meta = getTypeMeta(item.readingType);
                  return (
                    <div className="wt-log-card" key={item.id} style={{ borderTop: `3px solid ${meta.color}` }}>
                      <div className="wt-log-card__header">
                        <strong>{item.machineName}</strong>
                        <span
                          className="wt-badge"
                          style={{
                            background: `${meta.color}18`,
                            color: meta.color,
                            border: `1px solid ${meta.color}35`,
                          }}
                        >
                          {meta.icon} {meta.labelAr}
                        </span>
                      </div>

                      <div className="wt-log-card__meta">
                        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: meta.color }}>
                          {item.value}
                          <small style={{ fontSize: ".8rem", fontWeight: 500, color: "var(--text-secondary)", marginLeft: "4px" }}>
                            {item.unit}
                          </small>
                        </span>
                        {item.shift ? (
                          <span className="wt-badge wt-badge--gray">{item.shift}</span>
                        ) : null}
                        {item.notes ? (
                          <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                            📝 {item.notes}
                          </span>
                        ) : null}
                      </div>

                      {item.imagePath ? (
                        <div className="worker-snapshot-history-images">
                          <a
                            href={normImg(item.imagePath) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img src={normImg(item.imagePath) ?? ""} alt="reading" />
                          </a>
                        </div>
                      ) : null}

                      <div className="wt-log-card__footer">
                        <small className="wt-log-card__date">
                          {new Date(item.createdAt).toLocaleString()}
                        </small>
                        <button
                          type="button"
                          className="auth-button auth-button--ghost worker-snapshot-row-actions__danger"
                          disabled={saving}
                          onClick={() => void handleDelete(item)}
                        >
                          {"حذف"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
