import { useState, type FormEvent } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";

type ReportBlock = Record<string, unknown>;

type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  totals: {
    recordsCount: number;
    totalCartons: number;
    totalPieces: number;
    totalDowntimeMinutes: number;
  };
  byDay: Array<{
    date: string;
    totalCartons: number;
    totalPieces: number;
    recordsCount: number;
  }>;
};

type DailyReport = {
  day: string;
  dayStart: string;
  dayEnd: string;
  totals: {
    recordsCount: number;
    totalCartons: number;
    totalPieces: number;
    totalDowntimeMinutes: number;
  };
  byShift: Array<{
    shiftId: number | null;
    shiftName: string;
    totalCartons: number;
    totalPieces: number;
    recordsCount: number;
  }>;
};

type MonthlySalesReport = {
  month: string;
  totals: {
    totalInvoices: number;
    totalAmount: number;
    totalItemsQuantity: number;
  };
  byCustomer: Array<{
    customerId: number;
    customerName: string;
    invoicesCount: number;
    totalAmount: number;
    itemsQuantity: number;
  }>;
};

type YearlySalesReport = {
  year: number;
  totals: {
    totalInvoices: number;
    totalAmount: number;
    totalItemsQuantity: number;
  };
  byMonth: Array<{
    month: string;
    invoicesCount: number;
    totalAmount: number;
    itemsQuantity: number;
  }>;
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

export function ReportsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesReport | null>(
    null,
  );
  const [yearlySales, setYearlySales] = useState<YearlySalesReport | null>(
    null,
  );
  const [inventorySnapshot, setInventorySnapshot] =
    useState<ReportBlock | null>(null);
  const [filters, setFilters] = useState({
    day: "",
    week: "",
    month: "",
    year: "",
    threshold: "",
  });
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDailyReport = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("daily");

    try {
      const suffix = filters.day ? `?date=${encodeURIComponent(filters.day)}` : "";
      const response = await fetchWithAuth(`/reports/production/daily${suffix}`);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setDailyReport((await response.json()) as DailyReport);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load daily report",
      );
    } finally {
      setLoadingSection("");
    }
  };

  const loadWeeklyReport = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("weekly");

    try {
      const anchorDate = weekInputToDate(filters.week);
      const suffix = anchorDate
        ? `?date=${encodeURIComponent(anchorDate)}`
        : "";
      const response = await fetchWithAuth(
        `/reports/production/weekly${suffix}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setWeeklyReport((await response.json()) as WeeklyReport);
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
      setMonthlySales((await response.json()) as MonthlySalesReport);
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

  const loadYearlySales = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("yearly");

    try {
      const suffix = filters.year
        ? `?year=${encodeURIComponent(filters.year)}`
        : "";
      const response = await fetchWithAuth(`/reports/sales/yearly${suffix}`);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setYearlySales((await response.json()) as YearlySalesReport);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load yearly sales report",
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
            void loadDailyReport();
            void loadWeeklyReport();
            void loadMonthlySales();
            void loadYearlySales();
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
          <h2>{copy.reports.dailyProduction}</h2>
          <form
            className="module-form module-form--inline"
            onSubmit={loadDailyReport}
          >
            <label>
              {copy.reports.day}
              <input
                type="date"
                value={filters.day}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, day: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="auth-button">
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!dailyReport) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                try {
                  const doc = new jsPDF();
                  doc.setFontSize(14);
                  doc.text(copy.reports.dailyProduction, 14, 16);

                  autoTable(doc, {
                    startY: 22,
                    head: [["Shift", "Records", "Cartons", "Pieces"]],
                    body: dailyReport.byShift.map((row) => [
                      row.shiftName,
                      String(row.recordsCount),
                      String(row.totalCartons),
                      String(row.totalPieces),
                    ]),
                  });

                  doc.save(`daily-production-${dailyReport.day}.pdf`);
                } catch {
                  window.alert(copy.reports.pdfDownloadFailed);
                }
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </form>
          {loadingSection === "daily" ? <p>{copy.reports.loadingDaily}</p> : null}
          {dailyReport ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Shift</th>
                    <th>Records</th>
                    <th>Cartons</th>
                    <th>Pieces</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReport.byShift.map((row) => (
                    <tr key={row.shiftName}>
                      <td>{row.shiftName}</td>
                      <td>{row.recordsCount}</td>
                      <td>{row.totalCartons}</td>
                      <td>{row.totalPieces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <ReportView data={dailyReport} copy={copy} />
        </article>

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
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!weeklyReport) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                try {
                  const doc = new jsPDF();
                  doc.setFontSize(14);
                  doc.text(copy.reports.weeklyProduction, 14, 16);

                  autoTable(doc, {
                    startY: 22,
                    head: [["Date", "Records", "Cartons", "Pieces"]],
                    body: weeklyReport.byDay.map((row) => [
                      row.date,
                      String(row.recordsCount),
                      String(row.totalCartons),
                      String(row.totalPieces),
                    ]),
                  });

                  const finalY = (
                    doc as jsPDF & { lastAutoTable?: { finalY: number } }
                  ).lastAutoTable?.finalY;
                  doc.text(
                    `Total records: ${weeklyReport.totals.recordsCount}`,
                    14,
                    (finalY ?? 22) + 10,
                  );
                  doc.save(
                    `weekly-production-${weeklyReport.weekStart.slice(0, 10)}.pdf`,
                  );
                } catch {
                  window.alert(copy.reports.pdfDownloadFailed);
                }
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </form>
          {loadingSection === "weekly" ? (
            <p>{copy.reports.loadingWeekly}</p>
          ) : null}
          {weeklyReport ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Records</th>
                    <th>Cartons</th>
                    <th>Pieces</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyReport.byDay.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.recordsCount}</td>
                      <td>{row.totalCartons}</td>
                      <td>{row.totalPieces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!monthlySales) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                try {
                  const doc = new jsPDF();
                  doc.setFontSize(14);
                  doc.text(copy.reports.monthlySales, 14, 16);

                  autoTable(doc, {
                    startY: 22,
                    head: [["Customer", "Invoices", "Items", "Total"]],
                    body: monthlySales.byCustomer.map((row) => [
                      row.customerName,
                      String(row.invoicesCount),
                      String(row.itemsQuantity),
                      row.totalAmount.toLocaleString(),
                    ]),
                  });

                  doc.save(`monthly-sales-${monthlySales.month}.pdf`);
                } catch {
                  window.alert(copy.reports.pdfDownloadFailed);
                }
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </form>
          {loadingSection === "monthly" ? (
            <p>{copy.reports.loadingMonthly}</p>
          ) : null}
          {monthlySales ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Invoices</th>
                    <th>Items</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySales.byCustomer.map((row) => (
                    <tr key={row.customerId}>
                      <td>{row.customerName}</td>
                      <td>{row.invoicesCount}</td>
                      <td>{row.itemsQuantity}</td>
                      <td>{row.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <ReportView data={monthlySales} copy={copy} />
        </article>

        <article className="module-panel">
          <h2>{copy.reports.yearlySales}</h2>
          <form
            className="module-form module-form--inline"
            onSubmit={loadYearlySales}
          >
            <label>
              {copy.reports.year}
              <input
                type="number"
                min={2000}
                max={9999}
                value={filters.year}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, year: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="auth-button">
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!yearlySales) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                try {
                  const doc = new jsPDF();
                  doc.setFontSize(14);
                  doc.text(copy.reports.yearlySales, 14, 16);

                  autoTable(doc, {
                    startY: 22,
                    head: [["Month", "Invoices", "Items", "Total"]],
                    body: yearlySales.byMonth.map((row) => [
                      row.month,
                      String(row.invoicesCount),
                      String(row.itemsQuantity),
                      row.totalAmount.toLocaleString(),
                    ]),
                  });

                  doc.save(`yearly-sales-${yearlySales.year}.pdf`);
                } catch {
                  window.alert(copy.reports.pdfDownloadFailed);
                }
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </form>
          {loadingSection === "yearly" ? (
            <p>{copy.reports.loadingYearly}</p>
          ) : null}
          {yearlySales ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Invoices</th>
                    <th>Items</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySales.byMonth.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{row.invoicesCount}</td>
                      <td>{row.itemsQuantity}</td>
                      <td>{row.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <ReportView
            data={yearlySales as unknown as ReportBlock}
            copy={copy}
          />
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

function weekInputToDate(weekInput: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekInput.trim());
  if (!match) {
    return "";
  }

  const year = Number(match[1]);
  const week = Number(match[2]);

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4IsoDay = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4IsoDay + 1);

  const targetDate = new Date(week1Monday);
  targetDate.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  return targetDate.toISOString().slice(0, 10);
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
