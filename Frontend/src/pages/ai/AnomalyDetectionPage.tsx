import { useState } from "react";
import { AlertTriangle, Activity, TrendingDown, Clock, Factory } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { AIPageHeader, StatCard, ReportCard, AIButton, AIEmptyState, SeverityBadge, AIKeyframes } from "./_shared";

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

function getSeverity(a: Anomaly): "HIGH" | "MEDIUM" | "LOW" {
  const pctBelow = a.avgPieces > 0 ? (a.avgPieces - (a.totalPieces ?? 0)) / a.avgPieces : 0;
  if (a.totalPieces === 0 || pctBelow > 0.5 || a.downtimeMinutes > 120) return "HIGH";
  if (pctBelow > 0.25 || a.downtimeMinutes > 60) return "MEDIUM";
  return "LOW";
}

function statusColor(s: string) {
  if (s === "OPERATIONAL") return "#16a34a";
  if (s === "MAINTENANCE") return "#d97706";
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
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/detect-anomalies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((e as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const highCount   = result?.anomalies.filter((a) => getSeverity(a) === "HIGH").length   ?? 0;
  const mediumCount = result?.anomalies.filter((a) => getSeverity(a) === "MEDIUM").length ?? 0;

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <AIKeyframes />

      <AIPageHeader
        icon={AlertTriangle}
        gradient={["#dc2626", "#f97316"]}
        title={isAr ? "كشف شذوذ الإنتاج" : "Production Anomaly Detection"}
        subtitle={isAr ? "يحلل النظام بيانات الإنتاج ويكشف الحالات غير الطبيعية باستخدام GPT-4o" : "AI-powered analysis of production records to flag abnormal patterns using GPT-4o"}
        badge="GPT-4o"
      />

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", padding: "1.1rem 1.25rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isAr ? "الفترة الزمنية" : "Analysis window"}
          </label>
          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d} type="button"
                onClick={() => setDays(d)}
                style={{ padding: ".45rem .9rem", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: ".83rem", fontWeight: 600, transition: "all .15s", borderColor: days === d ? "#dc2626" : "var(--border-default)", background: days === d ? "#dc262614" : "transparent", color: days === d ? "#dc2626" : "var(--text-secondary)" }}
              >
                {d}{isAr ? "ي" : "d"}
              </button>
            ))}
          </div>
        </div>
        <AIButton gradient={["#dc2626", "#f97316"]} onClick={() => void run()} loading={loading} loadingText={isAr ? "جارٍ التحليل…" : "Analyzing…"} icon={Activity}>
          {isAr ? "تشغيل الكشف" : "Run Detection"}
        </AIButton>
      </div>

      {error && (
        <div style={{ padding: ".85rem 1rem", background: "#fee2e2", borderRadius: 10, color: "#dc2626", fontSize: ".85rem", marginBottom: "1.25rem", border: "1px solid #fecaca", animation: "ai-fadein .25s" }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "ai-fadein .3s" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <StatCard label={isAr ? "إجمالي السجلات" : "Total Records"} value={result.recordCount} color="#6366f1" icon={Factory} />
            <StatCard label={isAr ? "شذوذات مرتفعة" : "High Severity"} value={highCount} color="#dc2626" icon={AlertTriangle} subtext={isAr ? "تحتاج إجراءً فورياً" : "Needs immediate action"} />
            <StatCard label={isAr ? "شذوذات متوسطة" : "Medium Severity"} value={mediumCount} color="#d97706" icon={TrendingDown} />
            <StatCard label={isAr ? "الفترة (أيام)" : "Period (days)"} value={result.period?.days ?? days} color="#0ea5e9" icon={Clock} />
          </div>

          {/* AI report */}
          <ReportCard
            title={isAr ? "تقرير الذكاء الاصطناعي" : "AI Analysis Report"}
            subtitle={isAr ? `آخر ${result.period?.days ?? days} أيام — ${result.recordCount} سجل` : `Last ${result.period?.days ?? days} days — ${result.recordCount} records`}
            report={result.summary}
            onRegenerate={() => void run()}
            loading={loading}
            accentColor="#dc2626"
          />

          {/* Anomaly table */}
          {result.anomalies.length > 0 ? (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
              <div style={{ padding: ".9rem 1.15rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)" }}>{isAr ? "تفاصيل الشذوذات" : "Anomaly Details"}</p>
                  <p style={{ margin: ".1rem 0 0", fontSize: ".72rem", color: "var(--text-muted)" }}>{result.anomalies.length} {isAr ? "حالة مكتشفة" : "cases detected"}</p>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-subtle)" }}>
                      {["", isAr ? "التاريخ" : "Date", isAr ? "الماكينة" : "Machine", isAr ? "الشفت" : "Shift", isAr ? "العامل" : "Worker", isAr ? "القطع / المتوسط" : "Pieces / Avg", isAr ? "التوقف" : "Downtime", isAr ? "السبب" : "Reason"].map((h, i) => (
                        <th key={i} style={{ padding: ".6rem .9rem", textAlign: "start", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".03em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.anomalies.map((a) => {
                      const sev = getSeverity(a);
                      return (
                        <tr key={a.id} style={{ borderTop: "1px solid var(--border-default)", transition: "background .12s" }}>
                          <td style={{ padding: ".6rem .9rem" }}><SeverityBadge level={sev} /></td>
                          <td style={{ padding: ".6rem .9rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(a.date).toLocaleDateString()}</td>
                          <td style={{ padding: ".6rem .9rem" }}>
                            <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>{a.machineName}</p>
                            <p style={{ margin: 0, fontSize: ".71rem", color: statusColor(a.machineStatus) }}>{a.machineStatus}</p>
                          </td>
                          <td style={{ padding: ".6rem .9rem", color: "var(--text-secondary)" }}>{a.shiftName}</td>
                          <td style={{ padding: ".6rem .9rem", color: "var(--text-secondary)" }}>{a.workerName}</td>
                          <td style={{ padding: ".6rem .9rem" }}>
                            <span style={{ fontWeight: 700, color: sev === "HIGH" ? "#dc2626" : sev === "MEDIUM" ? "#d97706" : "var(--text-primary)" }}>
                              {(a.totalPieces ?? 0).toLocaleString()}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: ".78rem" }}> / {a.avgPieces.toLocaleString()}</span>
                          </td>
                          <td style={{ padding: ".6rem .9rem", color: a.downtimeMinutes > 60 ? "#dc2626" : "var(--text-secondary)", fontWeight: a.downtimeMinutes > 60 ? 600 : 400 }}>
                            {a.downtimeMinutes > 0 ? `${a.downtimeMinutes} min` : "—"}
                          </td>
                          <td style={{ padding: ".6rem .9rem", color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.downtimeReason ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <AIEmptyState
              icon={Activity}
              color="#16a34a"
              title={isAr ? "لا توجد شذوذات" : "No anomalies detected"}
              description={isAr ? "الإنتاج يسير بشكل طبيعي خلال الفترة المحددة." : "Production looks normal for the selected period."}
            />
          )}
        </div>
      )}

      {!result && !loading && (
        <AIEmptyState
          icon={AlertTriangle}
          color="#dc2626"
          title={isAr ? "اختر الفترة وابدأ التحليل" : "Select a window and run detection"}
          description={isAr ? "يقارن الذكاء الاصطناعي كل سجل بمتوسط الماكينة ويكشف الانحرافات الكبيرة." : "AI compares each record against its machine's average and flags significant deviations."}
        />
      )}
    </div>
  );
}
