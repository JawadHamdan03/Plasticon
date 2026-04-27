import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { toast } from "../../lib/toast";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { TableBase, TableShell } from "../../components/ui/table-shell";

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

type PurchaseRecord = {
  id: number;
  supplierId: number;
  totalAmount: number;
  date: string;
  supplier?: {
    id: number;
    name: string;
  };
};

type SaleRecord = {
  id: number;
  customerId: number;
  totalAmount: number;
  date: string;
  customer?: {
    id: number;
    name: string;
  };
};

type ElectricityShiftRecord = {
  id: number;
  shift: { id: number; name: string };
  startReading: number;
  endReading: number;
  consumption: number;
  kwhPriceSnap: number;
  shiftCost: number;
  isMeterReset: boolean;
  notes: string | null;
};
type ElectricityDayRow = {
  date: string;
  shifts: ElectricityShiftRecord[];
  totalConsumption: number;
  totalCost: number;
};
type ElectricityReport = {
  range: { fromDate: string; toDate: string };
  currentKwhPrice: number;
  days: ElectricityDayRow[];
  summary: { totalConsumption: number; totalCost: number; totalReadings: number; currentKwhPrice: number };
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
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
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [supplierFromDate, setSupplierFromDate] = useState("");
  const [supplierToDate, setSupplierToDate] = useState("");
  const [customerFromDate, setCustomerFromDate] = useState("");
  const [customerToDate, setCustomerToDate] = useState("");
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
  const [electricityReport, setElectricityReport] = useState<ElectricityReport | null>(null);
  const [electricityFromDate, setElectricityFromDate] = useState("");
  const [electricityToDate, setElectricityToDate] = useState("");
  const [electricityMonth, setElectricityMonth] = useState("");
  const [electricityYear, setElectricityYear] = useState("");
  const [loadingElectricity, setLoadingElectricity] = useState(false);
  const [payrollScopeMode, setPayrollScopeMode] = useState<"ALL" | "PERSON">(
    "ALL",
  );
  const [payrollScopeUser, setPayrollScopeUser] = useState("");
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [loadingCommerce, setLoadingCommerce] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCommerceReports = useCallback(async () => {
    setLoadingCommerce(true);
    try {
      const [purchasesResponse, salesResponse] = await Promise.all([
        fetchWithAuth("/purchases/all"),
        fetchWithAuth("/sales/all"),
      ]);

      if (!purchasesResponse.ok) {
        throw new Error(await readApiError(purchasesResponse));
      }

      if (!salesResponse.ok) {
        throw new Error(await readApiError(salesResponse));
      }

      setPurchases((await purchasesResponse.json()) as PurchaseRecord[]);
      setSales((await salesResponse.json()) as SaleRecord[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load commerce reports",
      );
    } finally {
      setLoadingCommerce(false);
    }
  }, []);

  const loadElectricityReport = useCallback(async () => {
    setLoadingElectricity(true);
    try {
      const params = new URLSearchParams();
      if (electricityFromDate) params.set("fromDate", electricityFromDate);
      if (electricityToDate) params.set("toDate", electricityToDate);
      if (electricityMonth) params.set("month", electricityMonth);
      if (electricityYear) params.set("year", electricityYear);
      const res = await fetchWithAuth(`/electricity/report?${params.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setElectricityReport((await res.json()) as ElectricityReport);
    } catch {
      setElectricityReport(null);
    } finally {
      setLoadingElectricity(false);
    }
  }, [electricityFromDate, electricityToDate, electricityMonth, electricityYear]);

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

  useEffect(() => {
    void loadCommerceReports();
  }, [loadCommerceReports]);

  const filteredPurchases = useMemo(() => {
    const fromTime = supplierFromDate
      ? new Date(`${supplierFromDate}T00:00:00`).getTime()
      : null;
    const toTime = supplierToDate
      ? new Date(`${supplierToDate}T23:59:59.999`).getTime()
      : null;

    return purchases.filter((purchase) => {
      const purchaseTime = new Date(purchase.date).getTime();
      if (Number.isNaN(purchaseTime)) {
        return false;
      }
      if (fromTime !== null && purchaseTime < fromTime) {
        return false;
      }
      if (toTime !== null && purchaseTime > toTime) {
        return false;
      }
      return true;
    });
  }, [purchases, supplierFromDate, supplierToDate]);

  const filteredSales = useMemo(() => {
    const fromTime = customerFromDate
      ? new Date(`${customerFromDate}T00:00:00`).getTime()
      : null;
    const toTime = customerToDate
      ? new Date(`${customerToDate}T23:59:59.999`).getTime()
      : null;

    return sales.filter((sale) => {
      const saleTime = new Date(sale.date).getTime();
      if (Number.isNaN(saleTime)) {
        return false;
      }
      if (fromTime !== null && saleTime < fromTime) {
        return false;
      }
      if (toTime !== null && saleTime > toTime) {
        return false;
      }
      return true;
    });
  }, [customerFromDate, customerToDate, sales]);

  const supplierReportRows = useMemo(() => {
    const map = new Map<
      number,
      {
        supplierId: number;
        supplierName: string;
        purchasesCount: number;
        totalAmount: number;
        lastPurchaseDate: string | null;
      }
    >();

    for (const purchase of filteredPurchases) {
      const supplierId = purchase.supplier?.id ?? purchase.supplierId;
      const current = map.get(supplierId) ?? {
        supplierId,
        supplierName: purchase.supplier?.name ?? `#${supplierId}`,
        purchasesCount: 0,
        totalAmount: 0,
        lastPurchaseDate: null,
      };

      current.purchasesCount += 1;
      current.totalAmount += purchase.totalAmount ?? 0;
      if (
        !current.lastPurchaseDate ||
        new Date(purchase.date).getTime() >
          new Date(current.lastPurchaseDate).getTime()
      ) {
        current.lastPurchaseDate = purchase.date;
      }

      map.set(supplierId, current);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );
  }, [filteredPurchases]);

  const customerReportRows = useMemo(() => {
    const map = new Map<
      number,
      {
        customerId: number;
        customerName: string;
        salesCount: number;
        totalAmount: number;
        lastSaleDate: string | null;
      }
    >();

    for (const sale of filteredSales) {
      const customerId = sale.customer?.id ?? sale.customerId;
      const current = map.get(customerId) ?? {
        customerId,
        customerName: sale.customer?.name ?? `#${customerId}`,
        salesCount: 0,
        totalAmount: 0,
        lastSaleDate: null,
      };

      current.salesCount += 1;
      current.totalAmount += sale.totalAmount ?? 0;
      if (
        !current.lastSaleDate ||
        new Date(sale.date).getTime() > new Date(current.lastSaleDate).getTime()
      ) {
        current.lastSaleDate = sale.date;
      }

      map.set(customerId, current);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );
  }, [filteredSales]);

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

  const exportExcelTable = (
    headers: string[],
    rows: string[][],
    fileName: string,
  ) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  };

  const payrollUsers = useMemo(() => {
    if (!payrollActivity) {
      return [] as Array<{ username: string; name: string }>;
    }

    return Array.from(
      new Map(
        payrollActivity.records.map((row) => [
          row.username,
          {
            username: row.username,
            name: row.userName,
          },
        ]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [payrollActivity]);

  useEffect(() => {
    if (!payrollUsers.length) {
      if (payrollScopeUser) {
        setPayrollScopeUser("");
      }
      return;
    }

    if (payrollScopeMode === "PERSON") {
      const exists = payrollUsers.some(
        (userRow) => userRow.username === payrollScopeUser,
      );
      if (!exists) {
        setPayrollScopeUser(payrollUsers[0]?.username ?? "");
      }
    }
  }, [payrollScopeMode, payrollScopeUser, payrollUsers]);

  const filteredPayrollRows = useMemo(() => {
    if (!payrollActivity) {
      return [] as PayrollActivityReport["records"];
    }

    if (payrollScopeMode === "ALL") {
      return payrollActivity.records;
    }

    return payrollActivity.records.filter(
      (row) => row.username === payrollScopeUser,
    );
  }, [payrollActivity, payrollScopeMode, payrollScopeUser]);

  const payrollScopeLabel = useMemo(() => {
    if (payrollScopeMode === "ALL") {
      return isArabic ? "الكل" : "All";
    }

    const selected = payrollUsers.find(
      (userRow) => userRow.username === payrollScopeUser,
    );
    return selected?.name ?? payrollScopeUser;
  }, [isArabic, payrollScopeMode, payrollScopeUser, payrollUsers]);

  const filteredPayrollTotals = useMemo(() => {
    const peopleCount = new Set(filteredPayrollRows.map((row) => row.username))
      .size;
    const totalBaseSalary = filteredPayrollRows.reduce(
      (sum, row) => sum + row.baseSalary,
      0,
    );
    const totalOvertimeSalary = filteredPayrollRows.reduce(
      (sum, row) => sum + row.overtimeSalary,
      0,
    );
    const totalPayout = filteredPayrollRows.reduce(
      (sum, row) => sum + row.totalSalary,
      0,
    );

    return {
      peopleCount,
      recordsCount: filteredPayrollRows.length,
      totalBaseSalary,
      totalOvertimeSalary,
      totalPayout,
    };
  }, [filteredPayrollRows]);

  return (
    <ModulePageShell
      title={copy.reports.title}
      subtitle={copy.reports.subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void loadCommerceReports();
            void loadInventorySnapshot();
          }}
        >
          {copy.refreshAll}
        </Button>
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
        <article className="module-panel module-panel--full module-panel--reports-supplier">
          <h2>{isArabic ? "تقارير الموردين" : "Supplier reports"}</h2>
          <div className="module-form module-form--inline module-form--commerce-range">
            <label>
              {isArabic ? "من تاريخ" : "From date"}
              <input
                type="date"
                value={supplierFromDate}
                onChange={(event) => setSupplierFromDate(event.target.value)}
              />
            </label>
            <label>
              {isArabic ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                value={supplierToDate}
                onChange={(event) => setSupplierToDate(event.target.value)}
              />
            </label>
            <div className="module-form-controls">
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setSupplierFromDate("");
                  setSupplierToDate("");
                }}
              >
                {isArabic ? "إعادة تعيين" : "Reset"}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost reports-download-button"
                dir="ltr"
                onClick={() => {
                  if (!supplierReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }

                  const supplierRangeText =
                    supplierFromDate || supplierToDate
                      ? `${supplierFromDate || "-"} ${isArabic ? "إلى" : "to"} ${supplierToDate || "-"}`
                      : isArabic
                        ? "كل الفترات"
                        : "All dates";

                  exportPdfTable(
                    isArabic ? "تقرير الموردين" : "Supplier report",
                    [
                      `${reportText.period}: ${supplierRangeText}`,
                      `${isArabic ? "عدد الموردين" : "Suppliers"}: ${supplierReportRows.length}`,
                      `${isArabic ? "عدد عمليات الشراء" : "Purchases"}: ${filteredPurchases.length}`,
                      `${isArabic ? "إجمالي الشراء" : "Total spent"}: ${supplierReportRows
                        .reduce((sum, row) => sum + row.totalAmount, 0)
                        .toLocaleString()}`,
                    ],
                    [
                      isArabic ? "المورد" : "Supplier",
                      isArabic ? "العمليات" : "Purchases",
                      isArabic ? "الإجمالي" : "Total",
                      isArabic ? "آخر استلام" : "Last purchase",
                    ],
                    supplierReportRows.map((row) => [
                      row.supplierName,
                      String(row.purchasesCount),
                      row.totalAmount.toLocaleString(),
                      row.lastPurchaseDate
                        ? row.lastPurchaseDate.slice(0, 10)
                        : "-",
                    ]),
                    `supplier-report-${new Date().toISOString().slice(0, 10)}.pdf`,
                  );
                }}
              >
                <Download
                  className="reports-download-icon"
                  aria-hidden="true"
                />
                {copy.reports.downloadPdf}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost reports-download-button"
                dir="ltr"
                onClick={() => {
                  if (!supplierReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [isArabic ? "المورد" : "Supplier", isArabic ? "العمليات" : "Purchases", isArabic ? "الإجمالي" : "Total", isArabic ? "آخر استلام" : "Last purchase"],
                    supplierReportRows.map((row) => [row.supplierName, String(row.purchasesCount), row.totalAmount.toLocaleString(), row.lastPurchaseDate ? row.lastPurchaseDate.slice(0, 10) : "-"]),
                    `supplier-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
                  );
                }}
              >
                <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
                {isArabic ? "Excel تنزيل" : "Download Excel"}
              </button>
            </div>
          </div>
          {loadingCommerce ? (
            <p>
              {isArabic
                ? "جارٍ تحميل بيانات الموردين والزباين..."
                : "Loading supplier and customer data..."}
            </p>
          ) : null}
          <div className="module-report-grid">
            <div className="module-report-card">
              <span>{isArabic ? "عدد الموردين" : "Suppliers"}</span>
              <strong>{supplierReportRows.length}</strong>
            </div>
            <div className="module-report-card">
              <span>{isArabic ? "إجمالي الشراء" : "Total spent"}</span>
              <strong>
                {supplierReportRows
                  .reduce((sum, row) => sum + row.totalAmount, 0)
                  .toLocaleString()}
              </strong>
            </div>
            <div className="module-report-card">
              <span>{isArabic ? "عدد عمليات الشراء" : "Purchases"}</span>
              <strong>{filteredPurchases.length}</strong>
            </div>
          </div>
          <TableShell className="mt-4">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{isArabic ? "المورد" : "Supplier"}</th>
                  <th>{isArabic ? "العمليات" : "Purchases"}</th>
                  <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  <th>{isArabic ? "آخر استلام" : "Last purchase"}</th>
                </tr>
              </thead>
              <tbody>
                {supplierReportRows.map((row) => (
                  <tr key={row.supplierId}>
                    <td>{row.supplierName}</td>
                    <td>{row.purchasesCount}</td>
                    <td>{row.totalAmount.toLocaleString()}</td>
                    <td>
                      {row.lastPurchaseDate
                        ? row.lastPurchaseDate.slice(0, 10)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBase>
          </TableShell>
        </article>

        <article className="module-panel module-panel--full module-panel--reports-customer">
          <h2>{isArabic ? "تقارير الزباين" : "Customer reports"}</h2>
          <div className="module-form module-form--inline module-form--commerce-range">
            <label>
              {isArabic ? "من تاريخ" : "From date"}
              <input
                type="date"
                value={customerFromDate}
                onChange={(event) => setCustomerFromDate(event.target.value)}
              />
            </label>
            <label>
              {isArabic ? "إلى تاريخ" : "To date"}
              <input
                type="date"
                value={customerToDate}
                onChange={(event) => setCustomerToDate(event.target.value)}
              />
            </label>
            <div className="module-form-controls">
              <button
                type="button"
                className="auth-button auth-button--ghost"
                onClick={() => {
                  setCustomerFromDate("");
                  setCustomerToDate("");
                }}
              >
                {isArabic ? "إعادة تعيين" : "Reset"}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost reports-download-button"
                dir="ltr"
                onClick={() => {
                  if (!customerReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }

                  const customerRangeText =
                    customerFromDate || customerToDate
                      ? `${customerFromDate || "-"} ${isArabic ? "إلى" : "to"} ${customerToDate || "-"}`
                      : isArabic
                        ? "كل الفترات"
                        : "All dates";

                  exportPdfTable(
                    isArabic ? "تقرير الزباين" : "Customer report",
                    [
                      `${reportText.period}: ${customerRangeText}`,
                      `${isArabic ? "عدد الزباين" : "Customers"}: ${customerReportRows.length}`,
                      `${isArabic ? "عدد عمليات البيع" : "Sales"}: ${filteredSales.length}`,
                      `${isArabic ? "إجمالي المبيعات" : "Total sales"}: ${customerReportRows
                        .reduce((sum, row) => sum + row.totalAmount, 0)
                        .toLocaleString()}`,
                    ],
                    [
                      isArabic ? "الزبون" : "Customer",
                      isArabic ? "العمليات" : "Sales",
                      isArabic ? "الإجمالي" : "Total",
                      isArabic ? "آخر بيع" : "Last sale",
                    ],
                    customerReportRows.map((row) => [
                      row.customerName,
                      String(row.salesCount),
                      row.totalAmount.toLocaleString(),
                      row.lastSaleDate ? row.lastSaleDate.slice(0, 10) : "-",
                    ]),
                    `customer-report-${new Date().toISOString().slice(0, 10)}.pdf`,
                  );
                }}
              >
                <Download
                  className="reports-download-icon"
                  aria-hidden="true"
                />
                {copy.reports.downloadPdf}
              </button>
              <button
                type="button"
                className="auth-button auth-button--ghost reports-download-button"
                dir="ltr"
                onClick={() => {
                  if (!customerReportRows.length) {
                    toast.info(copy.reports.pdfNoData);
                    return;
                  }
                  exportExcelTable(
                    [isArabic ? "الزبون" : "Customer", isArabic ? "العمليات" : "Sales", isArabic ? "الإجمالي" : "Total", isArabic ? "آخر بيع" : "Last sale"],
                    customerReportRows.map((row) => [row.customerName, String(row.salesCount), row.totalAmount.toLocaleString(), row.lastSaleDate ? row.lastSaleDate.slice(0, 10) : "-"]),
                    `customer-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
                  );
                }}
              >
                <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
                {isArabic ? "Excel تنزيل" : "Download Excel"}
              </button>
            </div>
          </div>
          <div className="module-report-grid">
            <div className="module-report-card">
              <span>{isArabic ? "عدد الزباين" : "Customers"}</span>
              <strong>{customerReportRows.length}</strong>
            </div>
            <div className="module-report-card">
              <span>{isArabic ? "إجمالي المبيعات" : "Total sales"}</span>
              <strong>
                {customerReportRows
                  .reduce((sum, row) => sum + row.totalAmount, 0)
                  .toLocaleString()}
              </strong>
            </div>
            <div className="module-report-card">
              <span>{isArabic ? "عدد عمليات البيع" : "Sales"}</span>
              <strong>{filteredSales.length}</strong>
            </div>
          </div>
          <TableShell className="mt-4">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{isArabic ? "الزبون" : "Customer"}</th>
                  <th>{isArabic ? "العمليات" : "Sales"}</th>
                  <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  <th>{isArabic ? "آخر بيع" : "Last sale"}</th>
                </tr>
              </thead>
              <tbody>
                {customerReportRows.map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerName}</td>
                    <td>{row.salesCount}</td>
                    <td>{row.totalAmount.toLocaleString()}</td>
                    <td>
                      {row.lastSaleDate ? row.lastSaleDate.slice(0, 10) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBase>
          </TableShell>
        </article>

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
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!productionActivity) {
                  toast.info(copy.reports.pdfNoData);
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
              <Download className="reports-download-icon" aria-hidden="true" />
              {copy.reports.downloadPdf}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!productionActivity) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }
                exportExcelTable(
                  [reportText.date, reportText.machine, reportText.shift, reportText.user, reportText.cartons, reportText.pieces],
                  productionActivity.records.map((row) => [row.createdAt.slice(0, 10), row.machineName, row.shiftName, row.userName, String(row.cartonsCount), String(row.totalPieces)]),
                  `production-${productionActivity.label}.xlsx`,
                );
              }}
            >
              <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
              {isArabic ? "Excel تنزيل" : "Download Excel"}
            </button>
          </div>
          {loadingSection === "productionActivity" ? (
            <p>{copy.reports.loadingDaily}</p>
          ) : null}
          {productionActivity ? (
            <TableShell>
              <TableBase className="admin-table">
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
              </TableBase>
            </TableShell>
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
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!inventoryActivity) {
                  toast.info(copy.reports.pdfNoData);
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
              <Download className="reports-download-icon" aria-hidden="true" />
              {copy.reports.downloadPdf}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!inventoryActivity) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }
                exportExcelTable(
                  [reportText.date, reportText.material, reportText.type, reportText.qty, reportText.reference],
                  inventoryActivity.records.map((row) => [row.createdAt.slice(0, 10), row.materialName, row.type, `${row.quantity} ${row.materialUnit}`, row.referenceType]),
                  `inventory-${inventoryActivity.label}.xlsx`,
                );
              }}
            >
              <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
              {isArabic ? "Excel تنزيل" : "Download Excel"}
            </button>
          </div>
          {loadingSection === "inventoryActivity" ? (
            <p>{copy.reports.loadingInventoryActivity}</p>
          ) : null}
          {inventoryActivity ? (
            <TableShell>
              <TableBase className="admin-table">
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
              </TableBase>
            </TableShell>
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
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!attendanceActivity) {
                  toast.info(copy.reports.pdfNoData);
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
              <Download className="reports-download-icon" aria-hidden="true" />
              {copy.reports.downloadPdf}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!attendanceActivity) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }
                exportExcelTable(
                  [reportText.user, reportText.shift, reportText.checkIn, reportText.checkOut, reportText.late, reportText.overtime],
                  attendanceActivity.records.map((row) => [row.userName, row.shiftName ?? "-", row.checkIn.replace("T", " ").slice(0, 16), row.checkOut ? row.checkOut.replace("T", " ").slice(0, 16) : "-", String(row.lateMinutes), String(row.overtimeMinutes)]),
                  `attendance-${attendanceActivity.label}.xlsx`,
                );
              }}
            >
              <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
              {isArabic ? "Excel تنزيل" : "Download Excel"}
            </button>
          </div>
          {loadingSection === "attendanceActivity" ? (
            <p>{copy.reports.loadingAttendanceActivity}</p>
          ) : null}
          {attendanceActivity ? (
            <TableShell>
              <TableBase className="admin-table">
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
              </TableBase>
            </TableShell>
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
            <label>
              {isArabic ? "نطاق التقرير" : "Report scope"}
              <select
                value={payrollScopeMode}
                onChange={(event) =>
                  setPayrollScopeMode(event.target.value as "ALL" | "PERSON")
                }
              >
                <option value="ALL">{isArabic ? "الكل" : "All"}</option>
                <option value="PERSON">
                  {isArabic ? "شخص معيّن" : "Specific person"}
                </option>
              </select>
            </label>
            {payrollScopeMode === "PERSON" ? (
              <label>
                {isArabic ? "الموظف" : "Employee"}
                <select
                  value={payrollScopeUser}
                  onChange={(event) => setPayrollScopeUser(event.target.value)}
                >
                  {payrollUsers.map((person) => (
                    <option key={person.username} value={person.username}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!payrollActivity) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }

                if (!filteredPayrollRows.length) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }

                exportPdfTable(
                  copy.reports.payrollActivity,
                  [
                    `${reportText.period}: ${payrollActivity.rangeStart.slice(0, 10)} ${isArabic ? "إلى" : "to"} ${payrollActivity.rangeEnd.slice(0, 10)} (${payrollActivity.period})`,
                    `${isArabic ? "نطاق التقرير" : "Report scope"}: ${payrollScopeLabel}`,
                    `${isArabic ? "عدد الأشخاص" : "People"}: ${filteredPayrollTotals.peopleCount}`,
                    `${reportText.records}: ${filteredPayrollTotals.recordsCount}`,
                    `${isArabic ? "الراتب الأساسي" : "Base salary"}: ${filteredPayrollTotals.totalBaseSalary.toLocaleString()}`,
                    `${isArabic ? "بدل الإضافي" : "Overtime salary"}: ${filteredPayrollTotals.totalOvertimeSalary.toLocaleString()}`,
                    `${isArabic ? "إجمالي المدفوع" : "Total payout"}: ${filteredPayrollTotals.totalPayout.toLocaleString()}`,
                  ],
                  [
                    reportText.user,
                    reportText.month,
                    reportText.hours,
                    reportText.overtimeHours,
                    reportText.total,
                  ],
                  filteredPayrollRows.map((row) => [
                    row.userName,
                    row.month,
                    String(row.totalHours),
                    String(row.overtimeHours),
                    row.totalSalary.toLocaleString(),
                  ]),
                  `payroll-${payrollActivity.label}-${payrollScopeMode === "ALL" ? "all" : "person"}.pdf`,
                );
              }}
            >
              <Download className="reports-download-icon" aria-hidden="true" />
              {copy.reports.downloadPdf}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost reports-download-button"
              dir="ltr"
              onClick={() => {
                if (!payrollActivity || !filteredPayrollRows.length) {
                  toast.info(copy.reports.pdfNoData);
                  return;
                }
                exportExcelTable(
                  [reportText.user, reportText.month, reportText.hours, reportText.overtimeHours, reportText.total],
                  filteredPayrollRows.map((row) => [row.userName, row.month, String(row.totalHours), String(row.overtimeHours), row.totalSalary.toLocaleString()]),
                  `payroll-${payrollActivity.label}-${payrollScopeMode === "ALL" ? "all" : "person"}.xlsx`,
                );
              }}
            >
              <FileSpreadsheet className="reports-download-icon" aria-hidden="true" />
              {isArabic ? "Excel تنزيل" : "Download Excel"}
            </button>
          </div>
          {loadingSection === "payrollActivity" ? (
            <p>{copy.reports.loadingPayrollActivity}</p>
          ) : null}
          {payrollActivity ? (
            <div className="module-report-grid">
              <div className="module-report-card">
                <span>{isArabic ? "نطاق التقرير" : "Report scope"}</span>
                <strong>{payrollScopeLabel}</strong>
              </div>
              <div className="module-report-card">
                <span>{isArabic ? "عدد الأشخاص" : "People"}</span>
                <strong>{filteredPayrollTotals.peopleCount}</strong>
              </div>
              <div className="module-report-card">
                <span>{reportText.records}</span>
                <strong>{filteredPayrollTotals.recordsCount}</strong>
              </div>
              <div className="module-report-card">
                <span>{isArabic ? "إجمالي المدفوع" : "Total payout"}</span>
                <strong>
                  {filteredPayrollTotals.totalPayout.toLocaleString()}
                </strong>
              </div>
            </div>
          ) : null}
          {payrollActivity ? (
            <TableShell>
              <TableBase className="admin-table">
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
                  {filteredPayrollRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.userName}</td>
                      <td>{row.month}</td>
                      <td>{row.totalHours}</td>
                      <td>{row.overtimeHours}</td>
                      <td>{row.totalSalary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </TableBase>
            </TableShell>
          ) : null}
        </article>

        {/* ── Electricity Consumption Report ── */}
        <article className="module-panel module-panel--full">
          <h2>{isArabic ? "تقرير استهلاك الكهرباء" : "Electricity Consumption Report"}</h2>
          <div className="module-form module-form--inline" style={{ flexWrap: "wrap", gap: ".75rem", marginBottom: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isArabic ? "من تاريخ" : "From date"}
              <input type="date" className="module-form__input" value={electricityFromDate} onChange={(e) => setElectricityFromDate(e.target.value)} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isArabic ? "إلى تاريخ" : "To date"}
              <input type="date" className="module-form__input" value={electricityToDate} onChange={(e) => setElectricityToDate(e.target.value)} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".8rem", fontWeight: 600 }}>
              {isArabic ? "الشهر" : "Month"}
              <input type="month" className="module-form__input" value={electricityMonth ? `${electricityYear || new Date().getFullYear()}-${electricityMonth.padStart(2, "0")}` : ""}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  setElectricityYear(y ?? "");
                  setElectricityMonth(String(Number(m ?? "0")));
                  setElectricityFromDate(""); setElectricityToDate("");
                }} />
            </label>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "flex-end" }}>
              <button type="button" className="auth-button" onClick={() => void loadElectricityReport()}>
                {isArabic ? "تحميل" : "Load"}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => { setElectricityFromDate(""); setElectricityToDate(""); setElectricityMonth(""); setElectricityYear(""); setElectricityReport(null); }}>
                {isArabic ? "مسح" : "Clear"}
              </button>
            </div>
          </div>

          {loadingElectricity && <p style={{ color: "var(--text-muted)" }}>{isArabic ? "جاري التحميل…" : "Loading…"}</p>}

          {electricityReport && (
            <>
              {/* KPI Summary */}
              <div className="module-report-grid" style={{ marginBottom: "1.25rem" }}>
                <div className="module-report-card">
                  <span>{isArabic ? "إجمالي الاستهلاك" : "Total Consumption"}</span>
                  <strong>{electricityReport.summary.totalConsumption.toFixed(2)} kWh</strong>
                </div>
                <div className="module-report-card">
                  <span>{isArabic ? "إجمالي التكلفة" : "Total Cost"}</span>
                  <strong>{electricityReport.summary.totalCost.toFixed(2)} ILS</strong>
                </div>
                <div className="module-report-card">
                  <span>{isArabic ? "عدد القراءات" : "Total Readings"}</span>
                  <strong>{electricityReport.summary.totalReadings}</strong>
                </div>
                <div className="module-report-card">
                  <span>{isArabic ? "سعر kWh الحالي" : "Current kWh Price"}</span>
                  <strong>{electricityReport.currentKwhPrice.toFixed(3)} ILS</strong>
                </div>
              </div>

              {/* Detailed table */}
              {electricityReport.days.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem 0" }}>{isArabic ? "لا توجد بيانات" : "No data in selected range"}</p>
              ) : (
                <TableShell>
                  <TableBase className="admin-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "التاريخ" : "Date"}</th>
                        <th>{isArabic ? "الشفت" : "Shift"}</th>
                        <th>{isArabic ? "بداية (kWh)" : "Start (kWh)"}</th>
                        <th>{isArabic ? "نهاية (kWh)" : "End (kWh)"}</th>
                        <th>{isArabic ? "الاستهلاك (kWh)" : "Consumption (kWh)"}</th>
                        <th>{isArabic ? "سعر kWh" : "kWh Price"}</th>
                        <th>{isArabic ? "تكلفة الشفت (ILS)" : "Shift Cost (ILS)"}</th>
                        <th>{isArabic ? "تهيئة" : "Reset"}</th>
                        <th>{isArabic ? "ملاحظات" : "Notes"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {electricityReport.days.map((day) => (
                        <>
                          {day.shifts.map((s, si) => (
                            <tr key={s.id}>
                              {si === 0 && (
                                <td rowSpan={day.shifts.length} style={{ fontWeight: 700, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                  {new Date(day.date).toLocaleDateString(isArabic ? "ar-SA" : "en-GB")}
                                </td>
                              )}
                              <td>
                                <span style={{ padding: ".15rem .45rem", borderRadius: "999px", background: s.shift.name.includes("A") ? "#dbeafe" : s.shift.name.includes("B") ? "#ffedd5" : "#ede9fe", color: s.shift.name.includes("A") ? "#1d4ed8" : s.shift.name.includes("B") ? "#c2410c" : "#6d28d9", fontWeight: 700, fontSize: ".8rem" }}>
                                  {s.shift.name}
                                </span>
                              </td>
                              <td>{s.startReading.toFixed(2)}</td>
                              <td>{s.endReading.toFixed(2)}</td>
                              <td><strong>{s.consumption.toFixed(2)}</strong></td>
                              <td style={{ fontSize: ".85rem" }}>{s.kwhPriceSnap.toFixed(3)}</td>
                              <td><strong>{s.shiftCost.toFixed(2)}</strong></td>
                              <td>{s.isMeterReset ? <span style={{ fontSize: ".75rem", padding: ".1rem .35rem", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontWeight: 700 }}>{isArabic ? "تهيئة" : "Reset"}</span> : "—"}</td>
                              <td style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{s.notes ?? "—"}</td>
                            </tr>
                          ))}
                          {/* Daily total row */}
                          <tr style={{ background: "var(--bg-subtle)", fontWeight: 700 }}>
                            <td colSpan={3} style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: ".85rem" }}>{isArabic ? "إجمالي اليوم" : "Day Total"}</td>
                            <td></td>
                            <td style={{ color: "var(--brand-primary)" }}>{day.totalConsumption.toFixed(2)} kWh</td>
                            <td></td>
                            <td style={{ color: "#15803d" }}>{day.totalCost.toFixed(2)} ILS</td>
                            <td colSpan={2}></td>
                          </tr>
                        </>
                      ))}
                    </tbody>
                  </TableBase>
                </TableShell>
              )}
            </>
          )}
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
    return <EmptyState title={copy.reports.noReport} />;
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
