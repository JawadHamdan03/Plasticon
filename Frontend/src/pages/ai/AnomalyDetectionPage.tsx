import { useState } from "react";
import { AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type Anomaly = {
  id: number;
  date: string;
  machineName: string;
  machineStatus: string;
  shiftName: string;
  workerName: string;
  totalPieces: number;
  avgPieces: number;
  downtimeMinutes: number;
  downtimeReason: string | null;
};

type Result = {
  anomalies: Anomaly[];
  summary: string;
  recordCount: number;
  period?: { days: number; start: string; end: string };
};

function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.65, fontSize: ".88rem" }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (/^#{1,3}\s/.test(line)) {
          return (
            <p key={i} style={{ fontWeight: 700, margin: ".6rem 0 .2rem", color: "var(--text-primary)", fontSize: ".95rem" }}>
              {line.replace(/^#+\s/, "")}
            </p>
          );
        }
        if (/^[-•*]\s/.test(line)) {
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".15rem 0" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>•</span>
              <span>{renderInline(line.replace(/^[-•*]\s/, ""))}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^\d+/)![0];
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".15rem 0" }}>
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

function statusColor(status: string) {
  if (status === "OPERATIONAL") return "#16a34a";
  if (status === "MAINTENANCE") return "#d97706";
  return "#dc2626";
}

export function AnomalyDetectionPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/detect-anomalies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#dc2626,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AlertTriangle size={21} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isAr ? "كشف شذوذ الإنتاج" : "Production Anomaly Detection"}
          </h1>
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-muted)" }}>
            {isAr ? "يحلل النظام بيانات الإنتاج ويكشف الحالات غير الطبيعية" : "AI-powered analysis of production records to flag abnormal patterns"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isAr ? "عدد الأيام" : "Days to analyze"}
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: ".55rem .8rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem", cursor: "pointer" }}
          >
            {[3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>{d} {isAr ? "أيام" : "days"}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          style={{ padding: ".6rem 1.4rem", border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer", background: "linear-gradient(135deg,#dc2626,#f97316)", color: "#fff", fontWeight: 600, fontSize: ".88rem", display: "flex", alignItems: "center", gap: ".4rem" }}
        >
          {loading
            ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ التحليل…" : "Analyzing…"}</>
            : <><Activity size={15} /> {isAr ? "تشغيل الكشف" : "Run Detection"}</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: ".85rem 1rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".85rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Stats row */}
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            {[
              { label: isAr ? "إجمالي السجلات" : "Total Records", value: result.recordCount, color: "#6366f1" },
              { label: isAr ? "الشذوذات المكتشفة" : "Anomalies Found", value: result.anomalies.length, color: "#dc2626" },
              { label: isAr ? "الفترة (أيام)" : "Period (days)", value: result.period?.days ?? days, color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 140, padding: ".9rem 1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color }}>{value}</p>
                <p style={{ margin: ".2rem 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "1.25rem" }}>
            <p style={{ margin: "0 0 .75rem", fontSize: ".8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              {isAr ? "تقرير الذكاء الاصطناعي" : "AI Analysis Report"}
            </p>
            <RenderText text={result.summary} />
          </div>

          {/* Anomaly table */}
          {result.anomalies.length > 0 && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: ".9rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
                <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {isAr ? "تفاصيل الشذوذات" : "Anomaly Details"}
                </p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-subtle)" }}>
                      {[
                        isAr ? "التاريخ" : "Date",
                        isAr ? "الماكينة" : "Machine",
                        isAr ? "الشفت" : "Shift",
                        isAr ? "العامل" : "Worker",
                        isAr ? "القطع" : "Pieces",
                        isAr ? "المتوسط" : "Avg",
                        isAr ? "التوقف" : "Downtime",
                        isAr ? "السبب" : "Reason",
                      ].map((h) => (
                        <th key={h} style={{ padding: ".6rem .85rem", textAlign: "start", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.anomalies.map((a) => (
                      <tr key={a.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                        <td style={{ padding: ".55rem .85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(a.date).toLocaleDateString()}</td>
                        <td style={{ padding: ".55rem .85rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.machineName}</div>
                          <div style={{ fontSize: ".73rem", color: statusColor(a.machineStatus) }}>{a.machineStatus}</div>
                        </td>
                        <td style={{ padding: ".55rem .85rem", color: "var(--text-secondary)" }}>{a.shiftName}</td>
                        <td style={{ padding: ".55rem .85rem", color: "var(--text-secondary)" }}>{a.workerName}</td>
                        <td style={{ padding: ".55rem .85rem", fontWeight: 600, color: (a.totalPieces ?? 0) < a.avgPieces * 0.75 ? "#dc2626" : "var(--text-primary)" }}>
                          {a.totalPieces?.toLocaleString() ?? 0}
                        </td>
                        <td style={{ padding: ".55rem .85rem", color: "var(--text-muted)" }}>{a.avgPieces.toLocaleString()}</td>
                        <td style={{ padding: ".55rem .85rem", color: a.downtimeMinutes > 60 ? "#dc2626" : "var(--text-secondary)" }}>
                          {a.downtimeMinutes} min
                        </td>
                        <td style={{ padding: ".55rem .85rem", color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.downtimeReason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.anomalies.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
              <Activity size={36} color="#16a34a" style={{ marginBottom: ".5rem" }} />
              <p style={{ margin: 0, fontWeight: 600, color: "#16a34a" }}>
                {isAr ? "لا توجد شذوذات — الإنتاج يسير بشكل طبيعي" : "No anomalies detected — production looks normal"}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
