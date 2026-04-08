import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { UserAvatarBadge } from "../components/UserAvatarBadge";
import { TruckLoader } from "../components/TruckLoader";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type ShiftConsumptionRow = {
  date: string;
  day: string;
  shiftId: number;
  shiftName: string;
  meterReadingKwh: number | null;
  consumedKwh: number | null;
  costIls: number | null;
  recordedAt: string | null;
};

type DayConsumptionRow = {
  date: string;
  day: string;
  totalConsumedKwh: number;
  totalCostIls: number;
  recordedShiftCount: number;
  missingShiftCount: number;
};

type ShiftConsumptionReport = {
  tariffPerKwh: number;
  range: {
    fromDate: string;
    toDate: string;
  };
  shifts: ShiftConsumptionRow[];
  days: DayConsumptionRow[];
  summary: {
    totalConsumedKwh: number;
    totalCostIls: number;
    totalShiftRows: number;
    missingReadings: number;
  };
};

const tokenKey = "plasticon_token";

const downloadCsv = (filename: string, header: string[], rows: string[][]) => {
  const escapeCsv = (value: string) => {
    const safe = value.replace(/"/g, '""');
    return `"${safe}"`;
  };

  const csv = [header, ...rows]
    .map((line) => line.map((item) => escapeCsv(item)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

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

export function SettingsElectricityPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const text = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الكهرباء",
            subtitle:
              "تقرير استهلاك الكهرباء حسب الشفت من عداد مشترك، مع إجمالي اليوم والتكلفة.",
            fromDate: "من تاريخ",
            toDate: "إلى تاريخ",
            applyFilter: "تطبيق الفلترة",
            clearFilter: "مسح الفلترة",
            loading: "جارٍ تحميل التقرير...",
            totalRows: "إجمالي صفوف الشفت",
            totalKwh: "إجمالي kWh",
            totalCost: "إجمالي التكلفة",
            missingShifts: "الشفتات الناقصة",
            reportDate: "التاريخ",
            reportDay: "اليوم",
            reportShift: "الشفت",
            reportMeter: "قراءة العداد (kWh)",
            reportKwh: "استهلاك الشفت (kWh)",
            reportCost: "تكلفة الشفت",
            reportRecordedAt: "وقت التسجيل",
            exportCostReportCsv: "تصدير CSV",
            noData: "لا توجد بيانات ضمن الفترة الحالية.",
            tariff: "التسعيرة الحالية",
            electricityTabBack: "العودة إلى تبويبات الإعدادات",
            noReading: "غير مسجل",
            shiftDetails: "تفاصيل استهلاك الشفتات",
            dailyTotals: "إجمالي كل يوم",
          }
        : {
            title: "electry",
            subtitle:
              "Shared meter report by shift with daily total consumption and cost.",
            fromDate: "From date",
            toDate: "To date",
            applyFilter: "Apply filter",
            clearFilter: "Clear filter",
            loading: "Loading report...",
            totalRows: "Total shift rows",
            totalKwh: "Total kWh",
            totalCost: "Total cost",
            missingShifts: "Missing shifts",
            reportDate: "Date",
            reportDay: "Day",
            reportShift: "Shift",
            reportMeter: "Meter reading (kWh)",
            reportKwh: "Shift consumption (kWh)",
            reportCost: "Shift cost",
            reportRecordedAt: "Recorded at",
            exportCostReportCsv: "Export CSV",
            noData: "No data in the selected range.",
            tariff: "Current tariff",
            electricityTabBack: "Back to Settings tabs",
            noReading: "Missing",
            shiftDetails: "Shift consumption details",
            dailyTotals: "Daily totals",
          },
    [locale],
  );

  const [report, setReport] = useState<ShiftConsumptionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (fromDate) {
        params.set("fromDate", fromDate);
      }
      if (toDate) {
        params.set("toDate", toDate);
      }

      const response = await fetchWithAdminAuth(
        `/settings/snapshots/shift-consumption?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setReport((await response.json()) as ShiftConsumptionReport);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loading);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, text.loading, toDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const view = useMemo(() => {
    if (!report) {
      return {
        tariffPerKwh: 0,
        totalRows: 0,
        totalKwh: 0,
        totalCost: 0,
        missingShifts: 0,
        shiftRows: [] as ShiftConsumptionRow[],
        dayRows: [] as DayConsumptionRow[],
      };
    }

    return {
      tariffPerKwh: report.tariffPerKwh,
      totalRows: report.summary.totalShiftRows,
      totalKwh: report.summary.totalConsumedKwh,
      totalCost: report.summary.totalCostIls,
      missingShifts: report.summary.missingReadings,
      shiftRows: report.shifts,
      dayRows: report.days,
    };
  }, [report]);

  const exportCsv = () => {
    const rows = view.shiftRows.map((row) => [
      row.date,
      row.day,
      row.shiftName,
      row.meterReadingKwh === null ? "" : row.meterReadingKwh.toFixed(2),
      row.consumedKwh === null ? "" : row.consumedKwh.toFixed(2),
      row.costIls === null ? "" : row.costIls.toFixed(2),
      row.recordedAt ?? "",
    ]);

    downloadCsv(
      `electricity-shift-report-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "date",
        "day",
        "shift",
        "meterReadingKwh",
        "consumedKwh",
        "costIls",
        "recordedAt",
      ],
      rows,
    );
  };

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
            <UserAvatarBadge size="sm" />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/admin/settings")}
            >
              {text.electricityTabBack}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
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
          <div className="settings-hero">
            <div>
              <h2>{text.title}</h2>
              <p>{text.subtitle}</p>
            </div>
            <div className="settings-hero__chips">
              <span className="settings-chip">
                {text.tariff}: {view.tariffPerKwh.toFixed(2)} ILS/kWh
              </span>
            </div>
          </div>

          <div className="admin-filter-bar">
            <label>
              {text.fromDate}
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label>
              {text.toDate}
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
            <div className="settings-filter-actions">
              <button
                type="button"
                className="auth-button"
                onClick={() => {
                  void loadReport();
                }}
              >
                {text.applyFilter}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                {text.clearFilter}
              </button>
            </div>
          </div>

          <div className="admin-section__head">
            <div>
              <h2>
                {locale === "ar" ? "ملخص الكهرباء" : "Electricity Summary"}
              </h2>
              <p className="admin-muted">
                {loading
                  ? text.loading
                  : `${view.totalRows} ${text.totalRows.toLowerCase()}`}
              </p>
            </div>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={exportCsv}
              disabled={!view.shiftRows.length}
            >
              {text.exportCostReportCsv}
            </button>
          </div>

          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}

          {loading ? <TruckLoader /> : null}

          <div className="settings-electricity-report-grid">
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.totalRows}</p>
              <p className="admin-kpi-card__value">{view.totalRows}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.totalKwh}</p>
              <p className="admin-kpi-card__value">
                {view.totalKwh.toFixed(2)}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.totalCost}</p>
              <p className="admin-kpi-card__value">
                {view.totalCost.toFixed(2)}
              </p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-card__label">{text.missingShifts}</p>
              <p className="admin-kpi-card__value">{view.missingShifts}</p>
            </article>
          </div>

          <div className="settings-system-layout">
            <div className="settings-electricity-table-wrap">
              <h3>{text.shiftDetails}</h3>
              <table className="settings-electricity-table">
                <thead>
                  <tr>
                    <th>{text.reportDate}</th>
                    <th>{text.reportDay}</th>
                    <th>{text.reportShift}</th>
                    <th>{text.reportMeter}</th>
                    <th>{text.reportKwh}</th>
                    <th>{text.reportCost}</th>
                    <th>{text.reportRecordedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.shiftRows.map((row, index) => (
                    <tr key={`${row.date}-${row.shiftId}-${index}`}>
                      <td>{row.date}</td>
                      <td>{row.day}</td>
                      <td>{row.shiftName}</td>
                      <td>
                        {row.meterReadingKwh === null
                          ? text.noReading
                          : row.meterReadingKwh.toFixed(2)}
                      </td>
                      <td>
                        {row.consumedKwh === null
                          ? text.noReading
                          : row.consumedKwh.toFixed(2)}
                      </td>
                      <td>
                        {row.costIls === null
                          ? text.noReading
                          : row.costIls.toFixed(2)}
                      </td>
                      <td>
                        {row.recordedAt
                          ? new Date(row.recordedAt).toLocaleString()
                          : text.noReading}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="admin-panel settings-side-panel">
              <h3>{text.dailyTotals}</h3>
              {view.dayRows.length ? (
                <div className="settings-electricity-table-wrap">
                  <table className="settings-electricity-table">
                    <thead>
                      <tr>
                        <th>{text.reportDate}</th>
                        <th>{text.reportDay}</th>
                        <th>{text.reportKwh}</th>
                        <th>{text.reportCost}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.dayRows.map((row) => (
                        <tr key={row.date}>
                          <td>{row.date}</td>
                          <td>{row.day}</td>
                          <td>{row.totalConsumedKwh.toFixed(2)}</td>
                          <td>{row.totalCostIls.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-muted">{text.noData}</p>
              )}
            </aside>
          </div>
        </section>
      </section>
    </main>
  );
}
