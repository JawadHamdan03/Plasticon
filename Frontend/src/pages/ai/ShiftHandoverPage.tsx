import { useState, useEffect } from "react";
import { ClipboardList, RefreshCw, Copy, Check } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type Shift = { id: number; name: string };

type HandoverResult = {
  handover: string;
  stats: {
    totalPieces: number;
    totalDowntime: number;
    totalKwh: number;
    staffCount: number;
    machinesWithIssues: number;
  };
  date: string;
  shift: string;
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

export function ShiftHandoverPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [shiftId, setShiftId] = useState("");
  const [shifts, setShifts]   = useState<Shift[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<HandoverResult | null>(null);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/shifts`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => setShifts(Array.isArray(data) ? data as Shift[] : (data as { data?: Shift[] })?.data ?? []))
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body: Record<string, unknown> = { date };
      if (shiftId) body.shiftId = Number(shiftId);

      const res = await fetch(`${API_BASE_URL}/ai/shift-handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as HandoverResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.handover);
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

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ClipboardList size={21} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isAr ? "ملخص تسليم الشفت" : "Shift Handover Summary"}
          </h1>
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-muted)" }}>
            {isAr ? "يولّد الذكاء الاصطناعي ملخص تسليم شفت شاملاً بناءً على بيانات اليوم" : "AI generates a complete shift handover note from live production data"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isAr ? "التاريخ" : "Date"}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isAr ? "الشفت (اختياري)" : "Shift (optional)"}
          </label>
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", minWidth: 180 }}
          >
            <option value="">{isAr ? "كل الشفتات" : "All shifts"}</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          style={{ padding: ".62rem 1.4rem", border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer", background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", fontWeight: 600, fontSize: ".88rem", display: "flex", alignItems: "center", gap: ".4rem" }}
        >
          {loading
            ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ التوليد…" : "Generating…"}</>
            : <><ClipboardList size={15} /> {isAr ? "توليد التسليم" : "Generate Handover"}</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: ".85rem 1rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".85rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            {[
              { label: isAr ? "القطع المنتجة" : "Pieces Produced", value: result.stats.totalPieces.toLocaleString(), color: "#6366f1" },
              { label: isAr ? "وقت التوقف" : "Downtime (min)", value: result.stats.totalDowntime, color: "#f59e0b" },
              { label: isAr ? "استهلاك الكهرباء" : "Electricity (kWh)", value: result.stats.totalKwh.toFixed(1), color: "#0ea5e9" },
              { label: isAr ? "الموظفون الحاضرون" : "Staff Present", value: result.stats.staffCount, color: "#10b981" },
              { label: isAr ? "ماكينات بمشاكل" : "Machines w/ Issues", value: result.stats.machinesWithIssues, color: result.stats.machinesWithIssues > 0 ? "#dc2626" : "#16a34a" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 130, padding: ".85rem 1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 10, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color }}>{value}</p>
                <p style={{ margin: ".2rem 0 0", fontSize: ".72rem", color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Handover note */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {isAr ? "ملاحظة تسليم الشفت" : "Shift Handover Note"}
                </p>
                <p style={{ margin: ".15rem 0 0", fontSize: ".73rem", color: "var(--text-muted)" }}>
                  {result.date} — {result.shift}
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
            <div style={{ padding: "1.25rem" }}>
              <RenderText text={result.handover} />
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
