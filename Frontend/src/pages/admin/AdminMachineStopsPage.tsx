import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, X } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, apiFetch, readApiError } from "../../lib/api";

type Priority = "CRITICAL" | "HIGH" | "NORMAL";
type StatusFilter = "all" | "open" | "resolved";

interface StopAlert {
  id: number;
  machine_label: string;
  priority: Priority;
  reason: string;
  started_at: string;
  resolved_at: string | null;
  response_minutes: number | null;
  created_at: string;
  worker_id: number | null;
  worker_name: string | null;
  worker_username: string | null;
}

const PRIORITY_COLOR: Record<Priority, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "var(--red-100)",    text: "var(--red-600)",    border: "var(--red-600)" },
  HIGH:     { bg: "var(--orange-100)", text: "var(--orange-600)", border: "var(--orange-600)" },
  NORMAL:   { bg: "var(--yellow-100)", text: "var(--yellow-600)", border: "var(--yellow-600)" },
};

function elapsed(isoStart: string, isoEnd?: string | null) {
  const end  = isoEnd ? new Date(isoEnd).getTime() : Date.now();
  const mins = Math.floor((end - new Date(isoStart).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminMachineStopsPage() {
  const { isAr } = useLocale();
  const [stops, setStops]         = useState<StopAlert[]>([]);
  const [filter, setFilter]       = useState<StatusFilter>("all");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  const load = useCallback(async (f: StatusFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/worker-tools/admin/machine-stop-alerts?status=${f}`,
      );
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as StopAlert[];
      setStops(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const handleFilterChange = (f: StatusFilter) => {
    setFilter(f);
    void load(f);
  };

  const handleResolve = async (id: number) => {
    if (!confirm(isAr ? "تأكيد حل هذا التوقف؟" : "Confirm resolving this machine stop?")) return;
    setResolving(id);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/worker-tools/admin/machine-stop-alerts/${id}/resolve`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      if (!res.ok) throw new Error(await readApiError(res));
      setStops(prev => prev.map(s =>
        s.id === id ? { ...s, resolved_at: new Date().toISOString() } : s,
      ));
    } catch (e: any) {
      alert(e.message ?? "Failed to resolve");
    } finally {
      setResolving(null);
    }
  };

  const criticalOpen = stops.filter(s => !s.resolved_at && s.priority === "CRITICAL").length;
  const highOpen     = stops.filter(s => !s.resolved_at && s.priority === "HIGH").length;
  const totalOpen    = stops.filter(s => !s.resolved_at).length;

  const STATUS_TABS: { key: StatusFilter; label: string; labelAr: string }[] = [
    { key: "all",      label: "All",      labelAr: "الكل" },
    { key: "open",     label: "Open",     labelAr: "مفتوح" },
    { key: "resolved", label: "Resolved", labelAr: "محلول" },
  ];

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {isAr ? "توقفات الآلات" : "Machine Stop Alerts"}
          </h1>
          <p style={{ fontSize: ".85rem", color: "var(--text-secondary)", marginTop: ".25rem" }}>
            {isAr
              ? "تنبيهات توقف الآلات التي أبلغ عنها العمال — في الوقت الفعلي"
              : "Worker-reported machine stops — real-time"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          style={{
            display: "flex", alignItems: "center", gap: ".5rem",
            padding: ".5rem .75rem", fontSize: ".85rem", fontWeight: 600,
            borderRadius: 8, border: "1px solid var(--border-default)",
            background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer",
          }}
        >
          <RefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          {isAr ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        <div style={{ borderRadius: 12, border: "1px solid var(--red-600)", background: "var(--red-50)", padding: "1rem" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--red-600)" }}>{criticalOpen}</div>
          <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--red-600)", marginTop: ".25rem" }}>
            {isAr ? "توقفات حرجة مفتوحة" : "Open Critical"}
          </div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid var(--orange-600)", background: "var(--orange-50)", padding: "1rem" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--orange-600)" }}>{highOpen}</div>
          <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--orange-600)", marginTop: ".25rem" }}>
            {isAr ? "توقفات عالية مفتوحة" : "Open High Priority"}
          </div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", background: "var(--bg-card)", padding: "1rem" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)" }}>{totalOpen}</div>
          <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: ".25rem" }}>
            {isAr ? "إجمالي المفتوحة" : "Total Open"}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--border-default)", borderRadius: 12, width: "fit-content" }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleFilterChange(t.key)}
            style={{
              padding: ".5rem 1rem", borderRadius: 8, fontSize: ".85rem", fontWeight: 700,
              border: "none", cursor: "pointer", transition: "all .15s",
              background: filter === t.key ? "var(--bg-card)" : "transparent",
              color: filter === t.key ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: filter === t.key ? "0 1px 3px rgba(0,0,0,.12)" : "none",
            }}
          >
            {isAr ? t.labelAr : t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem", borderRadius: 8, background: "var(--red-50)", color: "var(--red-600)", fontSize: ".85rem" }}>
          <X size={16} />
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 192 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--red-600)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        </div>
      ) : stops.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "5rem", gap: ".75rem" }}>
          <CheckCircle2 size={48} style={{ color: "var(--green-600)" }} />
          <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{isAr ? "لا توجد توقفات" : "No machine stops"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {stops.map(stop => {
            const p       = PRIORITY_COLOR[stop.priority];
            const resolved = !!stop.resolved_at;
            const worker  = stop.worker_name ?? stop.worker_username ?? `#${stop.worker_id ?? "?"}`;

            return (
              <div
                key={stop.id}
                style={{
                  borderRadius: 12,
                  borderLeft: `4px solid ${p.border}`,
                  border: `1px solid var(--border-default)`,
                  borderLeftWidth: 4,
                  borderLeftColor: p.border,
                  background: "var(--bg-card)",
                  padding: "1rem",
                  opacity: resolved ? 0.65 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                        {stop.machine_label}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: p.bg, color: p.text }}>
                        <AlertTriangle size={10} />
                        {stop.priority}
                      </span>
                      {resolved ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "var(--green-100)", color: "var(--green-600)" }}>
                          <CheckCircle2 size={10} />
                          {isAr ? "محلول" : "Resolved"}
                          {stop.response_minutes != null ? ` · ${Math.round(stop.response_minutes)}m` : ""}
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: p.bg, color: p.text }}>
                          <Clock size={10} />
                          {elapsed(stop.started_at)} {isAr ? "منذ" : "ago"}
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    <p style={{ fontSize: ".875rem", color: "var(--text-secondary)", marginBottom: ".5rem", lineHeight: 1.6 }}>
                      {stop.reason}
                    </p>

                    {/* Footer meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", fontSize: ".75rem", color: "var(--text-tertiary)", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        {isAr ? "بواسطة:" : "By:"} {worker}
                      </span>
                      <span>·</span>
                      <span>{fmt(stop.created_at)}</span>
                      {stop.resolved_at && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--green-600)" }}>
                            {isAr ? "حُل في:" : "Resolved:"} {fmt(stop.resolved_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resolve button */}
                  {!resolved && (
                    <button
                      onClick={() => void handleResolve(stop.id)}
                      disabled={resolving === stop.id}
                      style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                        padding: ".375rem .75rem", fontSize: ".75rem", fontWeight: 700,
                        borderRadius: 8, border: "1px solid var(--green-600)",
                        background: "var(--green-50)", color: "var(--green-600)",
                        cursor: resolving === stop.id ? "not-allowed" : "pointer",
                        opacity: resolving === stop.id ? 0.5 : 1,
                      }}
                    >
                      {resolving === stop.id ? (
                        <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid var(--green-600)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {isAr ? "تم الحل" : "Resolve"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
