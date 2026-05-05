import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";
import { appCopy } from "../../content/appCopy";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { LogIn, LogOut, Clock, Calendar, Sun } from "lucide-react";

type AttendanceRecord = {
  id: number;
  checkIn: string;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  shift?: { id: number; name: string } | null;
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

export function MyAttendancePage() {
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const isAr = locale === "ar";

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "check-in" | "check-out" | ""
  >("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const t = useMemo(
    () =>
      isAr
        ? {
            title: "حضوري",
            subtitle: "سجل الدخول والخروج وتابع سجلك اليومي.",
            checkIn: "تسجيل دخول",
            checkOut: "تسجيل خروج",
            loading: "جارٍ تحميل سجل الحضور...",
            noData: "لا توجد سجلات حضور بعد.",
            checkedIn: "تم تسجيل الدخول بنجاح",
            checkedOut: "تم تسجيل الخروج بنجاح",
            statusOpen: "داخل الشفت",
            statusClosed: "خارج الشفت",
            shift: "الشفت",
            checkInLabel: "وقت الدخول",
            checkOutLabel: "وقت الخروج",
            late: "تأخير",
            overtime: "إضافي",
            history: "سجل الحضور والغياب",
            workedDays: "أيام الدوام",
            thisMonth: "هذا الشهر",
            fridays: "الجمع",
            minutes: "دقيقة",
          }
        : {
            title: "My Attendance",
            subtitle:
              "Check in, check out, and review your attendance history.",
            checkIn: "Check In",
            checkOut: "Check Out",
            loading: "Loading attendance records...",
            noData: "No attendance records yet.",
            checkedIn: "Checked in successfully",
            checkedOut: "Checked out successfully",
            statusOpen: "Shift open",
            statusClosed: "No active shift",
            shift: "Shift",
            checkInLabel: "Check in",
            checkOutLabel: "Check out",
            late: "Late",
            overtime: "Overtime",
            history: "Attendance & Absence",
            workedDays: "Worked days",
            thisMonth: "This month",
            fridays: "Fridays",
            minutes: "min",
          },
    [isAr],
  );

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/attendance/me");
      if (!response.ok) throw new Error(await readApiError(response));
      setRecords(((await response.json()) as AttendanceRecord[]) ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load attendance",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const hasOpenAttendance = useMemo(
    () => records.some((r) => r.checkOut === null),
    [records],
  );

  const summary = useMemo(() => {
    const daySet = new Set<string>();
    const monthSet = new Set<string>();
    let fridays = 0;
    const now = new Date();

    for (const rec of records) {
      const d = new Date(rec.checkIn);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!daySet.has(key) && d.getDay() === 5) fridays++;
      daySet.add(key);
      if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      )
        monthSet.add(key);
    }

    return { total: daySet.size, month: monthSet.size, fridays };
  }, [records]);

  const runAction = async (action: "check-in" | "check-out") => {
    setActionLoading(action);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetchWithAuth(
        action === "check-in"
          ? "/attendance/check-in"
          : "/attendance/check-out",
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await readApiError(response));
      setSuccessMessage(action === "check-in" ? t.checkedIn : t.checkedOut);
      await loadAttendance();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Attendance action failed",
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <ModulePageShell
      title={t.title}
      subtitle={t.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => void loadAttendance()}
        >
          {copy.refresh}
        </button>
      }
    >
      {/* ── Action card ── */}
      <div className="attendance-action-card">
        <div className="attendance-action-card__status">
          <span
            className={`attendance-status-dot${hasOpenAttendance ? " attendance-status-dot--open" : ""}`}
          />
          <span className="attendance-action-card__status-label">
            {hasOpenAttendance ? t.statusOpen : t.statusClosed}
          </span>
        </div>

        <div className="attendance-action-card__stats">
          <div className="attendance-stat">
            <Calendar size={18} />
            <div>
              <strong>{summary.total}</strong>
              <span>{t.workedDays}</span>
            </div>
          </div>
          <div className="attendance-stat">
            <Sun size={18} />
            <div>
              <strong>{summary.month}</strong>
              <span>{t.thisMonth}</span>
            </div>
          </div>
          <div className="attendance-stat">
            <Clock size={18} />
            <div>
              <strong>{summary.fridays}</strong>
              <span>{t.fridays}</span>
            </div>
          </div>
        </div>

        <div className="attendance-action-card__buttons">
          <button
            type="button"
            className="attendance-btn attendance-btn--in"
            disabled={actionLoading !== "" || hasOpenAttendance}
            onClick={() => void runAction("check-in")}
          >
            <LogIn size={20} />
            {actionLoading === "check-in" ? copy.load : t.checkIn}
          </button>
          <button
            type="button"
            className="attendance-btn attendance-btn--out"
            disabled={actionLoading !== "" || !hasOpenAttendance}
            onClick={() => void runAction("check-out")}
          >
            <LogOut size={20} />
            {actionLoading === "check-out" ? copy.load : t.checkOut}
          </button>
        </div>

        {successMessage ? (
          <div className="auth-alert">{successMessage}</div>
        ) : null}
        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}
      </div>

      {/* ── History card ── */}
      <div className="attendance-history-card">
        <div className="attendance-history-card__head">
          <h2>{t.history}</h2>
          <span className="attendance-history-card__count">
            {records.length}
          </span>
        </div>

        {loading ? <TruckLoader /> : null}
        {!loading && records.length === 0 ? (
          <p className="attendance-empty">{t.noData}</p>
        ) : null}

        <div className="attendance-history-list">
          {records.map((rec) => {
            const isOpen = rec.checkOut === null;
            const duration = rec.checkOut
              ? Math.floor(
                  (new Date(rec.checkOut).getTime() -
                    new Date(rec.checkIn).getTime()) /
                    60000,
                )
              : null;

            return (
              <div
                key={rec.id}
                className={`attendance-history-row${isOpen ? " attendance-history-row--open" : ""}`}
              >
                <div className="attendance-history-row__indicator" />

                <div className="attendance-history-row__body">
                  <div className="attendance-history-row__top">
                    <strong>
                      {new Date(rec.checkIn).toLocaleDateString(
                        isAr ? "ar-EG" : "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </strong>
                    <span
                      className={`attendance-history-badge${isOpen ? " attendance-history-badge--open" : ""}`}
                    >
                      {isOpen ? t.statusOpen : t.statusClosed}
                    </span>
                  </div>

                  <div className="attendance-history-row__times">
                    <div className="attendance-time-chip">
                      <LogIn size={13} />
                      {new Date(rec.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {rec.checkOut ? (
                      <div className="attendance-time-chip attendance-time-chip--out">
                        <LogOut size={13} />
                        {new Date(rec.checkOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    ) : null}
                    {duration !== null ? (
                      <div className="attendance-time-chip attendance-time-chip--dur">
                        <Clock size={13} />
                        {duration} {t.minutes}
                      </div>
                    ) : null}
                  </div>

                  <div className="attendance-history-row__meta">
                    {rec.shift?.name ? <span>🔄 {rec.shift.name}</span> : null}
                    {rec.lateMinutes > 0 ? (
                      <span className="attendance-meta-tag attendance-meta-tag--late">
                        {t.late}: {rec.lateMinutes} {t.minutes}
                      </span>
                    ) : null}
                    {rec.overtimeMinutes > 0 ? (
                      <span className="attendance-meta-tag attendance-meta-tag--ot">
                        {t.overtime}: {rec.overtimeMinutes} {t.minutes}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModulePageShell>
  );
}
