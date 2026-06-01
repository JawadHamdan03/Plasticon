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
  CRITICAL: { bg: "bg-red-100 dark:bg-red-950",    text: "text-red-600 dark:text-red-400",    border: "border-red-500" },
  HIGH:     { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500" },
  NORMAL:   { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500" },
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
    <div className="p-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAr ? "توقفات الآلات" : "Machine Stop Alerts"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAr
              ? "تنبيهات توقف الآلات التي أبلغ عنها العمال — في الوقت الفعلي"
              : "Worker-reported machine stops — real-time"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {isAr ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
          <div className="text-3xl font-black text-red-600 dark:text-red-400">{criticalOpen}</div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">
            {isAr ? "توقفات حرجة مفتوحة" : "Open Critical"}
          </div>
        </div>
        <div className="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 p-4">
          <div className="text-3xl font-black text-orange-600 dark:text-orange-400">{highOpen}</div>
          <div className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">
            {isAr ? "توقفات عالية مفتوحة" : "Open High Priority"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="text-3xl font-black text-gray-800 dark:text-gray-100">{totalOpen}</div>
          <div className="text-sm font-semibold text-gray-500 mt-1">
            {isAr ? "إجمالي المفتوحة" : "Total Open"}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleFilterChange(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === t.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {isAr ? t.labelAr : t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
          <X size={16} />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : stops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <CheckCircle2 size={48} className="text-green-400" />
          <p className="font-medium">{isAr ? "لا توجد توقفات" : "No machine stops"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stops.map(stop => {
            const p       = PRIORITY_COLOR[stop.priority];
            const resolved = !!stop.resolved_at;
            const worker  = stop.worker_name ?? stop.worker_username ?? `#${stop.worker_id ?? "?"}`;

            return (
              <div
                key={stop.id}
                className={`rounded-xl border-l-4 ${p.border} bg-white dark:bg-gray-900 border border-l-4 border-gray-100 dark:border-gray-800 p-4 ${resolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Top row: machine + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {stop.machine_label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
                        <AlertTriangle size={10} />
                        {stop.priority}
                      </span>
                      {resolved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
                          <CheckCircle2 size={10} />
                          {isAr ? "محلول" : "Resolved"}
                          {stop.response_minutes != null
                            ? ` · ${Math.round(stop.response_minutes)}m`
                            : ""}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
                          <Clock size={10} />
                          {elapsed(stop.started_at)} {isAr ? "منذ" : "ago"}
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                      {stop.reason}
                    </p>

                    {/* Footer meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span className="font-medium text-gray-500 dark:text-gray-300">
                        {isAr ? "بواسطة:" : "By:"} {worker}
                      </span>
                      <span>·</span>
                      <span>{fmt(stop.created_at)}</span>
                      {stop.resolved_at && (
                        <>
                          <span>·</span>
                          <span className="text-green-600 dark:text-green-400">
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
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors disabled:opacity-50"
                    >
                      {resolving === stop.id ? (
                        <div className="w-3 h-3 rounded-full border border-green-600 border-t-transparent animate-spin" />
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
