import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type PayrollRecord = {
  id: number;
  month: string;
  totalSalary: number;
  totalHours?: number;
  overtimeHours?: number;
  baseSalary?: number;
  overtimeSalary?: number;
  user?: {
    fullName: string;
    username: string;
    role: string;
  };
};

type PayrollAdminOverview = {
  totals: {
    payrollCount: number;
    totalBaseSalary: number;
    totalOvertimeSalary: number;
    totalPayout: number;
  };
  byRole: Array<{ role: string; payrollCount: number; totalPayout: number }>;
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

export function PayrollAdminPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [overview, setOverview] = useState<PayrollAdminOverview | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingPayrollId, setEditingPayrollId] = useState<number | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    month: "",
    totalHours: "",
    overtimeHours: "",
    baseSalary: "",
    overtimeSalary: "",
    totalSalary: "",
  });

  const text = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الرواتب",
            loading: "جارٍ تحميل بيانات الرواتب...",
            noData: "لا توجد بيانات رواتب",
            byRole: "حسب الدور",
            recent: "آخر الرواتب",
          }
        : {
            title: "Payroll",
            loading: "Loading payroll...",
            noData: "No payroll data",
            byRole: "By role",
            recent: "Recent payrolls",
          },
    [locale],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, listResponse] = await Promise.all([
        fetchWithAdminAuth("/payroll/admin/overview"),
        fetchWithAdminAuth("/payroll"),
      ]);
      if (!overviewResponse.ok) {
        throw new Error(await readApiError(overviewResponse));
      }
      if (!listResponse.ok) {
        throw new Error(await readApiError(listResponse));
      }
      setOverview((await overviewResponse.json()) as PayrollAdminOverview);
      setRecords(((await listResponse.json()) as PayrollRecord[]) ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loading);
    } finally {
      setLoading(false);
    }
  }, [text.loading]);

  const startEditPayroll = (record: PayrollRecord) => {
    setEditingPayrollId(record.id);
    setPayrollForm({
      month: record.month,
      totalHours: String(
        (record as PayrollRecord & { totalHours?: number }).totalHours ?? "",
      ),
      overtimeHours: String(
        (record as PayrollRecord & { overtimeHours?: number }).overtimeHours ??
          "",
      ),
      baseSalary: String(
        (record as PayrollRecord & { baseSalary?: number }).baseSalary ?? "",
      ),
      overtimeSalary: String(
        (record as PayrollRecord & { overtimeSalary?: number })
          .overtimeSalary ?? "",
      ),
      totalSalary: String(record.totalSalary ?? ""),
    });
  };

  const cancelEditPayroll = () => {
    setEditingPayrollId(null);
    setPayrollForm({
      month: "",
      totalHours: "",
      overtimeHours: "",
      baseSalary: "",
      overtimeSalary: "",
      totalSalary: "",
    });
  };

  const savePayrollEdit = async (id: number) => {
    try {
      const response = await fetchWithAdminAuth(`/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: payrollForm.month,
          totalHours: Number(payrollForm.totalHours),
          overtimeHours: Number(payrollForm.overtimeHours),
          baseSalary: Number(payrollForm.baseSalary),
          overtimeSalary: Number(payrollForm.overtimeSalary),
          totalSalary: Number(payrollForm.totalSalary),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await loadData();
      cancelEditPayroll();
    } catch (saveError) {
      window.alert(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update payroll",
      );
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
              <p className="admin-kpi-card__label">
                {locale === "ar" ? "عدد السجلات" : "Payroll records"}
              </p>
              <p className="admin-kpi-card__value">
                {overview?.totals.payrollCount ?? records.length}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{copy.admin.baseSalary}</p>
              <p className="admin-kpi-card__value admin-kpi-card__value--small">
                {(overview?.totals.totalBaseSalary ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">
                {copy.admin.overtimeSalary}
              </p>
              <p className="admin-kpi-card__value admin-kpi-card__value--small">
                {(overview?.totals.totalOvertimeSalary ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{copy.admin.totalPayout}</p>
              <p className="admin-kpi-card__value admin-kpi-card__value--small">
                {(overview?.totals.totalPayout ?? 0).toLocaleString()}
              </p>
            </article>
          </div>

          <div className="admin-grid">
            <article className="admin-panel">
              <h3>{text.byRole}</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{copy.admin.role}</th>
                      <th>{locale === "ar" ? "عدد السجلات" : "Records"}</th>
                      <th>{copy.admin.totalPayout}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.byRole ?? []).map((item) => (
                      <tr key={item.role}>
                        <td>{item.role}</td>
                        <td>{item.payrollCount}</td>
                        <td>{item.totalPayout.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="admin-panel">
              <h3>{text.recent}</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{copy.admin.name}</th>
                      <th>{copy.admin.role}</th>
                      <th>Month</th>
                      <th>{copy.admin.totalPayout}</th>
                      <th>{locale === "ar" ? "التفاصيل" : "Details"}</th>
                      <th>{copy.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 40).map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.user?.fullName || item.user?.username || "-"}
                        </td>
                        <td>{item.user?.role || "-"}</td>
                        <td>
                          {editingPayrollId === item.id ? (
                            <input
                              value={payrollForm.month}
                              onChange={(event) =>
                                setPayrollForm((prev) => ({
                                  ...prev,
                                  month: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            item.month
                          )}
                        </td>
                        <td>
                          {editingPayrollId === item.id ? (
                            <input
                              type="number"
                              value={payrollForm.totalSalary}
                              onChange={(event) =>
                                setPayrollForm((prev) => ({
                                  ...prev,
                                  totalSalary: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            item.totalSalary.toLocaleString()
                          )}
                        </td>
                        <td>
                          {editingPayrollId === item.id ? (
                            <div style={{ display: "grid", gap: "6px" }}>
                              <input
                                type="number"
                                placeholder={copy.admin.totalHours}
                                value={payrollForm.totalHours}
                                onChange={(event) =>
                                  setPayrollForm((prev) => ({
                                    ...prev,
                                    totalHours: event.target.value,
                                  }))
                                }
                              />
                              <input
                                type="number"
                                placeholder={copy.admin.overtimeHours}
                                value={payrollForm.overtimeHours}
                                onChange={(event) =>
                                  setPayrollForm((prev) => ({
                                    ...prev,
                                    overtimeHours: event.target.value,
                                  }))
                                }
                              />
                              <input
                                type="number"
                                placeholder={copy.admin.baseSalary}
                                value={payrollForm.baseSalary}
                                onChange={(event) =>
                                  setPayrollForm((prev) => ({
                                    ...prev,
                                    baseSalary: event.target.value,
                                  }))
                                }
                              />
                              <input
                                type="number"
                                placeholder={copy.admin.overtimeSalary}
                                value={payrollForm.overtimeSalary}
                                onChange={(event) =>
                                  setPayrollForm((prev) => ({
                                    ...prev,
                                    overtimeSalary: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {editingPayrollId === item.id ? (
                            <>
                              <button
                                type="button"
                                className="auth-button"
                                onClick={() => void savePayrollEdit(item.id)}
                              >
                                {copy.save}
                              </button>
                              <button
                                type="button"
                                className="auth-button auth-button--ghost"
                                onClick={cancelEditPayroll}
                              >
                                {copy.admin.cancel}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="auth-button"
                              onClick={() => startEditPayroll(item)}
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
            </article>
          </div>

          {!loading && records.length === 0 ? (
            <p className="admin-muted">{copy.admin.noPayrolls}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
