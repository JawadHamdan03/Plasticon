import { useState, type FormEvent } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";

type ReportBlock = Record<string, unknown>;

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

type PeriodFilters = {
  period: ReportPeriod;
  date: string;
  month: string;
  year: string;
};

type ProductionActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    totalCartons: number;
    totalPieces: number;
    totalDowntimeMinutes: number;
  };
  records: Array<{
    id: number;
    createdAt: string;
    machineName: string;
    machineType: string;
    shiftName: string;
    userName: string;
    username: string;
    cartonsCount: number;
    piecesPerCarton: number;
    totalPieces: number;
    downtimeMinutes: number;
    hourSlot: string;
    notes: string | null;
  }>;
};

type InventoryActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    inCount: number;
    outCount: number;
    totalInQuantity: number;
    totalOutQuantity: number;
  };
  records: Array<{
    id: number;
    createdAt: string;
    materialName: string;
    materialUnit: string;
    type: string;
    quantity: number;
    referenceType: string;
    referenceId: number | null;
    createdByName: string | null;
    createdByUsername: string | null;
  }>;
};

type AttendanceActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    checkedOutCount: number;
    openCount: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
    absentCount: number;
  };
  absentUsers: Array<{
    id: number;
    fullName: string;
    username: string;
    role: string;
  }>;
  records: Array<{
    id: number;
    checkIn: string;
    checkOut: string | null;
    lateMinutes: number;
    overtimeMinutes: number;
    userId: number;
    userName: string;
    username: string;
    role: string;
    shiftName: string | null;
  }>;
};

type PayrollActivityReport = {
  period: ReportPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    recordsCount: number;
    totalBaseSalary: number;
    totalOvertimeSalary: number;
    totalPayout: number;
  };
  records: Array<{
    id: number;
    month: string;
    calculatedAt: string;
    userId: number;
    userName: string;
    username: string;
    role: string;
    totalHours: number;
    overtimeHours: number;
    baseSalary: number;
    overtimeSalary: number;
    totalSalary: number;
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
  const isArabic = locale === "ar";
  const reportText = {
    period: copy.reports.period,
    generatedAt: copy.reports.generatedAt,
    date: isArabic ? "التاريخ" : "Date",
    machine: isArabic ? "الماكينة" : "Machine",
    shift: isArabic ? "الشفت" : "Shift",
    user: isArabic ? "المستخدم" : "User",
    records: isArabic ? "السجلات" : "Records",
    cartons: isArabic ? "الكرتونات" : "Cartons",
    pieces: isArabic ? "القطع" : "Pieces",
    customer: isArabic ? "العميل" : "Customer",
    invoices: isArabic ? "الفواتير" : "Invoices",
    items: isArabic ? "العناصر" : "Items",
    total: isArabic ? "الإجمالي" : "Total",
    material: isArabic ? "المادة" : "Material",
    type: isArabic ? "النوع" : "Type",
    qty: isArabic ? "الكمية" : "Qty",
    reference: isArabic ? "المرجع" : "Reference",
    checkIn: isArabic ? "الدخول" : "Check In",
    checkOut: isArabic ? "الخروج" : "Check Out",
    late: isArabic ? "التأخير" : "Late",
    overtime: isArabic ? "الإضافي" : "OT",
    month: isArabic ? "الشهر" : "Month",
    hours: isArabic ? "الساعات" : "Hours",
    overtimeHours: isArabic ? "ساعات الإضافي" : "OT Hours",
  };
  const [productionActivity, setProductionActivity] =
    useState<ProductionActivityReport | null>(null);
  const [inventoryActivity, setInventoryActivity] =
    useState<InventoryActivityReport | null>(null);
  const [attendanceActivity, setAttendanceActivity] =
    useState<AttendanceActivityReport | null>(null);
  const [payrollActivity, setPayrollActivity] =
    useState<PayrollActivityReport | null>(null);
  const [inventorySnapshot, setInventorySnapshot] =
    useState<ReportBlock | null>(null);
  const [inventoryThreshold, setInventoryThreshold] = useState("");
  const [productionFilters, setProductionFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [inventoryFilters, setInventoryFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [attendanceFilters, setAttendanceFilters] = useState<PeriodFilters>({
    period: "daily",
    date: "",
    month: "",
    year: "",
  });
  const [payrollFilters, setPayrollFilters] = useState<PeriodFilters>({
    period: "monthly",
    date: "",
    month: "",
    year: "",
  });
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const buildPeriodParams = (filters: PeriodFilters) => {
    const params = new URLSearchParams({ period: filters.period });

    if (filters.period === "daily" || filters.period === "weekly") {
      if (filters.date) {
        params.set("date", filters.date);
      }
    }

    if (filters.period === "monthly" && filters.month) {
      params.set("month", filters.month);
    }

    if (filters.period === "yearly" && filters.year) {
      params.set("year", filters.year);
    }

    return params.toString();
  };

  const loadActivityReport = async <TReport,>(
    path: string,
    setState: (value: TReport | null) => void,
    loadingKey: string,
    filtersValue: PeriodFilters,
    fallbackMessage: string,
  ) => {
    setErrorMessage("");
    setLoadingSection(loadingKey);

    try {
      const suffix = buildPeriodParams(filtersValue);
      const response = await fetchWithAuth(suffix ? `${path}?${suffix}` : path);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setState((await response.json()) as TReport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setLoadingSection("");
    }
  };

  const loadInventorySnapshot = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage("");
    setLoadingSection("inventory");

    try {
      const suffix = inventoryThreshold
        ? `?threshold=${encodeURIComponent(inventoryThreshold)}`
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

  const exportPdfTable = (
    title: string,
    metaLines: string[],
    headers: string[],
    rows: string[][],
    fileName: string,
  ) => {
    const doc = new jsPDF();
    doc.setTextColor(23, 37, 84);
    doc.setFontSize(18);
    doc.text(title, 14, 18);

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Plasticon", 14, 7);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(
      `${reportText.generatedAt}: ${new Date().toLocaleString()}`,
      14,
      26,
    );

    let metaY = 34;
    metaLines.forEach((line) => {
      doc.text(line, 14, metaY);
      metaY += 6;
    });

    autoTable(doc, {
      startY: metaY + 4,
      head: [headers],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
      margin: { left: 14, right: 14 },
    });
    doc.save(fileName);
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
        <article className="module-panel module-panel--full">
          <h2>{copy.reports.dailyProduction}</h2>
          <div className="module-form module-form--inline">
            <label>
              {copy.reports.period}
              <select
                value={productionFilters.period}
                onChange={(event) =>
                  setProductionFilters((prev) => ({
                    ...prev,
                    period: event.target.value as ReportPeriod,
                  }))
                }
              >
                <option value="daily">{copy.reports.day}</option>
                <option value="weekly">{copy.reports.week}</option>
                <option value="monthly">{copy.reports.month}</option>
                <option value="yearly">{copy.reports.year}</option>
              </select>
            </label>
            {(productionFilters.period === "daily" ||
              productionFilters.period === "weekly") && (
              <label>
                {copy.reports.day}
                <input
                  type="date"
                  value={productionFilters.date}
                  onChange={(event) =>
                    setProductionFilters((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {productionFilters.period === "monthly" && (
              <label>
                {copy.reports.month}
                <input
                  type="month"
                  value={productionFilters.month}
                  onChange={(event) =>
                    setProductionFilters((prev) => ({
                      ...prev,
                      month: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {productionFilters.period === "yearly" && (
              <label>
                {copy.reports.year}
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={productionFilters.year}
                  onChange={(event) =>
                    setProductionFilters((prev) => ({
                      ...prev,
                      year: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="auth-button"
              onClick={() =>
                void loadActivityReport(
                  "/reports/production/activity",
                  setProductionActivity,
                  "productionActivity",
                  productionFilters,
                  "Failed to load production activity report",
                )
              }
            >
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!productionActivity) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                exportPdfTable(
                  copy.reports.dailyProduction,
                  [
                    `${reportText.period}: ${productionActivity.rangeStart.slice(0, 10)} ${isArabic ? "إلى" : "to"} ${productionActivity.rangeEnd.slice(0, 10)} (${productionActivity.period})`,
                    `${reportText.records}: ${productionActivity.totals.recordsCount}`,
                    `${reportText.cartons}: ${productionActivity.totals.totalCartons}`,
                    `${reportText.pieces}: ${productionActivity.totals.totalPieces}`,
                    `${isArabic ? "دقائق التوقف" : "Downtime minutes"}: ${productionActivity.totals.totalDowntimeMinutes}`,
                  ],
                  [
                    reportText.date,
                    reportText.machine,
                    reportText.shift,
                    reportText.user,
                    reportText.cartons,
                    reportText.pieces,
                  ],
                  productionActivity.records.map((row) => [
                    row.createdAt.slice(0, 10),
                    row.machineName,
                    row.shiftName,
                    row.userName,
                    String(row.cartonsCount),
                    String(row.totalPieces),
                  ]),
                  `production-${productionActivity.label}.pdf`,
                );
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </div>
          {loadingSection === "productionActivity" ? (
            <p>{copy.reports.loadingDaily}</p>
          ) : null}
          {productionActivity ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Machine</th>
                    <th>Shift</th>
                    <th>User</th>
                    <th>Cartons</th>
                    <th>Pieces</th>
                  </tr>
                </thead>
                <tbody>
                  {productionActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{row.machineName}</td>
                      <td>{row.shiftName}</td>
                      <td>{row.userName}</td>
                      <td>{row.cartonsCount}</td>
                      <td>{row.totalPieces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="module-panel module-panel--full">
          <h2>{copy.reports.inventoryActivity}</h2>
          <div className="module-form module-form--inline">
            <label>
              {copy.reports.period}
              <select
                value={inventoryFilters.period}
                onChange={(event) =>
                  setInventoryFilters((prev) => ({
                    ...prev,
                    period: event.target.value as ReportPeriod,
                  }))
                }
              >
                <option value="daily">{copy.reports.day}</option>
                <option value="weekly">{copy.reports.week}</option>
                <option value="monthly">{copy.reports.month}</option>
                <option value="yearly">{copy.reports.year}</option>
              </select>
            </label>
            {(inventoryFilters.period === "daily" ||
              inventoryFilters.period === "weekly") && (
              <label>
                {copy.reports.day}
                <input
                  type="date"
                  value={inventoryFilters.date}
                  onChange={(event) =>
                    setInventoryFilters((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {inventoryFilters.period === "monthly" && (
              <label>
                {copy.reports.month}
                <input
                  type="month"
                  value={inventoryFilters.month}
                  onChange={(event) =>
                    setInventoryFilters((prev) => ({
                      ...prev,
                      month: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {inventoryFilters.period === "yearly" && (
              <label>
                {copy.reports.year}
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={inventoryFilters.year}
                  onChange={(event) =>
                    setInventoryFilters((prev) => ({
                      ...prev,
                      year: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="auth-button"
              onClick={() =>
                void loadActivityReport(
                  "/reports/inventory/activity",
                  setInventoryActivity,
                  "inventoryActivity",
                  inventoryFilters,
                  "Failed to load inventory activity report",
                )
              }
            >
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!inventoryActivity) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                exportPdfTable(
                  copy.reports.inventoryActivity,
                  [
                    `${reportText.period}: ${inventoryActivity.rangeStart.slice(0, 10)} ${isArabic ? "إلى" : "to"} ${inventoryActivity.rangeEnd.slice(0, 10)} (${inventoryActivity.period})`,
                    `${reportText.records}: ${inventoryActivity.totals.recordsCount}`,
                    `${isArabic ? "الوارد" : "IN"}: ${inventoryActivity.totals.inCount} (${inventoryActivity.totals.totalInQuantity})`,
                    `${isArabic ? "الصادر" : "OUT"}: ${inventoryActivity.totals.outCount} (${inventoryActivity.totals.totalOutQuantity})`,
                  ],
                  [
                    reportText.date,
                    reportText.material,
                    reportText.type,
                    reportText.qty,
                    reportText.reference,
                  ],
                  inventoryActivity.records.map((row) => [
                    row.createdAt.slice(0, 10),
                    row.materialName,
                    row.type,
                    `${row.quantity} ${row.materialUnit}`,
                    row.referenceType,
                  ]),
                  `inventory-${inventoryActivity.label}.pdf`,
                );
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </div>
          {loadingSection === "inventoryActivity" ? (
            <p>{copy.reports.loadingInventoryActivity}</p>
          ) : null}
          {inventoryActivity ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{row.materialName}</td>
                      <td>{row.type}</td>
                      <td>{`${row.quantity} ${row.materialUnit}`}</td>
                      <td>{row.referenceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="module-panel module-panel--full">
          <h2>{copy.reports.attendanceActivity}</h2>
          <div className="module-form module-form--inline">
            <label>
              {copy.reports.period}
              <select
                value={attendanceFilters.period}
                onChange={(event) =>
                  setAttendanceFilters((prev) => ({
                    ...prev,
                    period: event.target.value as ReportPeriod,
                  }))
                }
              >
                <option value="daily">{copy.reports.day}</option>
                <option value="weekly">{copy.reports.week}</option>
                <option value="monthly">{copy.reports.month}</option>
                <option value="yearly">{copy.reports.year}</option>
              </select>
            </label>
            {(attendanceFilters.period === "daily" ||
              attendanceFilters.period === "weekly") && (
              <label>
                {copy.reports.day}
                <input
                  type="date"
                  value={attendanceFilters.date}
                  onChange={(event) =>
                    setAttendanceFilters((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {attendanceFilters.period === "monthly" && (
              <label>
                {copy.reports.month}
                <input
                  type="month"
                  value={attendanceFilters.month}
                  onChange={(event) =>
                    setAttendanceFilters((prev) => ({
                      ...prev,
                      month: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {attendanceFilters.period === "yearly" && (
              <label>
                {copy.reports.year}
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={attendanceFilters.year}
                  onChange={(event) =>
                    setAttendanceFilters((prev) => ({
                      ...prev,
                      year: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="auth-button"
              onClick={() =>
                void loadActivityReport(
                  "/reports/attendance/activity",
                  setAttendanceActivity,
                  "attendanceActivity",
                  attendanceFilters,
                  "Failed to load attendance report",
                )
              }
            >
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!attendanceActivity) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                exportPdfTable(
                  copy.reports.attendanceActivity,
                  [
                    `${reportText.period}: ${attendanceActivity.rangeStart.slice(0, 10)} ${isArabic ? "إلى" : "to"} ${attendanceActivity.rangeEnd.slice(0, 10)} (${attendanceActivity.period})`,
                    `${reportText.records}: ${attendanceActivity.totals.recordsCount}`,
                    `${isArabic ? "الغياب" : "Absent"}: ${attendanceActivity.totals.absentCount}`,
                    `${isArabic ? "دقائق التأخير" : "Late minutes"}: ${attendanceActivity.totals.totalLateMinutes}`,
                    `${isArabic ? "دقائق الإضافي" : "Overtime minutes"}: ${attendanceActivity.totals.totalOvertimeMinutes}`,
                  ],
                  [
                    reportText.user,
                    reportText.shift,
                    reportText.checkIn,
                    reportText.checkOut,
                    reportText.late,
                    reportText.overtime,
                  ],
                  attendanceActivity.records.map((row) => [
                    row.userName,
                    row.shiftName ?? "-",
                    row.checkIn.replace("T", " ").slice(0, 16),
                    row.checkOut
                      ? row.checkOut.replace("T", " ").slice(0, 16)
                      : "-",
                    String(row.lateMinutes),
                    String(row.overtimeMinutes),
                  ]),
                  `attendance-${attendanceActivity.label}.pdf`,
                );
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </div>
          {loadingSection === "attendanceActivity" ? (
            <p>{copy.reports.loadingAttendanceActivity}</p>
          ) : null}
          {attendanceActivity ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Shift</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Late</th>
                    <th>OT</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.userName}</td>
                      <td>{row.shiftName ?? "-"}</td>
                      <td>{row.checkIn.replace("T", " ").slice(0, 16)}</td>
                      <td>
                        {row.checkOut
                          ? row.checkOut.replace("T", " ").slice(0, 16)
                          : "-"}
                      </td>
                      <td>{row.lateMinutes}</td>
                      <td>{row.overtimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="module-panel module-panel--full">
          <h2>{copy.reports.payrollActivity}</h2>
          <div className="module-form module-form--inline">
            <label>
              {copy.reports.period}
              <select
                value={payrollFilters.period}
                onChange={(event) =>
                  setPayrollFilters((prev) => ({
                    ...prev,
                    period: event.target.value as ReportPeriod,
                  }))
                }
              >
                <option value="daily">{copy.reports.day}</option>
                <option value="weekly">{copy.reports.week}</option>
                <option value="monthly">{copy.reports.month}</option>
                <option value="yearly">{copy.reports.year}</option>
              </select>
            </label>
            {(payrollFilters.period === "daily" ||
              payrollFilters.period === "weekly") && (
              <label>
                {copy.reports.day}
                <input
                  type="date"
                  value={payrollFilters.date}
                  onChange={(event) =>
                    setPayrollFilters((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {payrollFilters.period === "monthly" && (
              <label>
                {copy.reports.month}
                <input
                  type="month"
                  value={payrollFilters.month}
                  onChange={(event) =>
                    setPayrollFilters((prev) => ({
                      ...prev,
                      month: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {payrollFilters.period === "yearly" && (
              <label>
                {copy.reports.year}
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={payrollFilters.year}
                  onChange={(event) =>
                    setPayrollFilters((prev) => ({
                      ...prev,
                      year: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="auth-button"
              onClick={() =>
                void loadActivityReport(
                  "/reports/payroll/activity",
                  setPayrollActivity,
                  "payrollActivity",
                  payrollFilters,
                  "Failed to load payroll report",
                )
              }
            >
              {copy.load}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => {
                if (!payrollActivity) {
                  window.alert(copy.reports.pdfNoData);
                  return;
                }

                exportPdfTable(
                  copy.reports.payrollActivity,
                  [
                    `${reportText.period}: ${payrollActivity.rangeStart.slice(0, 10)} ${isArabic ? "إلى" : "to"} ${payrollActivity.rangeEnd.slice(0, 10)} (${payrollActivity.period})`,
                    `${reportText.records}: ${payrollActivity.totals.recordsCount}`,
                    `${isArabic ? "الراتب الأساسي" : "Base salary"}: ${payrollActivity.totals.totalBaseSalary.toLocaleString()}`,
                    `${isArabic ? "بدل الإضافي" : "Overtime salary"}: ${payrollActivity.totals.totalOvertimeSalary.toLocaleString()}`,
                    `${isArabic ? "إجمالي المدفوع" : "Total payout"}: ${payrollActivity.totals.totalPayout.toLocaleString()}`,
                  ],
                  [
                    reportText.user,
                    reportText.month,
                    reportText.hours,
                    reportText.overtimeHours,
                    reportText.total,
                  ],
                  payrollActivity.records.map((row) => [
                    row.userName,
                    row.month,
                    String(row.totalHours),
                    String(row.overtimeHours),
                    row.totalSalary.toLocaleString(),
                  ]),
                  `payroll-${payrollActivity.label}.pdf`,
                );
              }}
            >
              {copy.reports.downloadPdf}
            </button>
          </div>
          {loadingSection === "payrollActivity" ? (
            <p>{copy.reports.loadingPayrollActivity}</p>
          ) : null}
          {payrollActivity ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Month</th>
                    <th>Hours</th>
                    <th>OT Hours</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollActivity.records.map((row) => (
                    <tr key={row.id}>
                      <td>{row.userName}</td>
                      <td>{row.month}</td>
                      <td>{row.totalHours}</td>
                      <td>{row.overtimeHours}</td>
                      <td>{row.totalSalary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
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
                value={inventoryThreshold}
                onChange={(event) => setInventoryThreshold(event.target.value)}
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
