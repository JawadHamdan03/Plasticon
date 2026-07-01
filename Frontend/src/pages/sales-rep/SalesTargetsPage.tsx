import { useEffect, useState } from "react";
import { Target, CheckCircle, TrendingUp } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type SalesTarget = {
  id: number;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  notes: string | null;
  rep?: { id: number; fullName: string };
};

type SalesRep = { id: number; fullName: string };

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function SalesTargetsPage() {
  const { locale } = useLocale();
  const { user }   = useAuth();
  const isAr       = locale === "ar";
  const isAdmin    = user?.role === "ADMIN";
  const isSalesRep = user?.role === "SALES_REP";

  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  // Sales reps for admin selector
  const [salesReps, setSalesReps]     = useState<SalesRep[]>([]);
  const [repsError, setRepsError]     = useState(false);
  const [repId, setRepId]             = useState("");

  const now = new Date();
  const [month, setMonth]               = useState(String(now.getMonth() + 1));
  const [year, setYear]                 = useState(String(now.getFullYear()));
  const [targetAmount, setTargetAmount] = useState("");
  const [notes, setNotes]               = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/sales-rep/targets`, { headers: authHeader(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTargets(d as SalesTarget[]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Fetch sales reps for set-target form
  useEffect(() => {
    if (!isSalesRep) return;
    fetch(`${API_BASE_URL}/users/all?role=SALES_REP`, { headers: authHeader(), credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        setSalesReps(d as SalesRep[]);
        setRepsError(false);
      })
      .catch(() => setRepsError(true));
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAmount) { setMsg("أدخل المبلغ المستهدف"); return; }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/targets`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          month: Number(month),
          year: Number(year),
          targetAmount: Number(targetAmount),
          notes,
          ...(repId ? { repId: Number(repId) } : {}),
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg("تم الحفظ");
      setTargetAmount(""); setNotes(""); setRepId("");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const updateAchieved = async (id: number, achievedAmount: number) => {
    await fetch(`${API_BASE_URL}/sales-rep/targets/${id}/achieved`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ achievedAmount }),
    });
    load();
  };

  return (
    <main className="admin-shell" dir="rtl">
      <section className="admin-card">

        {/* ── Header ── */}
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "var(--accent)", color: "#fff" }}>
                <Target size={18} />
              </span>
              {"أهداف المبيعات"}
            </h1>
            <p className="admin-muted">{"تتبع الأهداف الشهرية والإنجاز الفعلي"}</p>
          </div>
        </header>

        {/* ── Set Target Form (SALES_REP only) ── */}
        {isSalesRep && (
          <section className="admin-section">
            <h2 className="admin-section__title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <TrendingUp size={15} /> {"تعيين هدف"}
            </h2>
            <form onSubmit={(e) => { void handleSubmit(e); }}>

              {/* Row 1: Rep + Month + Year */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {"المندوب"}
                  {repsError ? (
                    <input
                      type="number"
                      placeholder={"معرف المندوب..."}
                      value={repId}
                      min={1}
                      onChange={(e) => setRepId(e.target.value)}
                      className="admin-input"
                    />
                  ) : (
                    <select value={repId} onChange={(e) => setRepId(e.target.value)} className="admin-input">
                      <option value="">{"اختر مندوباً..."}</option>
                      {salesReps.map((r) => (
                        <option key={r.id} value={r.id}>{r.fullName}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {"الشهر"}
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="admin-input">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{MONTHS_AR[i]}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {"السنة"}
                  <input
                    type="number"
                    value={year}
                    min={2024}
                    max={2030}
                    onChange={(e) => setYear(e.target.value)}
                    className="admin-input"
                  />
                </label>
              </div>

              {/* Row 2: Target Amount + Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {"المبلغ المستهدف (₪)"}
                  <input
                    type="number"
                    value={targetAmount}
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="admin-input"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {"ملاحظات"}
                  <input
                    placeholder={"ملاحظات اختيارية..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="admin-input"
                  />
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button type="submit" className="auth-button" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Target size={14} />
                  {saving ? ("جارٍ الحفظ...") : ("حفظ الهدف")}
                </button>
                {msg && (
                  <p className="admin-muted" style={{ margin: 0, color: msg === ("تم الحفظ") ? "var(--success)" : "var(--danger)" }}>
                    {msg}
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        {/* ── Targets List ── */}
        <section className="admin-section">
          <h2 className="admin-section__title">{"قائمة الأهداف"}</h2>

          {loading ? (
            <p className="admin-muted">{"جارٍ التحميل..."}</p>
          ) : targets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <Target size={36} style={{ color: "var(--text-secondary)", opacity: 0.35, marginBottom: "0.75rem" }} />
              <p className="admin-muted">{"لا توجد أهداف محددة"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {targets.map((t) => {
                const rawPct = t.targetAmount > 0 ? Math.round((t.achievedAmount / t.targetAmount) * 100) : 0;
                const pct    = Math.min(100, rawPct);
                const done   = rawPct >= 100;

                return (
                  <article
                    key={t.id}
                    style={{
                      background: "var(--bg-surface, #fff)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Subtle top accent line */}
                    <div style={{
                      position: "absolute",
                      top: 0,
                      insetInlineStart: 0,
                      insetInlineEnd: 0,
                      height: "3px",
                      background: done ? "var(--success)" : "var(--accent)",
                      borderRadius: "12px 12px 0 0",
                    }} />

                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: "1rem" }}>
                            {MONTHS_AR[t.month - 1]} {t.year}
                          </strong>
                          {t.rep && (
                            <span style={{
                              fontSize: ".75rem",
                              color: "var(--text-secondary)",
                              background: "var(--border-default)",
                              borderRadius: 20,
                              padding: "2px 8px",
                            }}>
                              {t.rep.fullName}
                            </span>
                          )}
                          {done && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: ".72rem",
                              fontWeight: 700,
                              color: "#059669",
                              background: "rgba(16,185,129,.12)",
                              border: "1px solid rgba(16,185,129,.25)",
                              borderRadius: 20,
                              padding: "2px 8px",
                            }}>
                              <CheckCircle size={11} /> {"مكتمل"}
                            </span>
                          )}
                        </div>
                        <p className="admin-muted" style={{ margin: "0.2rem 0 0", fontSize: ".82rem" }}>
                          ₪{t.achievedAmount.toFixed(0)}
                          <span style={{ color: "var(--border-default)", margin: "0 4px" }}>/</span>
                          ₪{t.targetAmount.toFixed(0)}
                        </p>
                        {t.notes && <p className="admin-muted" style={{ margin: "0.15rem 0 0", fontSize: ".78rem" }}>{t.notes}</p>}
                      </div>

                      {/* Large pct number */}
                      <div style={{ textAlign: "center", minWidth: 56 }}>
                        <span style={{
                          display: "block",
                          fontSize: "1.75rem",
                          fontWeight: 800,
                          lineHeight: 1,
                          color: done ? "var(--success)" : "var(--accent)",
                        }}>
                          {rawPct}
                        </span>
                        <span style={{ fontSize: ".7rem", color: "var(--text-secondary)", fontWeight: 600 }}>%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: "var(--border-default)", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: "0.75rem" }}>
                      <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 8,
                        background: done
                          ? "linear-gradient(90deg, var(--success), #34d399)"
                          : "linear-gradient(90deg, var(--accent), var(--accent))",
                        transition: "width 0.4s ease",
                      }} />
                    </div>

                    {/* Update achieved (SALES_REP only) */}
                    {isSalesRep && (
                      <div style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        paddingTop: "0.65rem",
                        borderTop: "1px solid var(--border-default)",
                      }}>
                        <span style={{ fontSize: ".78rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {"تحديث الإنجاز:"}
                        </span>
                        <input
                          type="number"
                          defaultValue={t.achievedAmount}
                          min={0}
                          step="0.01"
                          className="admin-input"
                          style={{ width: 130 }}
                          id={`achieved-${t.id}`}
                        />
                        <button
                          type="button"
                          className="auth-button auth-button--ghost"
                          style={{ whiteSpace: "nowrap", fontSize: ".8rem" }}
                          onClick={() => {
                            const el = document.getElementById(`achieved-${t.id}`) as HTMLInputElement;
                            void updateAchieved(t.id, Number(el.value));
                          }}
                        >
                          {"تحديث"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </section>
    </main>
  );
}
