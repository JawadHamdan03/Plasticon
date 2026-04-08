import { useCallback, useEffect, useMemo, useState } from "react";
import { ModulePageShell } from "../components/ModulePageShell";
import { TruckLoader } from "../components/TruckLoader";
import { appCopy } from "../content/appCopy";
import { useLocale } from "../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../lib/api";

type PayrollRecord = {
  id: number;
  month: string;
  totalHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimeSalary: number;
  totalSalary: number;
  calculatedAt: string;
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

export function MyPayrollPage() {
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const t = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "رواتبي",
            subtitle: "راجع سجلات الرواتب الخاصة بك حسب الأشهر.",
            loading: "جارٍ تحميل بيانات الرواتب...",
            noData: "لا توجد سجلات رواتب.",
          }
        : {
            title: "My Payroll",
            subtitle: "Review your payroll records by month.",
            loading: "Loading payroll records...",
            noData: "No payroll records found.",
          },
    [locale],
  );

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/payroll/me");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setRecords(((await response.json()) as PayrollRecord[]) ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load payroll",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayroll();
  }, [loadPayroll]);

  return (
    <ModulePageShell
      title={t.title}
      subtitle={t.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            void loadPayroll();
          }}
        >
          {copy.refresh}
        </button>
      }
    >
      <div className="module-summary-bar">
        <span>{copy.admin.recordsShown}</span>
        <strong>{records.length}</strong>
      </div>

      <section className="module-panel module-panel--full">
        <h2>{copy.admin.payrollTitle}</h2>
        {loading ? <TruckLoader /> : null}
        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}
        {!loading && records.length === 0 ? <p>{t.noData}</p> : null}

        <div className="module-list">
          {records.map((record) => (
            <div className="module-row" key={record.id}>
              <strong>{record.month}</strong>
              <span>
                {copy.admin.totalHours}: {record.totalHours} •{" "}
                {copy.admin.overtimeHours}: {record.overtimeHours}
              </span>
              <small>
                {copy.admin.baseSalary}: {record.baseSalary.toLocaleString()} •{" "}
                {copy.admin.overtimeSalary}:{" "}
                {record.overtimeSalary.toLocaleString()}
              </small>
              <small>
                {copy.admin.totalPayout}: {record.totalSalary.toLocaleString()}{" "}
                • {copy.admin.calculatedAt}:{" "}
                {new Date(record.calculatedAt).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </section>
    </ModulePageShell>
  );
}
