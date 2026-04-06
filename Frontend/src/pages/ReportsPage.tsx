import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";

type ReportBlock = Record<string, unknown>;

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

export function ReportsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const [weeklyReport, setWeeklyReport] = useState<ReportBlock | null>(null);
  const [monthlySales, setMonthlySales] = useState<ReportBlock | null>(null);
  const [inventorySnapshot, setInventorySnapshot] =
    useState<ReportBlock | null>(null);
  const [filters, setFilters] = useState({
    week: "",
    month: "",
    threshold: "",
  });
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadWeeklyReport = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("weekly");

    try {
      const suffix = filters.week
        ? `?week=${encodeURIComponent(filters.week)}`
        : "";
      const response = await fetchWithAuth(
        `/reports/production/weekly${suffix}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setWeeklyReport((await response.json()) as ReportBlock);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load weekly report",
      );
    } finally {
      setLoadingSection("");
    }
  };

  const loadMonthlySales = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("monthly");

    try {
      const suffix = filters.month
        ? `?month=${encodeURIComponent(filters.month)}`
        : "";
      const response = await fetchWithAuth(`/reports/sales/monthly${suffix}`);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setMonthlySales((await response.json()) as ReportBlock);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load monthly sales report",
      );
    } finally {
      setLoadingSection("");
    }
  };

  const loadInventorySnapshot = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("inventory");

    try {
      const suffix = filters.threshold
        ? `?threshold=${encodeURIComponent(filters.threshold)}`
        : "";
      const response = await fetchWithAuth(
        `/reports/inventory/snapshot${suffix}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setInventorySnapshot((await response.json()) as ReportBlock);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load inventory snapshot",
      );
    } finally {
      setLoadingSection("");
    }
  };

  return (
    <ModulePageShell
      title={copy.reports.title}
      subtitle={copy.reports.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            void loadWeeklyReport();
            void loadMonthlySales();
            void loadInventorySnapshot();
          }}
        >
          {copy.refreshAll}
        </button>
      }
    >
      {user?.role === "ADMIN" || user?.role === "ACCOUNTANT" ? null : (
        <div className="auth-alert auth-alert--error">
          {copy.reports.adminNotice}
        </div>
      )}

      <div className="module-summary-bar">
        <span>{copy.reports.summaryLabel}</span>
        <strong>{copy.reports.loaded}</strong>
      </div>

      <section className="module-grid module-grid--reports">
        <article className="module-panel">
          <h2>{copy.reports.weeklyProduction}</h2>
          <form
            className="module-form module-form--inline"
            onSubmit={loadWeeklyReport}
          >
            <label>
              {copy.reports.week}
              <input
                type="week"
                value={filters.week}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, week: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="auth-button">
              {copy.load}
            </button>
          </form>
          {loadingSection === "weekly" ? (
            <p>{copy.reports.loadingWeekly}</p>
          ) : null}
          <ReportView data={weeklyReport} copy={copy} />
        </article>

        <article className="module-panel">
          <h2>{copy.reports.monthlySales}</h2>
          <form
            className="module-form module-form--inline"
            onSubmit={loadMonthlySales}
          >
            <label>
              {copy.reports.month}
              <input
                type="month"
                value={filters.month}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, month: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="auth-button">
              {copy.load}
            </button>
          </form>
          {loadingSection === "monthly" ? (
            <p>{copy.reports.loadingMonthly}</p>
          ) : null}
          <ReportView data={monthlySales} copy={copy} />
        </article>

        <article className="module-panel module-panel--full">
          <h2>{copy.reports.inventorySnapshot}</h2>
          <form
            className="module-form module-form--inline"
            onSubmit={loadInventorySnapshot}
          >
            <label>
              {copy.reports.threshold}
              <input
                type="number"
                min={0}
                step="0.01"
                value={filters.threshold}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    threshold: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" className="auth-button">
              {copy.load}
            </button>
          </form>
          {loadingSection === "inventory" ? (
            <p>{copy.reports.loadingInventory}</p>
          ) : null}
          <ReportView data={inventorySnapshot} copy={copy} />
        </article>
      </section>

      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}

function ReportView({
  data,
  copy,
}: {
  data: ReportBlock | null;
  copy: (typeof appCopy)["en"];
}) {
  if (!data) {
    return <p className="module-empty">{copy.reports.noReport}</p>;
  }

  const entries = Object.entries(data);

  return (
    <div className="module-report-grid">
      {entries.map(([key, value]) => (
        <div className="module-report-card" key={key}>
          <span>{key}</span>
          <strong>{prettyValueLocalized(value, copy)}</strong>
        </div>
      ))}
    </div>
  );
}

function prettyValueLocalized(value: unknown, copy: (typeof appCopy)["en"]) {
  if (Array.isArray(value)) {
    return `${value.length} ${copy.reports.items}`;
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? copy.reports.yes : copy.reports.no;
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value ?? "-");
}
