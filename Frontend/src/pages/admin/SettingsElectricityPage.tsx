import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Zap, TrendingUp, AlertTriangle, BarChart3, Settings, CheckCircle, History } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { useLocale } from "../../context/LocaleContext";

type KwhPrice = { id: number; price: number; effectiveFrom: string; notes: string | null; setBy: { fullName: string; username: string } };
type ShiftRecord = {
  id: number;
  date: string;
  shift: { id: number; name: string };
  startReading: number;
  endReading: number;
  consumption: number;
  kwhPriceSnap: number;
  shiftCost: number;
  isMeterReset: boolean;
  notes: string | null;
};
type DayRow = {
  date: string;
  shifts: ShiftRecord[];
  totalConsumption: number;
  totalCost: number;
};
type Report = {
  range: { fromDate: string; toDate: string };
  currentKwhPrice: number;
  days: DayRow[];
  summary: { totalConsumption: number; totalCost: number; totalReadings: number; currentKwhPrice: number };
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

const fmtNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function shiftColor(name: string) {
  if (name.includes("A")) return "#3b82f6";
  if (name.includes("B")) return "#f97316";
  if (name.includes("C")) return "#8b5cf6";
  return "#64748b";
}

const downloadCsv = (filename: string, header: string[], rows: string[][]) => {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((line) => line.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
};

export function SettingsElectricityPage() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [report, setReport] = useState<Report | null>(null);
  const [priceHistory, setPriceHistory] = useState<KwhPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"report" | "price">("report");

  // Price form
  const [newPrice, setNewPrice] = useState("");
  const [priceNotes, setPriceNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const [rpt, history] = await Promise.all([
        api<Report>(`/electricity/report?${params.toString()}`),
        api<KwhPrice[]>("/electricity/kwh-price/history"),
      ]);
      setReport(rpt);
      setPriceHistory(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to load", "فشل التحميل"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const handleSetPrice = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(""); setSuccess("");
    try {
      await api("/electricity/kwh-price", {
        method: "POST",
        body: JSON.stringify({ price: Number(newPrice), notes: priceNotes || undefined }),
      });
      setSuccess(nav("kWh price updated successfully", "تم تحديث سعر kWh بنجاح"));
      setNewPrice(""); setPriceNotes("");
      void loadReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to update price", "فشل تحديث السعر"));
    } finally {
      setSaving(false);
    }
  };

  const view = useMemo(() => {
    if (!report) return null;
    return {
      totalConsumption: report.summary.totalConsumption,
      totalCost: report.summary.totalCost,
      totalReadings: report.summary.totalReadings,
      currentKwhPrice: report.currentKwhPrice,
      days: report.days,
    };
  }, [report]);

  const exportCsv = () => {
    if (!view) return;
    const rows: string[][] = [];
    for (const day of view.days) {
      for (const shift of day.shifts) {
        rows.push([
          day.date,
          shift.shift.name,
          fmtNum(shift.startReading),
          fmtNum(shift.endReading),
          fmtNum(shift.consumption),
          fmtNum(shift.kwhPriceSnap),
          fmtNum(shift.shiftCost),
          shift.isMeterReset ? "Yes" : "No",
          shift.notes ?? "",
        ]);
      }
    }
    downloadCsv(
      `electricity-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["date", "shift", "startReading", "endReading", "consumption_kWh", "price_kWh", "cost_ILS", "meterReset", "notes"],
      rows,
    );
  };

  const tabs = [
    { id: "report" as const, label: nav("Consumption Report", "تقرير الاستهلاك"), icon: <BarChart3 size={15} /> },
    { id: "price" as const, label: nav("kWh Price", "سعر kWh"), icon: <Settings size={15} /> },
  ];

  return (
    <ModulePageShell
      title={nav("Electricity Management", "إدارة الكهرباء")}
      subtitle={nav(
        "Monitor electricity consumption by shift, manage kWh pricing and view cost reports.",
        "مراقبة استهلاك الكهرباء حسب الشفت، وإدارة سعر kWh وعرض تقارير التكلفة.",
      )}
      actions={
        view && (
          <span style={{ fontSize: ".8rem", fontWeight: 700, padding: ".3rem .75rem", borderRadius: "999px", background: "var(--bg-subtle)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
            <Zap size={12} style={{ display: "inline", marginRight: 4 }} />
            {nav("Current Price", "السعر الحالي")}: {fmtNum(view.currentKwhPrice)} ILS/kWh
          </span>
        )
      }
    >
      {error ? <div className="auth-alert auth-alert--error mb-4">{error}</div> : null}
      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "#dcfce7", color: "#15803d", marginBottom: "1rem", fontWeight: 600 }}>
          <CheckCircle size={16} />
          {success}
        </div>
      ) : null}

      {/* Tabs */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-default)", paddingBottom: "0" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: ".4rem",
              padding: ".6rem 1.1rem", border: "none", background: "none",
              cursor: "pointer", fontSize: ".875rem", fontWeight: 600,
              color: activeTab === t.id ? "var(--brand-primary)" : "var(--text-secondary)",
              borderBottom: activeTab === t.id ? "2px solid var(--brand-primary)" : "2px solid transparent",
              marginBottom: -2,
              transition: "color .15s",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "report" && (
        <>
          {/* Filter bar */}
          <Card className="p-4 mb-6">
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {nav("From date", "من تاريخ")}
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".25rem", fontSize: ".85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {nav("To date", "إلى تاريخ")}
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }} />
              </label>
              <button type="button" className="auth-button" onClick={() => void loadReport()}>{nav("Apply", "تطبيق")}</button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => { setFromDate(""); setToDate(""); }}>
                {nav("Clear", "مسح")}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={exportCsv}
                disabled={!view?.days.length}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".4rem" }}>
                <Download size={14} />
                {nav("Export CSV", "تصدير CSV")}
              </button>
            </div>
          </Card>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>{nav("Loading…", "جاري التحميل…")}</div>
          ) : view ? (
            <>
              {/* KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: nav("Total Readings", "إجمالي القراءات"), value: view.totalReadings, unit: "", icon: <BarChart3 className="w-5 h-5" />, grad: "from-blue-500 to-blue-700" },
                  { label: nav("Total Consumption", "إجمالي الاستهلاك"), value: fmtNum(view.totalConsumption), unit: "kWh", icon: <Zap className="w-5 h-5" />, grad: "from-yellow-500 to-orange-600" },
                  { label: nav("Total Cost", "إجمالي التكلفة"), value: fmtNum(view.totalCost), unit: "ILS", icon: <TrendingUp className="w-5 h-5" />, grad: "from-green-500 to-emerald-700" },
                  {
                    label: nav("Missing Shifts", "شفتات ناقصة"),
                    value: Math.max(0, view.days.length * 3 - view.totalReadings),
                    unit: "",
                    icon: <AlertTriangle className="w-5 h-5" />,
                    grad: "from-red-500 to-rose-700",
                  },
                ].map((k) => (
                  <Card key={k.label} className={`bg-linear-to-br ${k.grad} p-4 text-white`}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
                      <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, opacity: .85 }}>{k.label}</p>
                      <span style={{ opacity: .8 }}>{k.icon}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>{k.value}</p>
                    {k.unit && <p style={{ margin: 0, fontSize: ".75rem", opacity: .75 }}>{k.unit}</p>}
                  </Card>
                ))}
              </div>

              {/* Daily breakdown */}
              {view.days.length === 0 ? (
                <Card className="p-8" style={{ textAlign: "center" }}>
                  <p style={{ color: "var(--text-secondary)" }}>{nav("No data in the selected range.", "لا توجد بيانات ضمن الفترة المحددة.")}</p>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {view.days.map((day) => (
                    <Card key={day.date} className="overflow-hidden">
                      {/* Day header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".75rem 1.25rem", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                        <strong style={{ fontSize: ".95rem", color: "var(--text-primary)" }}>
                          {new Date(day.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </strong>
                        <div style={{ display: "flex", gap: "1.5rem" }}>
                          <span style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
                            <strong style={{ color: "var(--brand-primary)" }}>{fmtNum(day.totalConsumption)}</strong> kWh
                          </span>
                          <span style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
                            <strong style={{ color: "#15803d" }}>{fmtNum(day.totalCost)}</strong> ILS
                          </span>
                        </div>
                      </div>

                      {/* Shifts */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 0 }}>
                        {day.shifts.map((s) => (
                          <div key={s.id} style={{ padding: "1rem 1.25rem", borderRight: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: shiftColor(s.shift.name) }} />
                              <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{s.shift.name}</span>
                              {s.isMeterReset && <span style={{ fontSize: ".7rem", padding: ".1rem .35rem", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>RESET</span>}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".25rem .5rem", fontSize: ".8rem", color: "var(--text-secondary)" }}>
                              <span>{nav("Start", "بداية")}</span><strong style={{ color: "var(--text-primary)" }}>{fmtNum(s.startReading)}</strong>
                              <span>{nav("End", "نهاية")}</span><strong style={{ color: "var(--text-primary)" }}>{fmtNum(s.endReading)}</strong>
                              <span>{nav("Consumed", "الاستهلاك")}</span><strong style={{ color: "var(--brand-primary)" }}>{fmtNum(s.consumption)} kWh</strong>
                              <span>{nav("Cost", "التكلفة")}</span><strong style={{ color: "#15803d" }}>{fmtNum(s.shiftCost)} ILS</strong>
                            </div>
                            {s.notes && <p style={{ margin: ".5rem 0 0", fontSize: ".75rem", color: "var(--text-muted)", fontStyle: "italic" }}>{s.notes}</p>}
                          </div>
                        ))}
                        {/* Placeholder for missing shifts */}
                        {Array.from({ length: Math.max(0, 3 - day.shifts.length) }).map((_, i) => (
                          <div key={`missing-${i}`} style={{ padding: "1rem 1.25rem", borderRight: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)", opacity: .4 }}>
                            <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-muted)", fontStyle: "italic" }}>{nav("Shift not recorded", "شفت غير مسجل")}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {activeTab === "price" && (
        <div className="layout-sidebar-form">
          {/* Set new price */}
          <Card className="p-5">
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Zap size={18} style={{ color: "var(--brand-primary)" }} />
              {nav("Set kWh Price", "تحديد سعر kWh")}
            </h3>
            <form onSubmit={(e) => void handleSetPrice(e)}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("New kWh Price (ILS) *", "سعر kWh الجديد (ILS) *")}</span>
                <input type="number" className="module-form__input" min={0.001} step="any" required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="e.g. 0.68" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{nav("Notes", "ملاحظات")}</span>
                <textarea className="module-form__input" rows={2} value={priceNotes} onChange={(e) => setPriceNotes(e.target.value)} placeholder={nav("Reason for price change…", "سبب تغيير السعر…")} style={{ resize: "vertical" }} />
              </label>
              <button type="submit" className="auth-button" disabled={saving || !newPrice}>
                {saving ? nav("Saving…", "جاري الحفظ…") : nav("Save Price", "حفظ السعر")}
              </button>
            </form>
            {priceHistory.length > 0 && (
              <div style={{ marginTop: "1rem", padding: ".75rem", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)" }}>
                <p style={{ margin: "0 0 .25rem", fontSize: ".75rem", fontWeight: 700, color: "var(--text-secondary)" }}>{nav("Current Price", "السعر الحالي")}:</p>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--brand-primary)" }}>{fmtNum(priceHistory[0].price)} ILS/kWh</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
                  {nav("Effective from", "ساري من")}: {new Date(priceHistory[0].effectiveFrom).toLocaleDateString()}
                </p>
              </div>
            )}
          </Card>

          {/* Price history table */}
          <Card className="overflow-hidden">
            <div style={{ padding: "1rem 1.25rem .75rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <History size={16} style={{ color: "var(--text-secondary)" }} />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{nav("Price History", "سجل الأسعار")}</h3>
            </div>
            {priceHistory.length === 0 ? (
              <p style={{ padding: "2rem 1.25rem", color: "var(--text-secondary)", textAlign: "center" }}>{nav("No price history.", "لا يوجد سجل أسعار.")}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{nav("Price (ILS/kWh)", "السعر (ILS/kWh)")}</th>
                      <th>{nav("Effective From", "ساري من")}</th>
                      <th>{nav("Set By", "حدده")}</th>
                      <th>{nav("Notes", "ملاحظات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>{priceHistory.length - idx}</td>
                        <td>
                          <strong style={{ color: idx === 0 ? "var(--brand-primary)" : "var(--text-primary)" }}>
                            {fmtNum(p.price)}
                          </strong>
                          {idx === 0 && (
                            <span style={{ marginLeft: ".4rem", fontSize: ".7rem", padding: ".1rem .3rem", borderRadius: "4px", background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                              {nav("CURRENT", "الحالي")}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: ".85rem" }}>{new Date(p.effectiveFrom).toLocaleString()}</td>
                        <td style={{ fontSize: ".85rem" }}>{p.setBy.fullName}</td>
                        <td style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>{p.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </ModulePageShell>
  );
}
