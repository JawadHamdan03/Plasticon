import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Zap, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { TruckLoader } from "../../components/TruckLoader";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { useLocale } from "../../context/LocaleContext";

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
  range: { fromDate: string; toDate: string };
  shifts: ShiftConsumptionRow[];
  days: DayConsumptionRow[];
  summary: {
    totalConsumedKwh: number;
    totalCostIls: number;
    totalShiftRows: number;
    missingReadings: number;
  };
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const downloadCsv = (filename: string, header: string[], rows: string[][]) => {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((line) => line.map(esc).join(",")).join("\n");
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

export function SettingsElectricityPage() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => (locale === "ar" ? ar : en);

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
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const res = await fetch(
        `${API_BASE_URL}/settings/snapshots/shift-consumption?${params.toString()}`,
        { headers: authHeaders(), credentials: "include" },
      );

      if (!res.ok) throw new Error(await readApiError(res));
      setReport((await res.json()) as ShiftConsumptionReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to load", "فشل التحميل"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const view = useMemo(() => {
    if (!report) return { tariffPerKwh: 0, totalRows: 0, totalKwh: 0, totalCost: 0, missingShifts: 0, shiftRows: [] as ShiftConsumptionRow[], dayRows: [] as DayConsumptionRow[] };
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
      row.date, row.day, row.shiftName,
      row.meterReadingKwh === null ? "" : row.meterReadingKwh.toFixed(2),
      row.consumedKwh === null ? "" : row.consumedKwh.toFixed(2),
      row.costIls === null ? "" : row.costIls.toFixed(2),
      row.recordedAt ?? "",
    ]);
    downloadCsv(
      `electricity-shift-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["date", "day", "shift", "meterReadingKwh", "consumedKwh", "costIls", "recordedAt"],
      rows,
    );
  };

  const kpis = [
    {
      label: nav("Total Shifts", "إجمالي الشفتات"),
      value: view.totalRows,
      unit: "",
      icon: <BarChart3 className="w-5 h-5" />,
      gradient: "bg-linear-to-br from-blue-500 to-blue-700",
    },
    {
      label: nav("Total kWh", "إجمالي kWh"),
      value: view.totalKwh.toFixed(2),
      unit: "kWh",
      icon: <Zap className="w-5 h-5" />,
      gradient: "bg-linear-to-br from-yellow-500 to-orange-600",
    },
    {
      label: nav("Total Cost", "إجمالي التكلفة"),
      value: view.totalCost.toFixed(2),
      unit: "ILS",
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: "bg-linear-to-br from-green-500 to-emerald-700",
    },
    {
      label: nav("Missing Shifts", "شفتات ناقصة"),
      value: view.missingShifts,
      unit: "",
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: "bg-linear-to-br from-red-500 to-rose-700",
    },
  ];

  return (
    <ModulePageShell
      title={nav("Electricity", "الكهرباء")}
      subtitle={nav(
        "Shared meter report by shift with daily total consumption and cost.",
        "تقرير استهلاك الكهرباء حسب الشفت من عداد مشترك، مع إجمالي اليوم والتكلفة.",
      )}
      actions={
        <span
          style={{
            fontSize: ".8rem",
            fontWeight: 600,
            padding: ".3rem .75rem",
            borderRadius: "999px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          {nav("Tariff", "التسعيرة")}: {view.tariffPerKwh.toFixed(2)} ILS/kWh
        </span>
      }
    >
      {/* Filter bar */}
      <Card className="p-4 mb-6">
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {nav("From date", "من تاريخ")}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {nav("To date", "إلى تاريخ")}
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}
            />
          </label>
          <button
            type="button"
            className="auth-button"
            onClick={() => void loadReport()}
          >
            {nav("Apply", "تطبيق")}
          </button>
          <button
            type="button"
            className="auth-button auth-button--ghost"
            onClick={() => { setFromDate(""); setToDate(""); }}
          >
            {nav("Clear", "مسح")}
          </button>
          <button
            type="button"
            className="auth-button auth-button--ghost"
            onClick={exportCsv}
            disabled={!view.shiftRows.length}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".4rem" }}
          >
            <Download className="w-4 h-4" />
            {nav("Export CSV", "تصدير CSV")}
          </button>
        </div>
      </Card>

      {error ? <div className="auth-alert auth-alert--error mb-4">{error}</div> : null}
      {loading ? <TruckLoader /> : null}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`${kpi.gradient} p-4 text-white`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".5rem" }}>
              <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, opacity: .85 }}>{kpi.label}</p>
              <span style={{ opacity: .8 }}>{kpi.icon}</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-.03em" }}>
              {kpi.value}
            </p>
            {kpi.unit ? <p style={{ margin: 0, fontSize: ".75rem", opacity: .75 }}>{kpi.unit}</p> : null}
          </Card>
        ))}
      </div>

      {/* Two-column tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem", alignItems: "start" }}>
        {/* Shift details table */}
        <Card className="overflow-hidden">
          <div style={{ padding: "1rem 1.25rem .75rem", borderBottom: "1px solid var(--border-default)" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {nav("Shift Consumption Details", "تفاصيل استهلاك الشفتات")}
            </h2>
          </div>
          {view.shiftRows.length === 0 && !loading ? (
            <p style={{ padding: "2rem 1.25rem", color: "var(--text-secondary)", textAlign: "center" }}>
              {nav("No data in the selected range.", "لا توجد بيانات ضمن الفترة الحالية.")}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{nav("Date", "التاريخ")}</th>
                    <th>{nav("Day", "اليوم")}</th>
                    <th>{nav("Shift", "الشفت")}</th>
                    <th>{nav("Meter (kWh)", "العداد (kWh)")}</th>
                    <th>{nav("Consumed (kWh)", "الاستهلاك (kWh)")}</th>
                    <th>{nav("Cost (ILS)", "التكلفة (ILS)")}</th>
                    <th>{nav("Recorded At", "وقت التسجيل")}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.shiftRows.map((row, idx) => (
                    <tr key={`${row.date}-${row.shiftId}-${idx}`}>
                      <td>{row.date}</td>
                      <td>{row.day}</td>
                      <td>
                        <span style={{ padding: ".2rem .6rem", borderRadius: "999px", background: "var(--bg-subtle)", fontSize: ".8rem", fontWeight: 600 }}>
                          {row.shiftName}
                        </span>
                      </td>
                      <td>{row.meterReadingKwh === null ? <span style={{ color: "var(--text-muted)" }}>—</span> : row.meterReadingKwh.toFixed(2)}</td>
                      <td>
                        {row.consumedKwh === null ? (
                          <span style={{ color: "var(--clr-danger)", fontSize: ".8rem" }}>{nav("Missing", "غير مسجل")}</span>
                        ) : (
                          <strong>{row.consumedKwh.toFixed(2)}</strong>
                        )}
                      </td>
                      <td>{row.costIls === null ? <span style={{ color: "var(--text-muted)" }}>—</span> : row.costIls.toFixed(2)}</td>
                      <td style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                        {row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Daily totals */}
        <Card className="overflow-hidden">
          <div style={{ padding: "1rem 1.25rem .75rem", borderBottom: "1px solid var(--border-default)" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {nav("Daily Totals", "إجمالي كل يوم")}
            </h2>
          </div>
          {view.dayRows.length === 0 ? (
            <p style={{ padding: "2rem 1.25rem", color: "var(--text-secondary)", textAlign: "center" }}>
              {nav("No data.", "لا توجد بيانات.")}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{nav("Date", "التاريخ")}</th>
                    <th>{nav("Day", "اليوم")}</th>
                    <th>{nav("kWh", "kWh")}</th>
                    <th>{nav("Cost", "التكلفة")}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.dayRows.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.day}</td>
                      <td><strong>{row.totalConsumedKwh.toFixed(2)}</strong></td>
                      <td>{row.totalCostIls.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ModulePageShell>
  );
}
