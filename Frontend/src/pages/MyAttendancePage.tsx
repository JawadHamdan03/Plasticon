import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePageShell } from "../components/ModulePageShell";
import { TruckLoader } from "../components/TruckLoader";
import { appCopy } from "../content/appCopy";
import { useLocale } from "../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../lib/api";

type AttendanceRecord = {
  id: number;
  checkIn: string;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  shift?: {
    id: number;
    name: string;
  } | null;
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function MyAttendancePage() {
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "check-in" | "check-out" | ""
  >("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const t = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الحضور اليومي",
            subtitle: "سجل الدخول والخروج وتابع سجلك اليومي.",
            checkIn: "تسجيل دخول",
            checkOut: "تسجيل خروج",
            loading: "جارٍ تحميل سجل الحضور...",
            noData: "لا توجد سجلات حضور بعد.",
            checkedIn: "تم تسجيل الدخول بنجاح",
            checkedOut: "تم تسجيل الخروج بنجاح",
            statusOpen: "مفتوح",
            statusClosed: "مغلق",
            shift: "الشفت",
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
            statusOpen: "Open",
            statusClosed: "Closed",
            shift: "Shift",
          },
    [locale],
  );

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/attendance/me");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

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
    () => records.some((item) => item.checkOut === null),
    [records],
  );

  const attendanceSummary = useMemo(() => {
    const daySet = new Set<string>();
    const currentMonthDaySet = new Set<string>();
    let fridayCount = 0;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    for (const record of records) {
      const date = new Date(record.checkIn);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!daySet.has(dayKey) && date.getDay() === 5) {
        fridayCount += 1;
      }

      daySet.add(dayKey);

      if (date.getMonth() === month && date.getFullYear() === year) {
        currentMonthDaySet.add(dayKey);
      }
    }

    return {
      totalWorkedDays: daySet.size,
      currentMonthWorkedDays: currentMonthDaySet.size,
      fridayDays: fridayCount,
    };
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
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

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
          onClick={() => {
            void loadAttendance();
          }}
        >
          {copy.refresh}
        </button>
      }
    >
      <div className="module-summary-bar">
        <span>{copy.admin.recordsShown}</span>
        <strong>{records.length}</strong>
        <span>{copy.admin.status}</span>
        <strong>{hasOpenAttendance ? t.statusOpen : t.statusClosed}</strong>
        <span>{locale === "ar" ? "أيام الدوام" : "Worked days"}</span>
        <strong>{attendanceSummary.totalWorkedDays}</strong>
        <span>{locale === "ar" ? "أيام الجمعة" : "Friday days"}</span>
        <strong>{attendanceSummary.fridayDays}</strong>
      </div>

      <section className="module-grid">
        <article className="module-panel">
          <h2>{t.title}</h2>
          <div className="admin-section__actions admin-section__actions--inline">
            <button
              type="button"
              className="auth-button"
              disabled={actionLoading !== "" || hasOpenAttendance}
              onClick={() => void runAction("check-in")}
            >
              {actionLoading === "check-in" ? copy.load : t.checkIn}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              disabled={actionLoading !== "" || !hasOpenAttendance}
              onClick={() => void runAction("check-out")}
            >
              {actionLoading === "check-out" ? copy.load : t.checkOut}
            </button>
          </div>

          {successMessage ? (
            <div className="auth-alert">{successMessage}</div>
          ) : null}
          {errorMessage ? (
            <div className="auth-alert auth-alert--error">{errorMessage}</div>
          ) : null}
        </article>

        <article className="module-panel">
          <h2>{copy.admin.attendanceTitle}</h2>
          {loading ? <TruckLoader /> : null}
          {!loading && records.length === 0 ? <p>{t.noData}</p> : null}
          <div className="module-list">
            {records.map((record) => (
              <div className="module-row" key={record.id}>
                <strong>{new Date(record.checkIn).toLocaleString()}</strong>
                <span>
                  {t.shift}: {record.shift?.name ?? "-"}
                </span>
                <small>
                  {copy.admin.checkOutLabel}:{" "}
                  {record.checkOut
                    ? new Date(record.checkOut).toLocaleString()
                    : "-"}
                </small>
                <small>
                  {copy.admin.totalLateMinutes}: {record.lateMinutes} •{" "}
                  {copy.admin.totalOvertimeMinutes}: {record.overtimeMinutes}
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </ModulePageShell>
  );
}
