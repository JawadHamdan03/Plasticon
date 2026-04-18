import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw, Calendar } from "lucide-react";
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

async function fetchAuth(path: string) {
  const token = localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function fmtTime(d: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d));
}
function fmtDate(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    weekday: "short", month: "short", day: "numeric",
  }).format(new Date(d));
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
    setLoading(true); setError("");
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

  useEffect(() => { void load(); }, [load]);

  const pendingTotal = useMemo(
    () => records.filter(r => !r.isConfirmed).reduce((s, r) => s + r.totalDailyPay, 0),
    [records],
  );

  const t = {
    title: isAr ? "رواتبي اليومية" : "My Daily Payroll",
    subtitle: isAr ? "سجل الحضور اليومي والراتب المؤكد." : "Daily attendance and confirmed salary record.",
    confirmed: isAr ? "المؤكد" : "Confirmed",
    pending: isAr ? "قيد الانتظار" : "Pending",
    checkIn: isAr ? "دخول" : "Check-in",
    checkOut: isAr ? "خروج" : "Check-out",
    hours: isAr ? "الساعات" : "Hours",
    dailySalary: isAr ? "الراتب اليومي" : "Daily Pay",
    status: isAr ? "الحالة" : "Status",
    noRecords: isAr ? "لا توجد سجلات لهذا الشهر." : "No records found for this month.",
    nis: "NIS",
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
            {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>
      }
    >
      {/* Summary cards */}
      <div className="payroll-summary-cards">
        <div className="payroll-summary-card payroll-summary-card--green">
          <div className="payroll-summary-card__icon"><CheckCircle size={20} /></div>
          <div>
            <p className="payroll-summary-card__label">{t.confirmed}</p>
            <p className="payroll-summary-card__value">{confirmedTotal.toFixed(2)} <span>{t.nis}</span></p>
          </div>
        </div>
        <div className="payroll-summary-card payroll-summary-card--orange">
          <div className="payroll-summary-card__icon"><AlertCircle size={20} /></div>
          <div>
            <p className="payroll-summary-card__label">{t.pending}</p>
            <p className="payroll-summary-card__value">{pendingTotal.toFixed(2)} <span>{t.nis}</span></p>
          </div>
        </div>
        <div className="payroll-summary-card">
          <div className="payroll-summary-card__icon"><DollarSign size={20} /></div>
          <div>
            <p className="payroll-summary-card__label">{isAr ? "الإجمالي" : "Total"}</p>
            <p className="payroll-summary-card__value">{(confirmedTotal + pendingTotal).toFixed(2)} <span>{t.nis}</span></p>
          </div>
        </div>
        <div className="payroll-summary-card">
          <div className="payroll-summary-card__icon"><Calendar size={20} /></div>
          <div>
            <p className="payroll-summary-card__label">{isAr ? "أيام العمل" : "Work Days"}</p>
            <p className="payroll-summary-card__value">{records.length}</p>
          </div>
        </div>
      </div>

      {error && <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Daily records table */}
      <div className="module-panel module-panel--full">
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{isAr ? "التاريخ" : "Date"}</th>
                <th>{t.checkIn}</th>
                <th>{t.checkOut}</th>
                <th>{t.hours}</th>
                <th>{t.dailySalary}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  <Clock size={28} style={{ display: "block", margin: "0 auto .5rem", opacity: .4 }} />
                  {t.noRecords}
                </td></tr>
              ) : records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(r.date, locale)}</td>
                  <td>{r.attendance?.checkIn ? fmtTime(r.attendance.checkIn) : "—"}</td>
                  <td>{r.attendance?.checkOut ? fmtTime(r.attendance.checkOut) : "—"}</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                      <Clock size={13} style={{ opacity: .6 }} />
                      {r.hoursWorked.toFixed(1)}h
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePageShell>
  );
}
