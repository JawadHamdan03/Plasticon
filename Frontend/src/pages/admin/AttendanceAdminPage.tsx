import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";

type AttendanceRecord = {
  id: number;
  userId: number;
  checkIn: string;
  checkOut?: string | null;
  lateMinutes?: number;
  overtimeMinutes?: number;
  user?: {
    fullName: string;
    username: string;
    role: string;
  };
  shift?: { id: number; name: string } | null;
};

type AdminUser = {
  id: number;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  isActive: boolean;
  deletedAt?: string | null;
};

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

export function AttendanceAdminPage() {
  const { user } = useAuth();
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
  const [filterDate, setFilterDate] = useState("");
  const [filterShiftId, setFilterShiftId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

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
            durationMinutes: "مدة الدوام (دقيقة)",
            lateMinutes: "دقائق التأخير",
            overtimeMinutes: "دقائق الإضافي",
            filters: "فلترة",
            allShifts: "كل الشفتات",
            allEmployees: "كل الموظفين",
            delete: "حذف",
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
            durationMinutes: "Worked minutes",
            lateMinutes: "Late minutes",
            overtimeMinutes: "Overtime minutes",
            filters: "Filters",
            allShifts: "All shifts",
            allEmployees: "All employees",
            delete: "Delete",
          },
    [locale],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (filterDate) query.set("date", filterDate);
      if (filterShiftId) query.set("shiftId", filterShiftId);
      if (filterUserId) query.set("userId", filterUserId);

      const attendancePath = query.toString()
        ? `/attendance/all?${query.toString()}`
        : "/attendance/all";

      const attendanceResponse = await fetchWithAdminAuth(attendancePath);
      if (!attendanceResponse.ok) {
        throw new Error(await readApiError(attendanceResponse));
      }

      if (user?.role === "ADMIN") {
        const usersResponse = await fetchWithAdminAuth("/users/all");
        if (usersResponse.ok) {
          setUsers((await usersResponse.json()) as AdminUser[]);
        }
      }

      setRecords(
        ((await attendanceResponse.json()) as AttendanceRecord[]) ?? [],
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loading);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterShiftId, filterUserId, text.loading, user?.role]);

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

  const deleteAttendanceRecord = async (id: number) => {
    const confirmed = window.confirm(
      locale === "ar"
        ? "هل أنت متأكد من حذف سجل الحضور؟"
        : "Are you sure you want to delete this attendance record?",
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAdminAuth(`/attendance/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadData();
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete attendance",
      );
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const durationMinutesForRecord = (record: AttendanceRecord) => {
    if (!record.checkOut) {
      return 0;
    }
    const checkIn = new Date(record.checkIn).getTime();
    const checkOut = new Date(record.checkOut).getTime();
    if (Number.isNaN(checkIn) || Number.isNaN(checkOut) || checkOut < checkIn) {
      return 0;
    }
    return Math.floor((checkOut - checkIn) / 60000);
  };

  const shiftOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const record of records) {
      if (record.shift?.id && record.shift?.name) {
        map.set(record.shift.id, record.shift.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  const employeeOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const record of records) {
      if (!record.userId) {
        continue;
      }
      const label = record.user
        ? `${record.user.fullName || record.user.username} (${record.user.role})`
        : `#${record.userId}`;
      map.set(record.userId, label);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [records]);

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
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void loadData()}
            >
              {copy.refresh}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-grid" style={{ marginBottom: 12 }}>
            <article className="admin-panel">
              <h3>{text.filters}</h3>
              <div
                className="admin-panel-body"
                style={{ display: "grid", gap: ".625rem" }}
              >
                <input
                  type="date"
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                />
                <select
                  value={filterShiftId}
                  onChange={(event) => setFilterShiftId(event.target.value)}
                >
                  <option value="">{text.allShifts}</option>
                  {shiftOptions.map((shiftItem) => (
                    <option key={shiftItem.id} value={shiftItem.id}>
                      {shiftItem.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterUserId}
                  onChange={(event) => setFilterUserId(event.target.value)}
                >
                  <option value="">{text.allEmployees}</option>
                  {employeeOptions.map((userItem) => (
                    <option key={userItem.id} value={userItem.id}>
                      {userItem.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--outline-gray btn--sm"
                  onClick={() => {
                    setFilterDate("");
                    setFilterShiftId("");
                    setFilterUserId("");
                  }}
                >
                  {locale === "ar" ? "إعادة تعيين" : "Reset Filters"}
                </button>
              </div>
            </article>
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
                  <th>{text.durationMinutes}</th>
                  <th>{text.lateMinutes}</th>
                  <th>{text.overtimeMinutes}</th>
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
                    <td>{durationMinutesForRecord(record)}</td>
                    <td>{record.lateMinutes ?? 0}</td>
                    <td>{record.overtimeMinutes ?? 0}</td>
                    <td>
                      {record.checkOut ? text.checkedOut : text.checkedIn}
                    </td>
                    <td>
                      {editingAttendanceId === record.id ? (
                        <div className="attendance-row-actions">
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
                        </div>
                      ) : (
                        <div className="attendance-row-actions">
                          <button
                            type="button"
                            className="auth-button"
                            onClick={() => startEditAttendance(record)}
                          >
                            {copy.admin.edit}
                          </button>
                          <button
                            type="button"
                            className="auth-button auth-button--ghost"
                            onClick={() =>
                              void deleteAttendanceRecord(record.id)
                            }
                          >
                            {text.delete}
                          </button>
                        </div>
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
