import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type DailyRecord = {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  attendance: { checkIn: string; checkOut: string | null } | null;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAuth(path: string) {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { ...authHeaders() },
  });
}

function fmtTime(d: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}

function fmtDate(d: string, locale: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card,#fff)",
        border: "1px solid var(--border-default,#e5e7eb)",
        borderRadius: 16,
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: accent + "18",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: ".72rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: ".15rem 0 0",
            fontSize: "1.25rem",
            fontWeight: 800,
            lineHeight: 1,
            color: "var(--text-primary)",
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              margin: ".2rem 0 0",
              fontSize: ".73rem",
              color: "var(--text-secondary)",
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export function MyPayrollPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAuth(`/payroll/daily/me?month=${month}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRecords(data.records ?? []);
      setConfirmedTotal(data.confirmedTotal ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingTotal = useMemo(
    () =>
      records
        .filter((r) => !r.isConfirmed)
        .reduce((s, r) => s + r.totalDailyPay, 0),
    [records],
  );

  const totalHours = useMemo(
    () => records.reduce((s, r) => s + r.hoursWorked, 0),
    [records],
  );

  const confirmedDays = useMemo(
    () => records.filter((r) => r.isConfirmed).length,
    [records],
  );

  const pendingDays = useMemo(
    () => records.filter((r) => !r.isConfirmed).length,
    [records],
  );

  const dailyRate = records[0]?.dailyRate ?? 0;
  const grandTotal = confirmedTotal + pendingTotal;
  const confirmRate = grandTotal > 0 ? (confirmedTotal / grandTotal) * 100 : 0;

  const [selectedMonth, selectedYear] = month.split("-");
  const monthLabel = new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(selectedYear), Number(selectedMonth) - 1, 1));

  const t = {
    title: "راتبي الشهري",
    subtitle: isAr
      ? "تفاصيل راتبك الشهري وسجل العمل اليومي."
      : "Your monthly salary breakdown and daily work records.",
    confirmed: "المؤكد",
    pending: "قيد الانتظار",
    total: "الإجمالي",
    workDays: "أيام العمل",
    totalHours: "إجمالي الساعات",
    dailyRate: "السعر اليومي",
    checkIn: "دخول",
    checkOut: "خروج",
    hours: "الساعات",
    dailySalary: "الراتب اليومي",
    status: "الحالة",
    noRecords: isAr
      ? "لا توجد سجلات لهذا الشهر."
      : "No records found for this month.",
    nis: "₪",
    confirmedProgress: "نسبة التأكيد",
    pendingDays: "يوم انتظار",
    confirmedDays: "يوم مؤكد",
    dailyRecords: "السجلات اليومية",
  };

  return (
    <ModulePageShell
      title={t.title}
      subtitle={t.subtitle}
      actions={
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="field__control"
            style={{ width: "160px", fontSize: ".875rem" }}
          />
          <button className="btn btn--ghost btn--sm" onClick={() => void load()}>
            <RefreshCw size={14} />
            {"تحديث"}
          </button>
        </div>
      }
    >
      {/* ── Month hero banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg,#1d4ed8,#7c3aed)",
          borderRadius: 20,
          padding: "1.5rem 2rem",
          color: "#fff",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem",
          boxShadow: "0 8px 24px rgba(109,40,217,.25)",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: ".8rem", opacity: .8, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {"إجمالي راتب شهر"} {monthLabel}
          </p>
          <p style={{ margin: ".3rem 0 0", fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>
            {grandTotal.toFixed(2)} <span style={{ fontSize: "1rem", fontWeight: 600, opacity: .9 }}>{t.nis}</span>
          </p>
          <p style={{ margin: ".5rem 0 0", fontSize: ".82rem", opacity: .75 }}>
            {isAr
              ? `${records.length} يوم عمل · ${totalHours.toFixed(1)} ساعة`
              : `${records.length} work days · ${totalHours.toFixed(1)} hours`}
          </p>
        </div>

        {/* Confirmation progress */}
        <div style={{ minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".4rem" }}>
            <span style={{ fontSize: ".78rem", opacity: .85 }}>{t.confirmedProgress}</span>
            <span style={{ fontSize: ".78rem", fontWeight: 700 }}>{confirmRate.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${confirmRate}%`, borderRadius: 99, background: "#4ade80", transition: "width .4s" }} />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: ".5rem" }}>
            <span style={{ fontSize: ".75rem", opacity: .8 }}>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>{confirmedDays}</span> {t.confirmedDays}
            </span>
            <span style={{ fontSize: ".75rem", opacity: .8 }}>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>{pendingDays}</span> {t.pendingDays}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          icon={<CheckCircle size={20} />}
          label={t.confirmed}
          value={`${confirmedTotal.toFixed(2)} ${t.nis}`}
          sub={`${confirmedDays} ${"يوم"}`}
          accent="#10b981"
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          label={t.pending}
          value={`${pendingTotal.toFixed(2)} ${t.nis}`}
          sub={`${pendingDays} ${"يوم"}`}
          accent="#f59e0b"
        />
        <StatCard
          icon={<Clock size={20} />}
          label={t.totalHours}
          value={`${totalHours.toFixed(1)}h`}
          sub={`متوسط ${(records.length ? totalHours / records.length : 0).toFixed(1)}س/يوم`}
          accent="#3b82f6"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={t.dailyRate}
          value={`${dailyRate.toFixed(2)} ${t.nis}`}
          sub={"سعر اليوم الواحد"}
          accent="#8b5cf6"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label={t.workDays}
          value={records.length}
          sub={"يوم مسجّل"}
          accent="#ec4899"
        />
        <StatCard
          icon={<Briefcase size={20} />}
          label={"الراتب الشهري"}
          value={`${(dailyRate * 30).toFixed(0)} ${t.nis}`}
          sub={"بناءً على السعر اليومي"}
          accent="#06b6d4"
        />
      </div>

      {/* Work summary row */}
      {records.length > 0 && (
        <div
          style={{
            background: "var(--bg-surface,#f8fafc)",
            border: "1px solid var(--border-default,#e5e7eb)",
            borderRadius: 14,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          {[
            { label: "أيام الدوام الفعلي", value: records.filter(r => r.hoursWorked > 0).length, color: "#10b981" },
            { label: "أيام بدون خروج", value: records.filter(r => r.attendance && !r.attendance.checkOut).length, color: "#f59e0b" },
            { label: "إجمالي المستحقات", value: `${grandTotal.toFixed(2)} ${t.nis}`, color: "#3b82f6" },
            { label: "متوسط اليومي", value: `${(records.length ? grandTotal / records.length : 0).toFixed(2)} ${t.nis}`, color: "#8b5cf6" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: ".1rem" }}>
              <span style={{ fontSize: ".73rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{item.label}</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* ── Daily records table ── */}
      <div className="module-panel module-panel--full">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            {t.dailyRecords}
          </h3>
          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>
            {records.length} {"سجل"}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{"التاريخ"}</th>
                <th>{t.checkIn}</th>
                <th>{t.checkOut}</th>
                <th>{t.hours}</th>
                <th>{"السعر/يوم"}</th>
                <th>{t.dailySalary}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
                    <DollarSign size={32} style={{ display: "block", margin: "0 auto .75rem", opacity: 0.3 }} />
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const missingOut = r.attendance && !r.attendance.checkOut;
                  return (
                    <tr key={r.id} style={{ background: missingOut ? "rgba(245,158,11,.04)" : undefined }}>
                      <td style={{ fontWeight: 700 }}>{fmtDate(r.date, locale)}</td>
                      <td>{r.attendance?.checkIn ? fmtTime(r.attendance.checkIn) : <span style={{ color: "var(--text-secondary)" }}>—</span>}</td>
                      <td>
                        {r.attendance?.checkOut
                          ? fmtTime(r.attendance.checkOut)
                          : <span style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 4, padding: "1px 6px", color: "#854d0e", fontSize: ".73rem", fontWeight: 600 }}>
                              {"⚠ لم يُسجَّل"}
                            </span>
                        }
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                          <Clock size={13} style={{ opacity: 0.5 }} />
                          <strong>{r.hoursWorked.toFixed(1)}</strong>h
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: ".88rem" }}>
                        {r.dailyRate.toFixed(2)} {t.nis}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--brand-primary)" }}>
                        {r.totalDailyPay.toFixed(2)} {t.nis}
                      </td>
                      <td>
                        {r.isConfirmed ? (
                          <span className="badge badge--success">
                            <CheckCircle size={12} /> {t.confirmed}
                          </span>
                        ) : (
                          <span className="badge badge--warning">
                            <AlertCircle size={12} /> {t.pending}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePageShell>
  );
}
