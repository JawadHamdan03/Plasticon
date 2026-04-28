import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface QualityCheck {
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  checkType: string; result: "PASS" | "FAIL";
  severity?: "LOW" | "MEDIUM" | "HIGH";
  notes?: string; checkedAt: string;
  checkedBy?: { id: number; fullName: string };
}

export default function QualityTrendReports() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchChecks(); }, [user?.role]);

  const fetchChecks = async () => {
    const isAdmin = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";
    const endpoint = isAdmin ? "/quality-checks/all" : "/quality-checks/me";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { ...authHeaders() }, credentials: "include" });
      if (res.ok) { const d = await res.json(); setChecks(Array.isArray(d) ? d : (d.data || [])); }
    } catch { } finally { setLoading(false); }
  };

  const passCount = checks.filter(c => c.result === "PASS").length;
  const failCount = checks.filter(c => c.result === "FAIL").length;
  const passRate = checks.length > 0 ? ((passCount / checks.length) * 100).toFixed(1) : "0.0";
  const criticalCount = checks.filter(c => c.severity === "HIGH" && c.result === "FAIL").length;

  const SEVERITY_META = {
    HIGH:   { color: "#dc2626", bg: "#fee2e2" },
    MEDIUM: { color: "#d97706", bg: "#fef3c7" },
    LOW:    { color: "#059669", bg: "#d1fae5" },
  };

  return (
    <ModulePageShell
      title={nav("Quality Trends", "اتجاهات الجودة")}
      subtitle={nav("Track quality metrics and trend analysis", "تتبع مقاييس الجودة وتحليل الاتجاهات")}
      icon={<TrendingUp size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Pass Rate", "معدل النجاح"), value: `${passRate}%`, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Defects Found", "العيوب المكتشفة"), value: failCount, icon: "⚠️", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Critical Issues", "مشاكل حرجة"), value: criticalCount, icon: "🚨", color: "#dc2626", bg: "#fee2e2" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : checks.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No quality checks found", "لم يتم العثور على فحوصات جودة")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Machine", "الآلة")}</th>
                  <th>{nav("Check Type", "نوع الفحص")}</th>
                  <th>{nav("Result", "النتيجة")}</th>
                  <th>{nav("Severity", "الخطورة")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                </tr>
              </thead>
              <tbody>
                {checks.map(c => {
                  const sevMeta = c.severity ? SEVERITY_META[c.severity] : null;
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.machine?.name || `Machine #${c.machineId}`}</td>
                      <td className="text-sm text-[var(--text-secondary)]">{c.checkType || "—"}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: c.result === "PASS" ? "#d1fae5" : "#fee2e2", color: c.result === "PASS" ? "#059669" : "#dc2626" }}>
                          {c.result === "PASS" ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                          {c.result}
                        </span>
                      </td>
                      <td>
                        {sevMeta ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{ background: sevMeta.bg, color: sevMeta.color }}>{c.severity}</span>
                        ) : <span className="text-[var(--text-secondary)]">—</span>}
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">{new Date(c.checkedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
