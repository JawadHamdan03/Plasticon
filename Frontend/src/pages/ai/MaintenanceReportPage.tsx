import { useState } from "react";
import { Wrench, RefreshCw, Copy, Check } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type Machine = { id: number; name: string };

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

export function MaintenanceReportPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [machineId, setMachineId]       = useState("");
  const [whatWasDone, setWhatWasDone]   = useState("");
  const [partsUsed, setPartsUsed]       = useState("");
  const [duration, setDuration]         = useState("");
  const [issueFound, setIssueFound]     = useState("");
  const [extraNotes, setExtraNotes]     = useState("");
  const [machines, setMachines]         = useState<Machine[]>([]);
  const [machinesLoaded, setMachinesLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [report, setReport]   = useState<string | null>(null);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  const loadMachines = async () => {
    if (machinesLoaded) return;
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, { credentials: "include" });
      if (res.ok) setMachines(await res.json() as Machine[]);
    } catch { /* ignore */ }
    setMachinesLoaded(true);
  };

  const generate = async () => {
    if (!whatWasDone.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const body: Record<string, unknown> = { whatWasDone };
      if (machineId) body.machineId = Number(machineId);
      if (partsUsed.trim()) body.partsUsed = partsUsed;
      if (duration) body.durationMinutes = Number(duration);
      if (issueFound.trim()) body.issueFound = issueFound;
      if (extraNotes.trim()) body.additionalNotes = extraNotes;

      const res = await fetch(`${API_BASE_URL}/ai/maintenance-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { report: string };
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
      <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    padding: ".6rem .85rem",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: ".88rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.5rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Wrench size={21} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isAr ? "مولد تقرير الصيانة" : "Maintenance Report Generator"}
          </h1>
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-muted)" }}>
            {isAr ? "أدخل تفاصيل العمل وسيولّد الذكاء الاصطناعي تقريراً رسمياً" : "Enter what was done and AI generates a formal maintenance report"}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: report ? "1fr 1fr" : "1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "1.25rem" }}>
          <Field label={isAr ? "الماكينة (اختياري)" : "Machine (optional)"}>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              onFocus={() => void loadMachines()}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">{isAr ? "اختر ماكينة…" : "Select machine…"}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>

          <Field label={isAr ? "ما الذي تم إجراؤه؟ *" : "What was done? *"}>
            <textarea
              value={whatWasDone}
              onChange={(e) => setWhatWasDone(e.target.value)}
              rows={4}
              placeholder={isAr ? "صف العمل الذي تم إجراؤه بالتفصيل…" : "Describe the work performed in detail…"}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <Field label={isAr ? "القطع المستخدمة" : "Parts used"}>
              <input
                type="text"
                value={partsUsed}
                onChange={(e) => setPartsUsed(e.target.value)}
                placeholder={isAr ? "مثال: مضخة زيت، سير…" : "e.g., oil pump, belt…"}
                style={inputStyle}
              />
            </Field>
            <Field label={isAr ? "المدة (دقائق)" : "Duration (min)"}>
              <input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label={isAr ? "المشكلة المكتشفة" : "Issue found"}>
            <input
              type="text"
              value={issueFound}
              onChange={(e) => setIssueFound(e.target.value)}
              placeholder={isAr ? "أي مشكلة اكتُشفت أثناء العمل…" : "Any issue discovered during work…"}
              style={inputStyle}
            />
          </Field>

          <Field label={isAr ? "ملاحظات إضافية" : "Additional notes"}>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              placeholder={isAr ? "أي ملاحظات إضافية…" : "Any additional notes…"}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          {error && (
            <div style={{ padding: ".75rem 1rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".83rem" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading || !whatWasDone.trim()}
            style={{
              padding: ".65rem", border: "none", borderRadius: 8,
              cursor: (loading || !whatWasDone.trim()) ? "default" : "pointer",
              background: (loading || !whatWasDone.trim()) ? "var(--bg-subtle)" : "linear-gradient(135deg,#0ea5e9,#6366f1)",
              color: (loading || !whatWasDone.trim()) ? "var(--text-muted)" : "#fff",
              fontWeight: 600, fontSize: ".9rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem",
            }}
          >
            {loading
              ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ التوليد…" : "Generating…"}</>
              : <><Wrench size={15} /> {isAr ? "توليد التقرير" : "Generate Report"}</>}
          </button>
        </div>

        {/* Report output */}
        {report && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".85rem 1rem", borderBottom: "1px solid var(--border-default)" }}>
              <p style={{ margin: 0, fontSize: ".85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {isAr ? "التقرير المولَّد" : "Generated Report"}
              </p>
              <button
                type="button"
                onClick={() => void copy()}
                style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".35rem .75rem", border: "1px solid var(--border-default)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".78rem", color: copied ? "#16a34a" : "var(--text-secondary)" }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? (isAr ? "تم النسخ" : "Copied!") : (isAr ? "نسخ" : "Copy")}
              </button>
            </div>
            <div style={{ padding: "1.25rem", overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
              <RenderText text={report} />
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
