import { useState } from "react";
import { Wrench, Settings, Clock, Package, AlertCircle, FileText } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { AIPageHeader, FormField, AIButton, ReportCard, AIEmptyState, inputCss, AIKeyframes } from "./_shared";

type Machine = { id: number; name: string; type?: string };

export function MaintenanceReportPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [machineId, setMachineId]     = useState("");
  const [whatWasDone, setWhatWasDone] = useState("");
  const [partsUsed, setPartsUsed]     = useState("");
  const [duration, setDuration]       = useState("");
  const [issueFound, setIssueFound]   = useState("");
  const [extraNotes, setExtraNotes]   = useState("");
  const [machines, setMachines]       = useState<Machine[]>([]);
  const [machinesLoaded, setMachinesLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [report, setReport]   = useState<string | null>(null);
  const [error, setError]     = useState("");

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
    setLoading(true); setError(""); setReport(null);
    try {
      const body: Record<string, unknown> = { whatWasDone };
      if (machineId)         body.machineId       = Number(machineId);
      if (partsUsed.trim())  body.partsUsed       = partsUsed;
      if (duration)          body.durationMinutes = Number(duration);
      if (issueFound.trim()) body.issueFound      = issueFound;
      if (extraNotes.trim()) body.additionalNotes = extraNotes;

      const res = await fetch(`${API_BASE_URL}/ai/maintenance-report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((e as { error?: string }).error ?? `Error ${res.status}`);
      }
      setReport(((await res.json()) as { report: string }).report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل");
    } finally {
      setLoading(false);
    }
  };

  const selectedMachine = machines.find((m) => String(m.id) === machineId);

  return (
    <div dir="rtl" style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <AIKeyframes />

      <AIPageHeader
        icon={Wrench}
        gradient={["#0ea5e9", "#6366f1"]}
        title={"مولد تقرير الصيانة"}
        subtitle={"أدخل تفاصيل العمل وسيولّد الذكاء الاصطناعي تقريراً رسمياً احترافياً"}
        badge="GPT-4o"
      />

      <div style={{ display: "grid", gridTemplateColumns: report ? "1fr 1fr" : "minmax(0,600px)", gap: "1.5rem", alignItems: "start" }}>
        {/* ── Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, padding: "1.35rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
          <p style={{ margin: "0 0 .25rem", fontSize: ".82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            {"تفاصيل الصيانة"}
          </p>

          {/* Machine */}
          <FormField label={"الماكينة"}>
            <div style={{ position: "relative" }}>
              <Settings size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                onFocus={() => void loadMachines()}
                style={{ ...inputCss, paddingLeft: "2rem", cursor: "pointer", appearance: "none" }}
              >
                <option value="">{"اختر ماكينة (اختياري)…"}</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.type ? ` — ${m.type}` : ""}</option>
                ))}
              </select>
            </div>
            {selectedMachine && (
              <span style={{ fontSize: ".72rem", color: "#0ea5e9", fontWeight: 600 }}>✓ {selectedMachine.name}</span>
            )}
          </FormField>

          {/* What was done */}
          <FormField label={"ما الذي تم إجراؤه؟"} required hint={`${whatWasDone.length}/500`}>
            <textarea
              value={whatWasDone}
              onChange={(e) => setWhatWasDone(e.target.value.slice(0, 500))}
              rows={5}
              placeholder={"صف خطوات العمل الذي تم إجراؤه بالتفصيل…"}
              style={{ ...inputCss, resize: "vertical", lineHeight: 1.6, minHeight: 110 }}
            />
          </FormField>

          {/* Parts + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <FormField label={"القطع المستخدمة"}>
              <div style={{ position: "relative" }}>
                <Package size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text" value={partsUsed}
                  onChange={(e) => setPartsUsed(e.target.value)}
                  placeholder={"مضخة زيت، سير…"}
                  style={{ ...inputCss, paddingLeft: "2rem" }}
                />
              </div>
            </FormField>
            <FormField label={"المدة (دقائق)"}>
              <div style={{ position: "relative" }}>
                <Clock size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="number" min={0} value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  style={{ ...inputCss, paddingLeft: "2rem" }}
                />
              </div>
            </FormField>
          </div>

          {/* Issue found */}
          <FormField label={"المشكلة المكتشفة"}>
            <div style={{ position: "relative" }}>
              <AlertCircle size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text" value={issueFound}
                onChange={(e) => setIssueFound(e.target.value)}
                placeholder={"أي مشكلة اكتُشفت أثناء العمل…"}
                style={{ ...inputCss, paddingLeft: "2rem" }}
              />
            </div>
          </FormField>

          {/* Notes */}
          <FormField label={"ملاحظات إضافية"}>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              placeholder={"أي ملاحظات إضافية أو توصيات…"}
              style={{ ...inputCss, resize: "vertical" }}
            />
          </FormField>

          {error && (
            <div style={{ padding: ".75rem .9rem", background: "#fee2e2", borderRadius: 9, color: "#dc2626", fontSize: ".83rem", border: "1px solid #fecaca" }}>
              ⚠ {error}
            </div>
          )}

          <AIButton
            gradient={["#0ea5e9", "#6366f1"]}
            onClick={() => void generate()}
            disabled={!whatWasDone.trim()}
            loading={loading}
            loadingText={"جارٍ التوليد…"}
            icon={FileText}
          >
            {"توليد التقرير الرسمي"}
          </AIButton>
        </div>

        {/* ── Report output ── */}
        {report ? (
          <div style={{ animation: "ai-fadein .3s" }}>
            <ReportCard
              title={"تقرير الصيانة"}
              subtitle={selectedMachine ? selectedMachine.name : "بدون ماكينة محددة"}
              report={report}
              onRegenerate={() => void generate()}
              loading={loading}
              accentColor="#0ea5e9"
            />
          </div>
        ) : (
          !report && (
            <AIEmptyState
              icon={FileText}
              color="#0ea5e9"
              title={"أدخل تفاصيل الصيانة"}
              description={"بعد إدخال ما تم إجراؤه، سيولّد الذكاء الاصطناعي تقريراً رسمياً مهيكلاً."}
            />
          )
        )}
      </div>
    </div>
  );
}
