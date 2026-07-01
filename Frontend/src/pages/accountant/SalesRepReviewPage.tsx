import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, FileText, MapPin, Target, Users, MessageSquare } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type QuotationItem = { productType: string; size: string; quantity: number; pricePerUnit: number };
type Quotation = {
  id: number;
  status: string;
  totalAmount: number;
  notes: string | null;
  rejectionNote: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  createdBy: { id: number; fullName: string };
  items: QuotationItem[];
};

type Visit = {
  id: number;
  visitDate: string;
  outcome: string | null;
  notes: string | null;
  nextVisitAt: string | null;
  customer: { id: number; name: string };
  loggedBy: { id: number; fullName: string };
};

type Target = {
  id: number;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  rep: { id: number; fullName: string };
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:    "#6b7280",
  SENT:     "#3b82f6",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  EXPIRED:  "#f59e0b",
};

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function SalesRepReviewPage() {
  const { locale } = useLocale();
  const { user }   = useAuth();
  const isAr = locale === "ar";
  const isAccountant = user?.role === "ACCOUNTANT";

  const [tab, setTab]               = useState<"quotations" | "visits" | "targets">("quotations");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [visits, setVisits]         = useState<Visit[]>([]);
  const [targets, setTargets]       = useState<Target[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionMsg, setActionMsg]   = useState("");
  const [actionTone, setActionTone] = useState<"success" | "error">("success");

  // Rejection note modal state
  const [rejectingId,   setRejectingId]   = useState<number | null>(null);
  const [rejectNote,    setRejectNote]    = useState("");
  const [rejectSaving,  setRejectSaving]  = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [repFilter, setRepFilter]       = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, vRes, tRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sales-rep/quotations`, { headers: authHeader(), credentials: "include" }),
        fetch(`${API_BASE_URL}/sales-rep/visits`,     { headers: authHeader(), credentials: "include" }),
        fetch(`${API_BASE_URL}/sales-rep/targets`,    { headers: authHeader(), credentials: "include" }),
      ]);
      const qData = qRes.ok ? await qRes.json() : [];
      const vData = vRes.ok ? await vRes.json() : [];
      const tData = tRes.ok ? await tRes.json() : [];
      setQuotations(Array.isArray(qData) ? qData : []);
      setVisits(Array.isArray(vData)     ? vData : []);
      setTargets(Array.isArray(tData)    ? tData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const changeStatus = async (id: number, status: string, note?: string) => {
    setActionMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/quotations/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, rejectionNote: note }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setActionTone("success");
      setActionMsg(`تم تغيير الحالة إلى ${status}`);
      void load();
    } catch (err) {
      setActionTone("error");
      setActionMsg(err instanceof Error ? err.message : "Error");
    }
  };

  const handleReject = async () => {
    if (rejectingId === null) return;
    setRejectSaving(true);
    try {
      await changeStatus(rejectingId, "REJECTED", rejectNote.trim() || undefined);
      setRejectingId(null);
      setRejectNote("");
    } finally {
      setRejectSaving(false);
    }
  };

  const allReps = Array.from(
    new Map(quotations.map((q) => [q.createdBy.id, q.createdBy.fullName])).entries()
  ).map(([id, fullName]) => ({ id, fullName }));

  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
    if (repFilter   !== "ALL" && String(q.createdBy.id) !== repFilter) return false;
    return true;
  });

  const pendingCount = quotations.filter((q) => q.status === "SENT").length;

  const tabs = [
    { key: "quotations" as const, labelEn: "Quotations", labelAr: "عروض الأسعار", icon: <FileText size={15} />, badge: pendingCount },
    { key: "visits"     as const, labelEn: "Visits",     labelAr: "الزيارات",     icon: <MapPin size={15} /> },
    { key: "targets"    as const, labelEn: "Targets",    labelAr: "الأهداف",      icon: <Target size={15} /> },
  ];

  return (
    <main className="admin-shell" dir="rtl">
      <section className="admin-card">

        {/* ── Header ── */}
        <header className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{"مراجعة طلبات المندوبين"}</h1>
            <p className="admin-muted">
              {isAccountant
                ? ("راجع وأكّد عروض الأسعار والزيارات وأهداف المندوبين")
                : ("عرض عروض الأسعار والزيارات وأهداف المندوبين")}
            </p>
          </div>

          {pendingCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(245,158,11,.1)", border: "1.5px solid rgba(245,158,11,.35)",
              borderRadius: 12, padding: ".65rem 1.15rem",
              color: "#92400e", fontWeight: 700, fontSize: ".9rem",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: "50%",
                background: "#f59e0b", color: "#fff", fontSize: ".85rem", fontWeight: 800,
              }}>{pendingCount}</span>
              {"عرض بانتظار المراجعة"}
            </div>
          )}
        </header>

        {/* ── Tab Bar ── */}
        <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "2px solid var(--border-default)", paddingInline: "2rem" }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.65rem 1.2rem", border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-2px", cursor: "pointer", background: "transparent",
                fontWeight: active ? 700 : 500, fontSize: ".88rem",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                transition: "color .15s", whiteSpace: "nowrap",
              }}>
                {t.icon}
                {t.labelAr}
                {"badge" in t && (t.badge ?? 0) > 0 && (
                  <span style={{ background: "#f59e0b", color: "#fff", borderRadius: "999px", fontSize: ".68rem", fontWeight: 800, padding: "2px 7px", lineHeight: 1.3 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Action message ── */}
        {actionMsg && (
          <div style={{
            padding: ".7rem 1rem", borderRadius: 8, marginBottom: "1rem", marginInline: "2rem",
            background: actionTone === "success" ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
            border: `1px solid ${actionTone === "success" ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`,
            color: actionTone === "success" ? "#16a34a" : "#dc2626",
            fontWeight: 600, fontSize: ".85rem", display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
            {actionTone === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {actionMsg}
          </div>
        )}

        {loading ? (
          <p className="admin-muted" style={{ padding: "2rem 0", textAlign: "center" }}>
            {"جارٍ التحميل..."}
          </p>
        ) : (
          <>
            {/* ══ Quotations tab ══ */}
            {tab === "quotations" && (
              <section className="admin-section">

                {/* Filter bar */}
                <div style={{
                  display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-subtle, #f9fafb)", border: "1px solid var(--border-default)",
                  borderRadius: "10px", marginBottom: "1.25rem",
                }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: ".82rem", fontWeight: 600 }}>
                    {"الحالة"}
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input" style={{ minWidth: 130 }}>
                      <option value="ALL">{"الكل"}</option>
                      {["DRAFT","SENT","ACCEPTED","REJECTED","EXPIRED"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: ".82rem", fontWeight: 600 }}>
                    {"المندوب"}
                    <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="admin-input" style={{ minWidth: 160 }}>
                      <option value="ALL">{"الكل"}</option>
                      {allReps.map((r) => <option key={r.id} value={String(r.id)}>{r.fullName}</option>)}
                    </select>
                  </label>
                  {(statusFilter !== "ALL" || repFilter !== "ALL") && (
                    <button type="button" className="auth-button auth-button--ghost"
                      style={{ fontSize: ".8rem", padding: ".35rem .85rem", alignSelf: "flex-end" }}
                      onClick={() => { setStatusFilter("ALL"); setRepFilter("ALL"); }}>
                      {"إعادة ضبط"}
                    </button>
                  )}
                </div>

                {filteredQuotations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <FileText size={36} style={{ color: "var(--text-secondary)", opacity: 0.35, marginBottom: "0.75rem" }} />
                    <p className="admin-muted">{"لا توجد عروض"}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                    {filteredQuotations.map((q) => (
                      <article key={q.id} style={{
                        background: "var(--bg-surface, #fff)",
                        border: "1px solid var(--border-default)",
                        borderInlineStart: `4px solid ${STATUS_COLOR[q.status] ?? "#6b7280"}`,
                        borderRadius: "10px", padding: "1rem 1.15rem",
                      }}>
                        {/* Top row */}
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "1rem" }}>{q.customer.name}</strong>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                              <Users size={12} /> {q.createdBy.fullName}
                            </span>
                          </div>
                          <span style={{
                            fontSize: ".75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            background: (STATUS_COLOR[q.status] ?? "#6b7280") + "1a",
                            color: STATUS_COLOR[q.status] ?? "#6b7280",
                            border: `1px solid ${(STATUS_COLOR[q.status] ?? "#6b7280")}44`,
                          }}>{q.status}</span>
                        </div>

                        {/* Amount */}
                        <p style={{ margin: "4px 0 8px", fontWeight: 800, color: "var(--accent)", fontSize: "1.1rem" }}>
                          ₪{q.totalAmount.toFixed(2)}
                        </p>

                        {/* Line items */}
                        {q.items.length > 0 && (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem", margin: "6px 0 10px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
                                <th style={{ textAlign: "start", padding: "4px 0", fontWeight: 600 }}>{"المنتج"}</th>
                                <th style={{ textAlign: "start", padding: "4px 4px", fontWeight: 600 }}>{"الحجم"}</th>
                                <th style={{ textAlign: "end",  padding: "4px 0", fontWeight: 600 }}>{"الكمية"}</th>
                                <th style={{ textAlign: "end",  padding: "4px 0", fontWeight: 600 }}>{"السعر"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid var(--border-default)" }}>
                                  <td style={{ padding: "4px 0" }}>{item.productType}</td>
                                  <td style={{ padding: "4px 4px" }}>{item.size}</td>
                                  <td style={{ padding: "4px 0", textAlign: "end" }}>{item.quantity}</td>
                                  <td style={{ padding: "4px 0", textAlign: "end" }}>₪{item.pricePerUnit.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {q.notes && <p className="admin-muted" style={{ margin: "4px 0", fontSize: ".83rem" }}>{q.notes}</p>}

                        {/* Rejection note display */}
                        {q.rejectionNote && (
                          <div style={{
                            display: "flex", alignItems: "flex-start", gap: "0.4rem",
                            background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)",
                            borderRadius: 8, padding: ".5rem .75rem", margin: "6px 0",
                            color: "#dc2626", fontSize: ".82rem",
                          }}>
                            <MessageSquare size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                            <span><strong>{"سبب الرفض: "}</strong>{q.rejectionNote}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2px" }}>
                          {q.validUntil && (
                            <span className="admin-muted" style={{ fontSize: ".77rem" }}>
                              {"صالح حتى:"} {new Date(q.validUntil).toLocaleDateString()}
                            </span>
                          )}
                          <span className="admin-muted" style={{ fontSize: ".77rem" }}>
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Action buttons — ACCOUNTANT only */}
                        {isAccountant && (
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                            {q.status !== "ACCEPTED" && (
                              <button type="button"
                                onClick={() => { void changeStatus(q.id, "ACCEPTED"); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "0.3rem",
                                  padding: ".38rem .95rem", fontSize: ".8rem", fontWeight: 600,
                                  borderRadius: 7, cursor: "pointer",
                                  background: "#10b981", color: "#fff", border: "1px solid #059669",
                                }}>
                                <CheckCircle size={14} /> {"قبول"}
                              </button>
                            )}
                            {q.status !== "REJECTED" && (
                              <button type="button"
                                onClick={() => { setRejectingId(q.id); setRejectNote(""); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "0.3rem",
                                  padding: ".38rem .95rem", fontSize: ".8rem", fontWeight: 600,
                                  borderRadius: 7, cursor: "pointer",
                                  background: "transparent", color: "#ef4444", border: "1px solid #ef444466",
                                }}>
                                <XCircle size={14} /> {"رفض"}
                              </button>
                            )}
                            {q.status !== "SENT" && (
                              <button type="button"
                                onClick={() => { void changeStatus(q.id, "SENT"); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "0.3rem",
                                  padding: ".38rem .95rem", fontSize: ".8rem", fontWeight: 600,
                                  borderRadius: 7, cursor: "pointer",
                                  background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)",
                                }}>
                                <Clock size={14} /> {"إعادة للانتظار"}
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ══ Visits tab ══ */}
            {tab === "visits" && (
              <section className="admin-section">
                {visits.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <MapPin size={36} style={{ color: "var(--text-secondary)", opacity: 0.35, marginBottom: "0.75rem" }} />
                    <p className="admin-muted">{"لا توجد زيارات"}</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".87rem" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-subtle, #f9fafb)", borderBottom: "1px solid var(--border-default)" }}>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"العميل"}</th>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"المندوب"}</th>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"تاريخ الزيارة"}</th>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"النتيجة"}</th>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"الزيارة القادمة"}</th>
                          <th style={{ textAlign: "start", padding: "0.65rem 1rem", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".78rem", textTransform: "uppercase" }}>{"ملاحظات"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((v, idx) => (
                          <tr key={v.id} style={{ borderBottom: idx < visits.length - 1 ? "1px solid var(--border-default)" : "none" }}>
                            <td style={{ padding: "0.7rem 1rem" }}><strong>{v.customer.name}</strong></td>
                            <td style={{ padding: "0.7rem 1rem", fontSize: ".82rem", color: "var(--text-secondary)" }}>{v.loggedBy.fullName}</td>
                            <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>{new Date(v.visitDate).toLocaleDateString()}</td>
                            <td style={{ padding: "0.7rem 1rem" }}>{v.outcome ?? <span className="admin-muted">—</span>}</td>
                            <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>
                              {v.nextVisitAt ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: ".82rem" }}>
                                  <Clock size={12} style={{ color: "var(--accent)" }} />
                                  {new Date(v.nextVisitAt).toLocaleDateString()}
                                </span>
                              ) : <span className="admin-muted">—</span>}
                            </td>
                            <td style={{ padding: "0.7rem 1rem", fontSize: ".8rem", color: "var(--text-secondary)", maxWidth: 220 }}>{v.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ══ Targets tab ══ */}
            {tab === "targets" && (
              <section className="admin-section">
                {targets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <Target size={36} style={{ color: "var(--text-secondary)", opacity: 0.35, marginBottom: "0.75rem" }} />
                    <p className="admin-muted">{"لا توجد أهداف"}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {targets.map((t) => {
                      const rawPct = t.targetAmount > 0 ? Math.round((t.achievedAmount / t.targetAmount) * 100) : 0;
                      const pct    = Math.min(100, rawPct);
                      const done   = rawPct >= 100;
                      return (
                        <article key={t.id} style={{
                          background: "var(--bg-surface, #fff)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "10px", padding: "0.9rem 1.1rem",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                            <div>
                              <strong style={{ fontSize: ".95rem" }}>{t.rep.fullName}</strong>
                              <span className="admin-muted" style={{ marginInlineStart: 8, fontSize: ".8rem" }}>
                                {MONTHS_AR[t.month - 1]} {t.year}
                              </span>
                              <p className="admin-muted" style={{ margin: "0.15rem 0 0", fontSize: ".8rem" }}>
                                ₪{t.achievedAmount.toFixed(0)} / ₪{t.targetAmount.toFixed(0)}
                              </p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <span style={{ display: "block", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1, color: done ? "var(--success)" : "var(--accent)" }}>{rawPct}</span>
                              <span style={{ fontSize: ".68rem", color: "var(--text-secondary)", fontWeight: 600 }}>%</span>
                            </div>
                          </div>
                          <div style={{ background: "var(--border-default)", borderRadius: 8, height: 9, overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", borderRadius: 8,
                              background: done ? "linear-gradient(90deg, var(--success), #34d399)" : "linear-gradient(90deg, var(--accent), var(--accent))",
                              transition: "width .4s ease",
                            }} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>

      {/* ── Reject with note modal ── */}
      {rejectingId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRejectingId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
              <XCircle size={22} color="#ef4444" />
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{"رفض عرض السعر"}</h2>
            </div>
            <p style={{ margin: 0, fontSize: ".87rem", color: "var(--text-secondary)" }}>
              {"يمكنك إضافة ملاحظة توضيحية للمندوب (اختياري)"}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder={"سبب الرفض..."}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid var(--border-default)", borderRadius: 8,
                padding: ".65rem .85rem", fontSize: ".88rem", resize: "vertical",
                background: "var(--bg-surface)", color: "var(--text-primary)",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button type="button"
                onClick={() => setRejectingId(null)}
                style={{ flex: 1, padding: ".55rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: ".88rem" }}>
                {"إلغاء"}
              </button>
              <button type="button"
                onClick={() => { void handleReject(); }}
                disabled={rejectSaving}
                style={{ flex: 1, padding: ".55rem", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: ".88rem" }}>
                {rejectSaving ? ("جارٍ...") : ("تأكيد الرفض")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
