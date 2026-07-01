import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";
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

const TYPE_COLORS: Record<string, string> = {
  TEMPERATURE:     "#ef4444",
  PRESSURE:        "#f97316",
  RUN_HOURS:       "#3b82f6",
  ELECTRICITY_KWH: "#eab308",
  VIBRATION:       "#8b5cf6",
  HUMIDITY:        "#06b6d4",
  CUSTOM:          "#6b7280",
};

const TYPE_ICONS: Record<string, string> = {
  TEMPERATURE:     "🌡️",
  PRESSURE:        "💨",
  RUN_HOURS:       "⏱️",
  ELECTRICITY_KWH: "⚡",
  VIBRATION:       "📳",
  HUMIDITY:        "💧",
  CUSTOM:          "🔧",
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

export function AdminSupportMachinesPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const loadReadings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/support-machine-readings");
      if (!res.ok) throw new Error(await readApiError(res));
      setReadings((await res.json()) as Reading[]);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReadings(); }, [loadReadings]);

  const filtered = useMemo(() => {
    let data = readings;
    if (filterMachine.trim()) {
      const q = filterMachine.trim().toLowerCase();
      data = data.filter((r) => r.machineName.toLowerCase().includes(q));
    }
    if (filterType) {
      data = data.filter((r) => r.readingType === filterType);
    }
    if (filterDate) {
      data = data.filter((r) => r.createdAt.slice(0, 10) === filterDate);
    }
    return data;
  }, [readings, filterMachine, filterType, filterDate]);

  const handleDelete = async (item: Reading) => {
    const confirmed = await confirmDialog(
      isAr
        ? `حذف قراءة ${item.machineName}؟`
        : `Delete reading for ${item.machineName}?`,
      { danger: true },
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/support-machine-readings/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      await loadReadings();
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
    }
  };

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return readings.filter((r) => new Date(r.createdAt).toDateString() === today).length;
  }, [readings]);

  const uniqueMachines = useMemo(
    () => new Set(readings.map((r) => r.machineName)).size,
    [readings],
  );

  const uniqueTypes = useMemo(
    () => new Set(readings.map((r) => r.readingType)).size,
    [readings],
  );

  // Latest reading per machine (for the summary row)
  const latestPerMachine = useMemo(() => {
    const map = new Map<string, Reading>();
    for (const r of readings) {
      if (!map.has(r.machineName)) map.set(r.machineName, r);
    }
    return Array.from(map.values());
  }, [readings]);

  return (
    <ModulePageShell
      title={"قراءات الماكينات الداعمة"}
      subtitle={
        isAr
          ? "جميع قراءات معدات الدعم من المهندسين والعمال"
          : "All support equipment readings from engineers and workers"
      }
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => void loadReadings()}
        >
          {"تحديث"}
        </button>
      }
    >
      {/* KPI Row */}
      <div className="wt-kpi-grid">
        <div className="wt-kpi-card wt-kpi-card--blue">
          <span className="wt-kpi-icon">📊</span>
          <p className="wt-kpi-label">{"إجمالي القراءات"}</p>
          <strong className="wt-kpi-value">{readings.length}</strong>
        </div>
        <div className="wt-kpi-card wt-kpi-card--green">
          <span className="wt-kpi-icon">📋</span>
          <p className="wt-kpi-label">{"اليوم"}</p>
          <strong className="wt-kpi-value">{todayCount}</strong>
        </div>
        <div className="wt-kpi-card wt-kpi-card--orange">
          <span className="wt-kpi-icon">⚙️</span>
          <p className="wt-kpi-label">{"الماكينات"}</p>
          <strong className="wt-kpi-value">{uniqueMachines}</strong>
        </div>
        <div className="wt-kpi-card wt-kpi-card--purple">
          <span className="wt-kpi-icon">🔧</span>
          <p className="wt-kpi-label">{"أنواع القراءات"}</p>
          <strong className="wt-kpi-value">{uniqueTypes}</strong>
        </div>
      </div>

      {/* Latest per machine summary */}
      {latestPerMachine.length > 0 ? (
        <div className="wt-card" style={{ marginBottom: "1.5rem" }}>
          <div className="wt-card__header wt-card__header--blue">
            <span className="wt-card__header-icon">📌</span>
            <div>
              <h2 className="wt-card__header-title">
                {"آخر قراءة لكل ماكينة"}
              </h2>
            </div>
          </div>
          <div className="wt-card__body">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {latestPerMachine.map((item) => {
                const color = TYPE_COLORS[item.readingType] ?? "#6b7280";
                const icon = TYPE_ICONS[item.readingType] ?? "🔧";
                return (
                  <div
                    key={item.machineName}
                    style={{
                      flex: "1 1 180px",
                      minWidth: "160px",
                      border: `1.5px solid ${color}30`,
                      borderTop: `3px solid ${color}`,
                      borderRadius: "var(--radius-lg)",
                      padding: ".75rem 1rem",
                      background: `${color}06`,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".85rem", color: "var(--text-primary)" }}>
                      {item.machineName}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: 800, color }}>
                      {icon} {item.value}
                      <small style={{ fontSize: ".78rem", fontWeight: 400, marginLeft: 4 }}>{item.unit}</small>
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: ".72rem", color: "var(--text-tertiary)" }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {item.createdByName ? (
                      <p style={{ margin: "2px 0 0", fontSize: ".7rem", color: "var(--text-tertiary)" }}>
                        👤 {item.createdByName}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="wt-filter-row" style={{ marginBottom: "1.5rem" }}>
        <div className="wt-field">
          <label>{"الماكينة"}</label>
          <input
            value={filterMachine}
            placeholder={"بحث..."}
            onChange={(e) => setFilterMachine(e.target.value)}
          />
        </div>
        <div className="wt-field">
          <label>{"نوع القراءة"}</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">{"الكل"}</option>
            <option value="TEMPERATURE">🌡️ Temperature</option>
            <option value="PRESSURE">💨 Pressure</option>
            <option value="RUN_HOURS">⏱️ Run Hours</option>
            <option value="ELECTRICITY_KWH">⚡ Electricity kWh</option>
            <option value="VIBRATION">📳 Vibration</option>
            <option value="HUMIDITY">💧 Humidity</option>
            <option value="CUSTOM">🔧 Custom</option>
          </select>
        </div>
        <div className="wt-field">
          <label>{"التاريخ"}</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="auth-button auth-button--ghost"
          style={{ alignSelf: "flex-end" }}
          onClick={() => { setFilterMachine(""); setFilterType(""); setFilterDate(""); }}
        >
          {"مسح"}
        </button>
      </div>

      {/* Readings grid */}
      {loading ? <TruckLoader /> : null}
      {!loading && filtered.length === 0 ? (
        <div className="wt-empty">
          <span className="wt-empty__icon">📭</span>
          <p>{"لا توجد قراءات"}</p>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {filtered.map((item) => {
          const color = TYPE_COLORS[item.readingType] ?? "#6b7280";
          const icon = TYPE_ICONS[item.readingType] ?? "🔧";
          return (
            <div
              className="wt-log-card"
              key={item.id}
              style={{ borderTop: `3px solid ${color}` }}
            >
              <div className="wt-log-card__header">
                <strong>{item.machineName}</strong>
                <span
                  className="wt-badge"
                  style={{
                    background: `${color}18`,
                    color,
                    border: `1px solid ${color}35`,
                    fontSize: ".7rem",
                  }}
                >
                  {icon} {item.readingType.replace(/_/g, " ")}
                </span>
              </div>

              <div className="wt-log-card__meta">
                <span style={{ fontSize: "1.35rem", fontWeight: 800, color }}>
                  {item.value}
                  <small style={{ fontSize: ".8rem", fontWeight: 400, marginLeft: 4, color: "var(--text-secondary)" }}>
                    {item.unit}
                  </small>
                </span>
                {item.shift ? (
                  <span className="wt-badge wt-badge--gray">{item.shift}</span>
                ) : null}
              </div>

              {item.notes ? (
                <div style={{ fontSize: ".8rem", color: "var(--text-secondary)", marginBottom: ".25rem" }}>
                  📝 {item.notes}
                </div>
              ) : null}

              {item.createdByName ? (
                <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)" }}>
                  👤 {item.createdByName}
                </div>
              ) : null}

              {item.imagePath ? (
                <div className="worker-snapshot-history-images" style={{ marginTop: ".5rem" }}>
                  <a href={normImg(item.imagePath) ?? "#"} target="_blank" rel="noreferrer">
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
                  disabled={deleting}
                  onClick={() => void handleDelete(item)}
                >
                  {"حذف"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModulePageShell>
  );
}
