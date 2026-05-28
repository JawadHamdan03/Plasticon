import { useState, useEffect } from "react";
import { Users, RefreshCw, Copy, Check } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type Worker = { id: number; fullName: string; role: string; department: string | null };

type CoachingResult = {
  coaching: string;
  worker: { id: number; fullName: string; role: string };
  stats: {
    totalShifts: number;
    lateShifts: number;
    totalLate: number;
    noCheckout: number;
    totalPieces: number;
    avgPiecesPerShift: number;
    totalDowntime: number;
    avgDowntimePerShift: number;
  };
  period: { days: number; start: string; end: string };
  generatedAt: string;
};

function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.7, fontSize: ".88rem" }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (/^#{1,3}\s/.test(line)) {
          return (
            <p key={i} style={{ fontWeight: 700, margin: ".75rem 0 .2rem", color: "var(--text-primary)", fontSize: ".95rem" }}>
              {line.replace(/^#+\s/, "")}
            </p>
          );
        }
        if (/^[-•*]\s/.test(line)) {
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".2rem 0" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>•</span>
              <span>{renderInline(line.replace(/^[-•*]\s/, ""))}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^\d+/)![0];
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".2rem 0" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0, minWidth: "1.2rem" }}>{num}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        return <p key={i} style={{ margin: ".2rem 0" }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export function WorkerCoachingPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [workers, setWorkers]       = useState<Worker[]>([]);
  const [workerId, setWorkerId]     = useState("");
  const [days, setDays]             = useState(30);
  const [search, setSearch]         = useState("");

  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<CoachingResult | null>(null);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/all`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { data?: Worker[] })?.data ?? [];
        setWorkers((arr as Worker[]).filter((u) => u.role === "WORKER" || u.role === "ENGINEER"));
      })
      .catch(() => {});
  }, []);

  const filtered = workers.filter((w) =>
    !search || w.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const generate = async () => {
    if (!workerId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/worker-coaching`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workerId: Number(workerId), days }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as CoachingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.coaching);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    padding: ".6rem .85rem",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: ".88rem",
    fontFamily: "inherit",
  };

  const selectedWorker = workers.find((w) => String(w.id) === workerId);

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 920, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={21} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isAr ? "تدريب أداء العامل" : "Worker Performance Coaching"}
          </h1>
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-muted)" }}>
            {isAr ? "يحلل الذكاء الاصطناعي أداء العامل ويولّد تقرير تدريب بنّاء" : "AI analyzes worker performance and generates a constructive coaching report"}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "340px 1fr" : "1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Sidebar: worker picker + controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Worker search */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: ".85rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
              <p style={{ margin: 0, fontSize: ".85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {isAr ? "اختر العامل" : "Select Worker"}
              </p>
            </div>
            <div style={{ padding: ".75rem" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "بحث بالاسم…" : "Search by name…"}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: ".5rem" }}
              />
              <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: ".25rem" }}>
                {filtered.length === 0 && (
                  <p style={{ margin: ".5rem 0", fontSize: ".82rem", color: "var(--text-muted)", textAlign: "center" }}>
                    {isAr ? "لا نتائج" : "No results"}
                  </p>
                )}
                {filtered.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWorkerId(String(w.id))}
                    style={{
                      display: "flex", alignItems: "center", gap: ".6rem",
                      padding: ".55rem .7rem", border: "1px solid",
                      borderColor: workerId === String(w.id) ? "#6366f1" : "transparent",
                      borderRadius: 8, cursor: "pointer", textAlign: "start",
                      background: workerId === String(w.id) ? "#6366f111" : "transparent",
                    }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f133", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 700, color: "#6366f1", flexShrink: 0 }}>
                      {w.fullName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: ".83rem", fontWeight: 600, color: "var(--text-primary)" }}>{w.fullName}</p>
                      <p style={{ margin: 0, fontSize: ".72rem", color: "var(--text-muted)" }}>{w.role}{w.department ? ` — ${w.department}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Period + generate */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "1rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: ".3rem" }}>
                {isAr ? "فترة التحليل" : "Analysis period"}
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} {isAr ? "يوم" : "days"}</option>
                ))}
              </select>
            </div>

            {selectedWorker && (
              <div style={{ padding: ".6rem .75rem", background: "#6366f111", borderRadius: 8, fontSize: ".82rem", color: "#6366f1", fontWeight: 600 }}>
                {isAr ? "المحدد: " : "Selected: "}{selectedWorker.fullName}
              </div>
            )}

            {error && (
              <div style={{ padding: ".7rem .85rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".82rem" }}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading || !workerId}
              style={{
                padding: ".65rem", border: "none", borderRadius: 8,
                cursor: (loading || !workerId) ? "default" : "pointer",
                background: (loading || !workerId) ? "var(--bg-subtle)" : "linear-gradient(135deg,#10b981,#0ea5e9)",
                color: (loading || !workerId) ? "var(--text-muted)" : "#fff",
                fontWeight: 600, fontSize: ".9rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem",
              }}
            >
              {loading
                ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ التحليل…" : "Generating…"}</>
                : <><Users size={15} /> {isAr ? "توليد تقرير التدريب" : "Generate Coaching Report"}</>}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".6rem" }}>
              {[
                { label: isAr ? "الشفتات" : "Shifts", value: result.stats.totalShifts, color: "#6366f1" },
                { label: isAr ? "التأخر" : "Late", value: result.stats.lateShifts, color: result.stats.lateShifts > 3 ? "#dc2626" : "#f59e0b" },
                { label: isAr ? "القطع (إجمالي)" : "Total Pieces", value: result.stats.totalPieces.toLocaleString(), color: "#10b981" },
                { label: isAr ? "متوسط/شفت" : "Avg/Shift", value: result.stats.avgPiecesPerShift, color: "#0ea5e9" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: ".75rem .85rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color }}>{value}</p>
                  <p style={{ margin: ".15rem 0 0", fontSize: ".7rem", color: "var(--text-muted)" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Report */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
                <div>
                  <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {isAr ? "تقرير التدريب" : "Coaching Report"} — {result.worker.fullName}
                  </p>
                  <p style={{ margin: ".15rem 0 0", fontSize: ".72rem", color: "var(--text-muted)" }}>
                    {isAr ? "آخر " : "Last "}{result.period.days} {isAr ? "يوم" : "days"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy()}
                  style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".35rem .75rem", border: "1px solid var(--border-default)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".78rem", color: copied ? "#16a34a" : "var(--text-secondary)" }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? (isAr ? "تم النسخ" : "Copied!") : (isAr ? "نسخ" : "Copy")}
                </button>
              </div>
              <div style={{ padding: "1.25rem", overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
                <RenderText text={result.coaching} />
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
