import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type AttendanceRecord = {
  id: number;
  userId: number;
  checkIn: string;
  checkOut?: string | null;
  lateMinutes?: number;
  user?: {
    fullName: string;
    username: string;
    role: string;
  };
  shift?: { name: string } | null;
};

type AdminUser = {
  id: number;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  isActive: boolean;
  deletedAt?: string | null;
};

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function AttendanceAdminPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(
    null,
  );
  const [attendanceForm, setAttendanceForm] = useState({
    checkIn: "",
    checkOut: "",
  });

  const text = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الحضور والغياب",
            loading: "جارٍ تحميل بيانات الحضور...",
            noData: "لا توجد سجلات حضور",
            todayAttendance: "حضور اليوم",
            todayAbsence: "غياب اليوم",
            openShifts: "المناوبات المفتوحة",
            lateCases: "حالات التأخير",
            shift: "الوردية",
            checkIn: "وقت الدخول",
            checkOut: "وقت الخروج",
            status: "الحالة",
            checkedIn: "داخل المناوبة",
            checkedOut: "تم تسجيل الخروج",
          }
        : {
            title: "Attendance & Absence",
            loading: "Loading attendance...",
            noData: "No attendance records",
            todayAttendance: "Today attendance",
            todayAbsence: "Today absence",
            openShifts: "Open shifts",
            lateCases: "Late cases",
            shift: "Shift",
            checkIn: "Check in",
            checkOut: "Check out",
            status: "Status",
            checkedIn: "Checked in",
            checkedOut: "Checked out",
          },
    [locale],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResponse, attendanceResponse] = await Promise.all([
        fetchWithAdminAuth("/users/all"),
        fetchWithAdminAuth("/attendance/all"),
      ]);
      if (!usersResponse.ok) {
        throw new Error(await readApiError(usersResponse));
      }
      if (!attendanceResponse.ok) {
        throw new Error(await readApiError(attendanceResponse));
      }
      setUsers((await usersResponse.json()) as AdminUser[]);
      setRecords(
        ((await attendanceResponse.json()) as AttendanceRecord[]) ?? [],
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loading);
    } finally {
      setLoading(false);
    }
  }, [text.loading]);

  const toLocalDateTimeValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const pad = (input: number) => String(input).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const startEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendanceId(record.id);
    setAttendanceForm({
      checkIn: toLocalDateTimeValue(record.checkIn),
      checkOut: toLocalDateTimeValue(record.checkOut ?? null),
    });
  };

  const cancelEditAttendance = () => {
    setEditingAttendanceId(null);
    setAttendanceForm({ checkIn: "", checkOut: "" });
  };

  const saveAttendanceEdit = async (id: number) => {
    try {
      const response = await fetchWithAdminAuth(`/attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: attendanceForm.checkIn || undefined,
          checkOut: attendanceForm.checkOut ? attendanceForm.checkOut : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await loadData();
      cancelEditAttendance();
    } catch (saveError) {
      window.alert(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update attendance",
      );
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todayAttendances = records.filter((record) => {
      const checkIn = new Date(record.checkIn);
      return checkIn >= start && checkIn <= end;
    });

    const checkedInUserIds = new Set(
      todayAttendances.map((record) => record.userId),
    );
    const operationalUsers = users.filter(
      (item) =>
        !item.deletedAt &&
        item.isActive &&
        (item.role === "WORKER" ||
          item.role === "ENGINEER" ||
          item.role === "ACCOUNTANT"),
    );

    return {
      attendanceCount: checkedInUserIds.size,
      absentCount: operationalUsers.filter(
        (item) => !checkedInUserIds.has(item.id),
      ).length,
      openShiftCount: todayAttendances.filter((item) => !item.checkOut).length,
      lateCount: todayAttendances.filter((item) => (item.lateMinutes ?? 0) > 0)
        .length,
    };
  }, [records, users]);

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{text.title}</h1>
          </div>
          <div className="admin-header__actions">
            <DateTimeBadge />
            <LocaleSwitch />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/admin")}
            >
              {locale === "ar" ? "لوحة الإدارة" : "Admin"}
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2>{text.title}</h2>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadData()}
            >
              {copy.refresh}
            </button>
          </div>

          {loading ? <p>{text.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}

          <div className="admin-kpi-grid">
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.todayAttendance}</p>
              <p className="admin-kpi-card__value">{stats.attendanceCount}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.todayAbsence}</p>
              <p className="admin-kpi-card__value">{stats.absentCount}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.openShifts}</p>
              <p className="admin-kpi-card__value">{stats.openShiftCount}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.lateCases}</p>
              <p className="admin-kpi-card__value">{stats.lateCount}</p>
            </article>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.admin.id}</th>
                  <th>{copy.admin.name}</th>
                  <th>{copy.admin.role}</th>
                  <th>{text.shift}</th>
                  <th>{text.checkIn}</th>
                  <th>{text.checkOut}</th>
                  <th>{text.status}</th>
                  <th>{copy.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 80).map((record) => (
                  <tr key={record.id}>
                    <td>{record.id}</td>
                    <td>
                      {record.user?.fullName || record.user?.username || "-"}
                    </td>
                    <td>{record.user?.role || "-"}</td>
                    <td>{record.shift?.name || "-"}</td>
                    <td>
                      {editingAttendanceId === record.id ? (
                        <input
                          type="datetime-local"
                          value={attendanceForm.checkIn}
                          onChange={(event) =>
                            setAttendanceForm((prev) => ({
                              ...prev,
                              checkIn: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        new Date(record.checkIn).toLocaleString()
                      )}
                    </td>
                    <td>
                      {editingAttendanceId === record.id ? (
                        <input
                          type="datetime-local"
                          value={attendanceForm.checkOut}
                          onChange={(event) =>
                            setAttendanceForm((prev) => ({
                              ...prev,
                              checkOut: event.target.value,
                            }))
                          }
                        />
                      ) : record.checkOut ? (
                        new Date(record.checkOut).toLocaleString()
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {record.checkOut ? text.checkedOut : text.checkedIn}
                    </td>
                    <td>
                      {editingAttendanceId === record.id ? (
                        <>
                          <button
                            type="button"
                            className="auth-button"
                            onClick={() => void saveAttendanceEdit(record.id)}
                          >
                            {copy.save}
                          </button>
                          <button
                            type="button"
                            className="auth-button auth-button--ghost"
                            onClick={cancelEditAttendance}
                          >
                            {copy.admin.cancel}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="auth-button"
                          onClick={() => startEditAttendance(record)}
                        >
                          {copy.admin.edit}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && records.length === 0 ? (
            <p className="admin-muted">{text.noData}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
