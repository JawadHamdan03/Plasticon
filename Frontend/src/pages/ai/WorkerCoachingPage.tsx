import { useState, useEffect } from "react";
import { Users, Search, TrendingUp, Clock, UserCheck, Target } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { AIPageHeader, StatCard, ReportCard, AIButton, AIEmptyState, FormField, inputCss, AIKeyframes } from "./_shared";

type Worker = { id: number; fullName: string; role: string; department: string | null };

type CoachingResult = {
  coaching: string;
  worker: { id: number; fullName: string; role: string };
  stats: { totalShifts: number; lateShifts: number; totalLate: number; noCheckout: number; totalPieces: number; avgPiecesPerShift: number; totalDowntime: number; avgDowntimePerShift: number };
  period: { days: number; start: string; end: string };
  generatedAt: string;
};

function roleColor(role: string) {
  const m: Record<string, string> = { WORKER: "#6366f1", ENGINEER: "#0ea5e9", ACCOUNTANT: "#f59e0b", ADMIN: "#7c3aed" };
  return m[role] ?? "#6366f1";
}

function avatarInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

export function WorkerCoachingPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [workers, setWorkers]   = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [days, setDays]         = useState(30);
  const [search, setSearch]     = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<CoachingResult | null>(null);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/all`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { data?: Worker[] })?.data ?? [];
        setWorkers((arr as Worker[]).filter((u) => ["WORKER", "ENGINEER"].includes(u.role)));
      })
      .catch(() => {});
  }, []);

  const filtered = workers.filter((w) =>
    !search.trim() || w.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (w.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const generate = async () => {
    if (!workerId) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/worker-coaching`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ workerId: Number(workerId), days }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((e as { error?: string }).error ?? `Error ${res.status}`);
      }
      setResult(await res.json() as CoachingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل");
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = workers.find((w) => String(w.id) === workerId);

  return (
    <div dir="rtl" style={{ padding: "1.5rem", maxWidth: 1060, margin: "0 auto" }}>
      <AIKeyframes />

      <AIPageHeader
        icon={Users}
        gradient={["#10b981", "#0ea5e9"]}
        title={"تدريب أداء العامل"}
        subtitle={"يحلل الذكاء الاصطناعي حضور وإنتاجية العامل ويولّد تقرير تدريب بنّاء"}
        badge="GPT-4o"
      />

      <div style={{ display: "grid", gridTemplateColumns: result ? "300px 1fr" : "300px 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Left panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Worker list */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <div style={{ padding: ".85rem 1rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
              <p style={{ margin: 0, fontSize: ".82rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {"اختر العامل"}
              </p>
            </div>
            <div style={{ padding: ".75rem" }}>
              {/* Search */}
              <div style={{ position: "relative", marginBottom: ".6rem" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={"بحث بالاسم أو القسم…"}
                  style={{ ...inputCss, paddingLeft: "2rem", fontSize: ".82rem" }}
                />
              </div>

              {/* List */}
              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: ".3rem" }}>
                {filtered.length === 0 ? (
                  <p style={{ margin: ".5rem 0", fontSize: ".82rem", color: "var(--text-muted)", textAlign: "center" }}>
                    {"لا نتائج"}
                  </p>
                ) : filtered.map((w) => {
                  const color = roleColor(w.role);
                  const selected = workerId === String(w.id);
                  return (
                    <button
                      key={w.id} type="button"
                      onClick={() => setWorkerId(String(w.id))}
                      style={{ display: "flex", alignItems: "center", gap: ".65rem", padding: ".55rem .7rem", border: `1px solid ${selected ? color : "transparent"}`, borderRadius: 9, cursor: "pointer", background: selected ? `${color}0f` : "transparent", transition: "all .12s", textAlign: "start" }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 700, color, flexShrink: 0, border: selected ? `2px solid ${color}` : "2px solid transparent", transition: "border .12s" }}>
                        {avatarInitials(w.fullName)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: ".83rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.fullName}</p>
                        <p style={{ margin: 0, fontSize: ".7rem", color }}>
                          {w.role}{w.department ? ` · ${w.department}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Period + generate */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 14, padding: "1.1rem", display: "flex", flexDirection: "column", gap: ".85rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <FormField label={"فترة التحليل"}>
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                {[7, 14, 30, 60, 90].map((d) => (
                  <button key={d} type="button" onClick={() => setDays(d)} style={{ padding: ".4rem .75rem", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: ".8rem", fontWeight: 600, transition: "all .12s", borderColor: days === d ? "#10b981" : "var(--border-default)", background: days === d ? "#10b98114" : "transparent", color: days === d ? "#10b981" : "var(--text-secondary)" }}>
                    {d}{"ي"}
                  </button>
                ))}
              </div>
            </FormField>

            {selectedWorker && (
              <div style={{ display: "flex", alignItems: "center", gap: ".55rem", padding: ".6rem .75rem", background: `${roleColor(selectedWorker.role)}10`, borderRadius: 9, border: `1px solid ${roleColor(selectedWorker.role)}28` }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${roleColor(selectedWorker.role)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 700, color: roleColor(selectedWorker.role), flexShrink: 0 }}>
                  {avatarInitials(selectedWorker.fullName)}
                </div>
                <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, color: roleColor(selectedWorker.role) }}>{selectedWorker.fullName}</p>
              </div>
            )}

            {error && (
              <div style={{ padding: ".7rem .85rem", background: "#fee2e2", borderRadius: 9, color: "#dc2626", fontSize: ".82rem", border: "1px solid #fecaca" }}>⚠ {error}</div>
            )}

            <AIButton gradient={["#10b981", "#0ea5e9"]} onClick={() => void generate()} disabled={!workerId} loading={loading} loadingText={"جارٍ التحليل…"} icon={TrendingUp}>
              {"توليد تقرير التدريب"}
            </AIButton>
          </div>
        </div>

        {/* ── Right panel ── */}
        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", animation: "ai-fadein .3s" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: ".65rem" }}>
              <StatCard label={"الشفتات"} value={result.stats.totalShifts} color="#6366f1" icon={UserCheck} />
              <StatCard label={"التأخر"} value={result.stats.lateShifts} color={result.stats.lateShifts > 3 ? "#dc2626" : "#d97706"} icon={Clock} subtext={result.stats.totalLate > 0 ? `${result.stats.totalLate} min total` : undefined} />
              <StatCard label={"إجمالي القطع"} value={result.stats.totalPieces.toLocaleString()} color="#10b981" icon={TrendingUp} />
              <StatCard label={"متوسط / شفت"} value={result.stats.avgPiecesPerShift} color="#0ea5e9" icon={Target} subtext={"قطعة / شفت"} />
            </div>

            {/* Coaching report */}
            <ReportCard
              title={"تقرير التدريب"}
              subtitle={`${result.worker.fullName} — ${"آخر"} ${result.period.days} ${"يوم"}`}
              report={result.coaching}
              onRegenerate={() => void generate()}
              loading={loading}
              accentColor="#10b981"
            />
          </div>
        ) : (
          <AIEmptyState
            icon={Users}
            color="#10b981"
            title={"اختر عاملاً لتوليد تقرير التدريب"}
            description={"يحلل النظام الحضور والإنتاجية ويولّد تقريراً يساعد العامل على التطور."}
          />
        )}
      </div>
    </div>
  );
}
