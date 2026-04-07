import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type Shift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
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

export function ShiftsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    name: string;
    startTime: string;
    endTime: string;
  }>({
    name: "",
    startTime: "08:00",
    endTime: "16:00",
  });

  const pageText = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الشفتات",
            loading: "جارٍ تحميل الشفتات...",
            noData: "لا توجد شفتات",
          }
        : {
            title: "Shifts",
            loading: "Loading shifts...",
            noData: "No shifts available",
          },
    [locale],
  );

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/shifts");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setShifts((await response.json()) as Shift[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : pageText.loading,
      );
    } finally {
      setLoading(false);
    }
  }, [pageText.loading]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const startEditShift = (shift: Shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    setEditingShiftId(shift.id);
    setShiftForm({
      name: shift.name,
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    });
  };

  const cancelEditShift = () => {
    setEditingShiftId(null);
    setShiftForm({
      name: "",
      startTime: "08:00",
      endTime: "16:00",
    });
  };

  const saveShiftEdit = async (id: number) => {
    try {
      const response = await fetchWithAdminAuth(`/shifts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: shiftForm.name,
          startTime: `1970-01-01T${shiftForm.startTime}:00.000Z`,
          endTime: `1970-01-01T${shiftForm.endTime}:00.000Z`,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const updated = (await response.json()) as { id: number; name: string };

      setShifts((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                name: shiftForm.name,
                startTime: `1970-01-01T${shiftForm.startTime}:00.000Z`,
                endTime: `1970-01-01T${shiftForm.endTime}:00.000Z`,
              }
            : item,
        ),
      );

      cancelEditShift();
    } catch (saveError) {
      window.alert(
        saveError instanceof Error ? saveError.message : "Failed to update",
      );
    }
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{pageText.title}</h1>
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
            <h2>{pageText.title}</h2>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadShifts()}
            >
              {copy.refresh}
            </button>
          </div>

          {loading ? <p>{pageText.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}
          {!loading && shifts.length === 0 ? (
            <p className="admin-muted">{pageText.noData}</p>
          ) : null}

          {shifts.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{copy.admin.id}</th>
                    <th>{copy.admin.name}</th>
                    <th>{copy.admin.shiftStart}</th>
                    <th>{copy.admin.shiftEnd}</th>
                    <th>{copy.admin.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        {editingShiftId === item.id ? (
                          <input
                            value={shiftForm.name}
                            onChange={(event) =>
                              setShiftForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td>
                        {editingShiftId === item.id ? (
                          <input
                            type="time"
                            value={shiftForm.startTime}
                            onChange={(event) =>
                              setShiftForm((prev) => ({
                                ...prev,
                                startTime: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          new Date(item.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        )}
                      </td>
                      <td>
                        {editingShiftId === item.id ? (
                          <input
                            type="time"
                            value={shiftForm.endTime}
                            onChange={(event) =>
                              setShiftForm((prev) => ({
                                ...prev,
                                endTime: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          new Date(item.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        )}
                      </td>
                      <td>
                        {editingShiftId === item.id ? (
                          <>
                            <button
                              type="button"
                              className="auth-button"
                              onClick={() => void saveShiftEdit(item.id)}
                            >
                              {copy.save}
                            </button>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost"
                              onClick={cancelEditShift}
                            >
                              {copy.admin.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="auth-button"
                            onClick={() => startEditShift(item)}
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
          ) : null}
        </section>
      </section>
    </main>
  );
}
