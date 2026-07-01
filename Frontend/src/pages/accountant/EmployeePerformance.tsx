import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Award, Plus, Trash2, X, Save, Zap, TrendingUp, Search, ChevronDown } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface PerfRecord {
  id: number;
  periodType: string;
  periodDate: string;
  productionScore: number;
  qualityScore: number;
  attendanceScore: number;
  kaizenScore: number;
  totalScore: number;
  notes: string | null;
  user: { id: number; fullName: string; username: string; role: string };
  calculatedBy: { id: number; fullName: string };
}

interface UserOption { id: number; fullName: string; username: string; role: string }

const emptyForm = {
  userId: "",
  periodType: "DAILY",
  periodDate: new Date().toISOString().split("T")[0],
  productionScore: "100",
  qualityScore: "100",
  attendanceScore: "100",
  kaizenScore: "0",
  notes: "",
};

type Grade = "excellent" | "good" | "average" | "poor";

function getGrade(score: number): Grade {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "average";
  return "poor";
}

const GRADE_META: Record<Grade, { label: string; labelAr: string; color: string; bg: string; border: string }> = {
  excellent: { label: "Excellent",  labelAr: "ممتاز",       color: "#047857", bg: "#d1fae5", border: "#6ee7b7" },
  good:      { label: "Good",       labelAr: "جيد",          color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  average:   { label: "Average",    labelAr: "متوسط",        color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  poor:      { label: "Poor",       labelAr: "ضعيف",         color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
};

const SCORE_WEIGHTS = [
  { key: "productionScore" as const, labelEn: "Production Output",  labelAr: "الإنتاج",     color: "#3b82f6", weight: 40 },
  { key: "qualityScore"    as const, labelEn: "Quality Rate",       labelAr: "الجودة",      color: "#10b981", weight: 30 },
  { key: "attendanceScore" as const, labelEn: "Attendance",         labelAr: "الحضور",      color: "#f59e0b", weight: 20 },
  { key: "kaizenScore"     as const, labelEn: "Kaizen / Improvement", labelAr: "كايزن",    color: "#8b5cf6", weight: 10 },
];

function ScoreBar({ label, value, color, weight }: { label: string; value: number; color: string; weight: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">وزن {weight}%</span>
          <span className="text-sm font-bold" style={{ color }}>{value.toFixed(0)}</span>
        </div>
      </div>
      <div className="h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function GradeBadge({ score }: { score: number }) {
  const g = getGrade(score);
  const m = GRADE_META[g];
  return (
    <span style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: "20px", padding: "2px 10px", fontSize: ".72rem", fontWeight: 700,
    }}>
      {m.labelAr}
    </span>
  );
}

export default function EmployeePerformance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [records, setRecords] = useState<PerfRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [salaries, setSalaries] = useState<{ id: number; fullName: string; role: string; effectiveSalary: number; individualSalary: number | null; roleDefaultSalary: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [autoCalc, setAutoCalc] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { void fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API_BASE_URL}/performance`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/users/all`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_BASE_URL}/payroll/admin/user-salaries`, { headers: authHeaders(), credentials: "include" }),
      ]);
      if (r1.ok) { const d = await r1.json(); setRecords(d.records ?? d ?? []); }
      if (r2.ok) { const d = await r2.json(); setUsers((d.users ?? d ?? []).filter((u: UserOption) => u.role !== "ADMIN")); }
      if (r3.ok) { const d = await r3.json(); setSalaries(d ?? []); }
    } catch { } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.userId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          userId: parseInt(form.userId),
          periodType: form.periodType,
          periodDate: form.periodDate,
          productionScore: parseFloat(form.productionScore || "0"),
          qualityScore: parseFloat(form.qualityScore || "0"),
          attendanceScore: parseFloat(form.attendanceScore || "0"),
          kaizenScore: parseFloat(form.kaizenScore || "0"),
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) { setShowForm(false); void fetchAll(); }
    } catch { } finally { setSaving(false); }
  };

  const handleAutoCalc = async () => {
    if (!form.userId) return;
    setAutoCalc(true);
    try {
      const res = await fetch(`${API_BASE_URL}/performance/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ userId: parseInt(form.userId), periodType: form.periodType, periodDate: form.periodDate }),
      });
      if (res.ok) { setShowForm(false); void fetchAll(); }
    } catch { } finally { setAutoCalc(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("حذف هذا السجل؟", { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/performance/${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
      void fetchAll();
    } catch { }
  };

  const filtered = records
    .filter((r) => !search || r.user.fullName.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => !filterPeriod || r.periodType === filterPeriod);

  // KPIs
  const avgScore = records.length ? (records.reduce((a, b) => a + b.totalScore, 0) / records.length) : 0;
  const excellent = records.filter((r) => r.totalScore >= 90).length;
  const topPerformer = records.length
    ? records.reduce((a, b) => a.totalScore > b.totalScore ? a : b)
    : null;

  // Leaderboard - top 3 by avg score per employee
  const byEmployee = new Map<number, { name: string; role: string; scores: number[] }>();
  for (const r of records) {
    const e = byEmployee.get(r.user.id) ?? { name: r.user.fullName, role: r.user.role, scores: [] };
    e.scores.push(r.totalScore);
    byEmployee.set(r.user.id, e);
  }
  const leaderboard = [...byEmployee.values()]
    .map((e) => ({ ...e, avg: e.scores.reduce((a, b) => a + b, 0) / e.scores.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  const ROLE_ICONS: Record<string, string> = { WORKER: "👷", ENGINEER: "🔧", ACCOUNTANT: "💼" };

  const computedTotal = (f: typeof form) => {
    const p = parseFloat(f.productionScore || "0");
    const q = parseFloat(f.qualityScore || "0");
    const a = parseFloat(f.attendanceScore || "0");
    const k = parseFloat(f.kaizenScore || "0");
    return (p * 0.4 + q * 0.3 + a * 0.2 + k * 0.1).toFixed(1);
  };

  return (
    <ModulePageShell
      title="أداء الموظفين"
      subtitle="تقييم الإنتاج والجودة والحضور والتحسين"
      icon={<Award size={22} />}
    >
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "إجمالي التقييمات", value: records.length,                               gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: "متوسط الدرجة",      value: records.length ? avgScore.toFixed(1) : "—",  gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: "ممتاز (≥90)",       value: excellent,                                   gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: "الأفضل أداءً",      value: topPerformer?.user.fullName.split(" ")[0] ?? "—", gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
        ].map((k) => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard + Action */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <Card className="p-4 flex-1">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} /> {"أفضل الأداء"}
            </p>
            <div className="flex flex-col gap-2">
              {leaderboard.map((e, i) => (
                <div key={e.name} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">{e.name}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{e.avg.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border-default)] rounded-full mt-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${e.avg}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Score weights legend */}
        <Card className="p-4 flex-1">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">{"أوزان الدرجات"}</p>
          <div className="flex flex-col gap-2.5">
            {SCORE_WEIGHTS.map((w) => (
              <div key={w.key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: w.color }} />
                <span className="text-xs flex-1 text-[var(--text-secondary)]">{w.labelAr}</span>
                <span className="text-xs font-bold" style={{ color: w.color }}>{w.weight}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isAdmin && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
            <Plus size={15} className="me-1" />
            {"إضافة تقييم"}
          </Button>
        )}
        <div className="relative">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input className="input ps-8 h-8 text-sm w-44" placeholder={"بحث..."}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm h-8" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">{"جميع الفترات"}</option>
          <option value="DAILY">{"يومي"}</option>
          <option value="WEEKLY">{"أسبوعي"}</option>
        </select>
      </div>

      {/* Assessment Form */}
      {showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">{"تقييم أداء جديد"}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{"الأوزان: إنتاج 40%، جودة 30%، حضور 20%، كايزن 10%"}</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-secondary)]"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label">{"الموظف *"}</label>
              <select className="input" value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}>
                <option value="">{"اختر موظفًا..."}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {ROLE_ICONS[u.role] ?? "👤"} {u.fullName} — {u.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{"نوع الفترة"}</label>
              <select className="input" value={form.periodType} onChange={(e) => setForm((p) => ({ ...p, periodType: e.target.value }))}>
                <option value="DAILY">{"يومي"}</option>
                <option value="WEEKLY">{"أسبوعي"}</option>
              </select>
            </div>
            <div>
              <label className="label">{"تاريخ الفترة"}</label>
              <input type="date" className="input" value={form.periodDate} onChange={(e) => setForm((p) => ({ ...p, periodDate: e.target.value }))} />
            </div>
          </div>

          {/* Score sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {SCORE_WEIGHTS.map((w) => (
              <div key={w.key}>
                <div className="flex justify-between mb-1">
                  <label className="label mb-0">{w.labelAr} <span className="text-[var(--text-secondary)] font-normal">({w.weight}%)</span></label>
                  <span className="text-sm font-bold" style={{ color: w.color }}>
                    {form[w.key]}/100
                  </span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={form[w.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [w.key]: e.target.value }))}
                  className="w-full accent-blue-500"
                  style={{ accentColor: w.color }}
                />
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>0</span><span>50</span><span>100</span>
                </div>
              </div>
            ))}
          </div>

          {/* Computed total preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: "var(--bg-surface-2, #f8fafc)", border: "1px solid var(--border-default)" }}>
            <span className="text-sm font-medium text-[var(--text-secondary)]">{"الدرجة الإجمالية المحسوبة:"}</span>
            <span className="text-xl font-bold text-[var(--text-primary)]">{computedTotal(form)}</span>
            <GradeBadge score={parseFloat(computedTotal(form))} />
          </div>

          <div className="mb-3">
            <label className="label">{"ملاحظات"}</label>
            <input className="input" placeholder={"ملاحظات اختيارية عن هذه الفترة"}
              value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.userId}>
              <Save size={14} className="me-1" />
              {saving ? "جارٍ الحفظ..." : "حفظ التقييم"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleAutoCalc} disabled={autoCalc || !form.userId}>
              <Zap size={14} className="me-1" />
              {autoCalc ? "جارٍ الحساب..." : "حساب تلقائي من السجلات"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{"إلغاء"}</Button>
          </div>
        </Card>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Award size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{"لا توجد سجلات أداء"}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const grade = getGrade(r.totalScore);
            const gm = GRADE_META[grade];
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer flex items-center justify-between gap-3"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  {/* Left: employee info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: gm.bg,
                      border: `2px solid ${gm.border}`, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "1.1rem", flexShrink: 0,
                    }}>
                      {ROLE_ICONS[r.user.role] ?? "👤"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{r.user.fullName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{r.user.role} · {r.periodType} · {new Date(r.periodDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Right: score */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <GradeBadge score={r.totalScore} />
                    <div className="text-end">
                      <p className="text-xl font-bold" style={{ color: gm.color }}>{r.totalScore.toFixed(1)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">/100</p>
                    </div>
                    <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${expanded ? "rotate-180" : ""}`} />
                    {!isAdmin && (
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(r.id); }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable score breakdown */}
                {expanded && (
                  <div className="border-t border-[var(--border-default)] px-4 pb-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {SCORE_WEIGHTS.map((w) => (
                        <ScoreBar
                          key={w.key}
                          label={`${w.labelAr} (${w.weight}%)`}
                          value={r[w.key]}
                          color={w.color}
                          weight={w.weight}
                        />
                      ))}
                    </div>
                    {r.notes && (
                      <p className="mt-3 text-xs text-[var(--text-secondary)] italic border-t border-[var(--border-default)] pt-2">
                        📝 {r.notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {"قيّمه:"} {r.calculatedBy.fullName}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Salary Table */}
      {salaries.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: ".75rem", color: "var(--text-primary)" }}>
            💰 {"رواتب الموظفين"}
          </h2>
          <div style={{ overflowX: "auto", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface)" }}>
                  <th style={{ padding: ".6rem 1rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-default)" }}>{"الموظف"}</th>
                  <th style={{ padding: ".6rem 1rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-default)" }}>{"الدور"}</th>
                  <th style={{ padding: ".6rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-default)" }}>{"الراتب الشهري"}</th>
                  <th style={{ padding: ".6rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-default)" }}>{"النوع"}</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg-surface)" }}>
                    <td style={{ padding: ".6rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{s.fullName}</td>
                    <td style={{ padding: ".6rem 1rem", color: "var(--text-secondary)" }}>{s.role}</td>
                    <td style={{ padding: ".6rem 1rem", textAlign: "right", fontWeight: 700, color: "#10b981" }}>{s.effectiveSalary.toLocaleString()} ₪</td>
                    <td style={{ padding: ".6rem 1rem", textAlign: "right" }}>
                      <span style={{
                        fontSize: ".72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: s.individualSalary != null ? "#dbeafe" : "#f3f4f6",
                        color: s.individualSalary != null ? "#1d4ed8" : "#6b7280",
                      }}>
                        {s.individualSalary != null ? "مخصص" : "افتراضي"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
