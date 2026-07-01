import { useEffect, useState } from "react";
import { MapPin, Plus, Clock, CheckCircle } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Customer = { id: number; name: string };
type Visit = {
  id: number;
  visitDate: string;
  outcome:     string | null;
  notes:       string | null;
  nextVisitAt: string | null;
  customer:    { id: number; name: string };
  loggedBy?:   { id: number; fullName: string };
};

function outcomeBadge(outcome: string | null) {
  if (!outcome) return null;
  const lower = outcome.toLowerCase();
  const agreed = lower.includes("agreed") || lower.includes("accept") || lower.includes("اتفاق") || lower.includes("قبول");
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: ".75rem",
      fontWeight: 700,
      background: agreed ? "rgba(16,185,129,.12)" : "rgba(59,130,246,.12)",
      color: agreed ? "#059669" : "#2563eb",
      border: `1px solid ${agreed ? "rgba(16,185,129,.25)" : "rgba(59,130,246,.25)"}`,
    }}>
      {agreed && <CheckCircle size={11} />}
      {outcome}
    </span>
  );
}

export function CustomerVisitsPage() {
  const { locale } = useLocale();
  const { user }   = useAuth();
  const isAr       = locale === "ar";
  const isSalesRep = user?.role === "SALES_REP";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits]       = useState<Visit[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");

  const [customerId, setCustomerId] = useState("");
  const [visitDate, setVisitDate]   = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome]       = useState("");
  const [notes, setNotes]           = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");

  const load = async () => {
    setLoading(true);
    const [cRes, vRes] = await Promise.all([
      fetch(`${API_BASE_URL}/sales-rep/customers`, { headers: authHeader(), credentials: "include" }),
      fetch(`${API_BASE_URL}/sales-rep/visits`,    { headers: authHeader(), credentials: "include" }),
    ]);
    if (cRes.ok) { const d = await cRes.json(); setCustomers(Array.isArray(d) ? d : []); }
    if (vRes.ok) { const d = await vRes.json(); setVisits(Array.isArray(d) ? d : []); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setMsg("اختر عميلاً"); return; }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/visits`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: Number(customerId),
          visitDate,
          outcome:     outcome || undefined,
          notes:       notes   || undefined,
          nextVisitAt: nextVisitAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg("تم تسجيل الزيارة");
      setCustomerId(""); setOutcome(""); setNotes(""); setNextVisitAt("");
      setVisitDate(new Date().toISOString().slice(0, 10));
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
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
                <MapPin size={18} />
              </span>
              {"سجل الزيارات"}
            </h1>
            <p className="admin-muted">{"سجّل زياراتك للعملاء وتابع المتابعات"}</p>
          </div>
        </header>

        {/* ── New Visit Form (SALES_REP only) ── */}
        {isSalesRep && <section className="admin-section">
          <h2 className="admin-section__title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Plus size={15} /> {"زيارة جديدة"}
          </h2>

          <form onSubmit={(e) => { void handleSubmit(e); }}>
            {/* Row 1: Customer + Visit Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {"العميل"}
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="admin-input">
                  <option value="">{"اختر عميلاً..."}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {"تاريخ الزيارة"}
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="admin-input" />
              </label>
            </div>

            {/* Row 2: Outcome + Next Visit */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {"النتيجة"}
                <input
                  placeholder={"تم الاتفاق، قيد النظر..."}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="admin-input"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {"الزيارة القادمة"}
                <input type="date" value={nextVisitAt} onChange={(e) => setNextVisitAt(e.target.value)} className="admin-input" />
              </label>
            </div>

            {/* Row 3: Notes full width */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {"ملاحظات"}
                <textarea
                  placeholder={"أضف ملاحظات حول الزيارة..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="admin-input"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button type="submit" className="auth-button" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Plus size={15} />
                {saving ? ("جارٍ الحفظ...") : ("تسجيل الزيارة")}
              </button>
              {msg && (
                <p className="admin-muted" style={{ margin: 0, color: msg.includes("Error") || msg.includes("اختر") ? "var(--danger)" : "var(--success)" }}>
                  {msg}
                </p>
              )}
            </div>
          </form>
        </section>}

        {/* ── Visit History Timeline ── */}
        <section className="admin-section">
          <h2 className="admin-section__title">{"الزيارات السابقة"}</h2>

          {loading ? (
            <p className="admin-muted">{"جارٍ التحميل..."}</p>
          ) : visits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <MapPin size={36} style={{ color: "var(--text-secondary)", opacity: 0.35, marginBottom: "0.75rem" }} />
              <p className="admin-muted">{"لا توجد زيارات مسجّلة بعد"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", paddingInlineStart: "1rem" }}>
              {visits.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    position: "relative",
                    paddingInlineStart: "1.5rem",
                    paddingBottom: idx < visits.length - 1 ? "1.25rem" : 0,
                  }}
                >
                  {/* Vertical timeline line */}
                  {idx < visits.length - 1 && (
                    <div style={{
                      position: "absolute",
                      insetInlineStart: "7px",
                      top: "28px",
                      bottom: 0,
                      width: "2px",
                      background: "var(--border-default)",
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    position: "absolute",
                    insetInlineStart: 0,
                    top: "10px",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 2px var(--accent)",
                  }} />

                  {/* Card */}
                  <div style={{
                    background: "var(--bg-surface, #fff)",
                    border: "1px solid var(--border-default)",
                    borderInlineStart: "3px solid var(--accent)",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                  }}>
                    {/* Top row: name + date */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: ".95rem" }}>{v.customer.name}</strong>
                      <span className="admin-muted" style={{ fontSize: ".78rem", whiteSpace: "nowrap" }}>
                        {new Date(v.visitDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Outcome badge */}
                    {v.outcome && (
                      <div style={{ marginBottom: "0.4rem" }}>
                        {outcomeBadge(v.outcome)}
                      </div>
                    )}

                    {/* Notes */}
                    {v.notes && (
                      <p className="admin-muted" style={{ margin: "0.35rem 0", fontSize: ".83rem", lineHeight: 1.5 }}>
                        {v.notes}
                      </p>
                    )}

                    {/* Footer: next visit + delete */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.55rem" }}>
                      {v.nextVisitAt ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                          <Clock size={12} />
                          {"الزيارة القادمة:"} {new Date(v.nextVisitAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </section>
    </main>
  );
}
