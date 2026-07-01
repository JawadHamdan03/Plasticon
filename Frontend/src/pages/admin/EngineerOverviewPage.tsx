import { useEffect, useState } from "react";
import {
  Activity,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

type Tab = "health" | "spare-parts" | "schedules" | "quality";

interface HealthRecord {
  id: number;
  machineId: number;
  machine?: { id: number; name: string };
  operationalStatus: string;
  downtimePercentage: number;
  efficiencyRating: number;
  recordedAt: string;
  recordedBy?: { fullName: string };
}
interface SparePart {
  id: number;
  name: string;
  machineId: number;
  machine?: { id: number; name: string };
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  supplier?: string;
}
interface Schedule {
  id: number;
  machineId: number;
  machine?: { id: number; name: string };
  scheduleType: string;
  frequency: string;
  nextScheduledDate: string;
  status: string;
  assignedEngineer?: { fullName: string };
}
interface QualityCheck {
  id: number;
  issueType: string;
  severity: string;
  description?: string;
  resolvedAt?: string;
  createdAt: string;
  machine?: { name: string };
  engineer?: { fullName: string };
}

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MAINTENANCE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DOWNTIME: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const SEV_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  HIGH: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  CRITICAL: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200",
};

const TABS: {
  key: Tab;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "health",
    label: "Machine Health",
    labelAr: "صحة الآلات",
    icon: <Activity size={15} />,
  },
  {
    key: "spare-parts",
    label: "Spare Parts",
    labelAr: "قطع الغيار",
    icon: <Package size={15} />,
  },
  {
    key: "schedules",
    label: "Maintenance Schedules",
    labelAr: "جداول الصيانة",
    icon: <Calendar size={15} />,
  },
  {
    key: "quality",
    label: "Quality Checks",
    labelAr: "فحص الجودة",
    icon: <CheckCircle size={15} />,
  },
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function EngineerOverviewPage() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const [activeTab, setActiveTab] = useState<Tab>("health");

  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [quality, setQuality] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const headers = { ...authHeaders() };
    const [h, p, s, q] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/machine-health`, { headers, credentials: "include" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      fetch(`${API_BASE_URL}/spare-parts`, { headers, credentials: "include" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      fetch(`${API_BASE_URL}/maintenance-schedule`, { headers,
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE_URL}/quality-checks/all`, { headers,
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (h.status === "fulfilled" && h.value)
      setHealth(h.value.data ?? h.value ?? []);
    if (p.status === "fulfilled" && p.value)
      setParts(p.value.data ?? p.value ?? []);
    if (s.status === "fulfilled" && s.value)
      setSchedules(s.value.data ?? s.value ?? []);
    if (q.status === "fulfilled" && q.value)
      setQuality(Array.isArray(q.value) ? q.value : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const isOverdue = (date: string) => new Date(date) < new Date();

  return (
    <ModulePageShell
      title={"نظرة عامة على المهندسين"}
      subtitle="عرض إداري لجميع بيانات المهندسين في مكان واحد"
    >
      <div className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">
                {"سجلات الصحة"}
              </p>
              <Activity size={16} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {health.length}
            </p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">
                {"قطع منخفضة"}
              </p>
              <AlertTriangle size={16} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {parts.filter((p) => p.quantity <= p.minQuantity).length}
            </p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">
                {"جداول متأخرة"}
              </p>
              <Clock size={16} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {
                schedules.filter(
                  (s) =>
                    isOverdue(s.nextScheduledDate) && s.status !== "COMPLETED",
                ).length
              }
            </p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">
                {"مشاكل جودة مفتوحة"}
              </p>
              <Wrench size={16} className="text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {quality.filter((q) => !q.resolvedAt).length}
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.labelAr}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* MACHINE HEALTH */}
            {activeTab === "health" &&
              (health.length === 0 ? (
                <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
                  <Activity className="mx-auto mb-3 text-slate-400" size={40} />
                  <p className="text-slate-500">
                    {"لا توجد سجلات صحة بعد"}
                  </p>
                </Card>
              ) : (
                <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الآلة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الحالة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"توقف"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الكفاءة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"سجله"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"التاريخ"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {health.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {r.machine?.name || `Machine #${r.machineId}`}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.operationalStatus] ?? "bg-slate-100 text-slate-700"}`}
                              >
                                {r.operationalStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-14 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                  <div
                                    className="bg-orange-500 h-2 rounded-full"
                                    style={{
                                      width: `${r.downtimePercentage}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500">
                                  {r.downtimePercentage}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-14 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${r.efficiencyRating >= 80 ? "bg-green-500" : "bg-orange-500"}`}
                                    style={{ width: `${r.efficiencyRating}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500">
                                  {r.efficiencyRating}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {r.recordedBy?.fullName ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {new Date(r.recordedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}

            {/* SPARE PARTS */}
            {activeTab === "spare-parts" &&
              (parts.length === 0 ? (
                <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
                  <Package className="mx-auto mb-3 text-slate-400" size={40} />
                  <p className="text-slate-500">
                    {"لا توجد قطع غيار بعد"}
                  </p>
                </Card>
              ) : (
                <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"القطعة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الآلة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الكمية / الحد"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"السعر"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"المورد"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الحالة"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {parts.map((p) => {
                          const low = p.quantity <= p.minQuantity;
                          return (
                            <tr
                              key={p.id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${low ? "bg-orange-50/50 dark:bg-orange-900/10" : ""}`}
                            >
                              <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                {p.name}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                {p.machine?.name || `#${p.machineId}`}
                              </td>
                              <td
                                className={`py-3 px-4 font-semibold ${low ? "text-orange-700 dark:text-orange-300" : "text-slate-700 dark:text-slate-300"}`}
                              >
                                {p.quantity} / {p.minQuantity}
                              </td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                ${p.unitPrice.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {p.supplier || "—"}
                              </td>
                              <td className="py-3 px-4">
                                {low ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                                    <AlertTriangle size={11} />{" "}
                                    {"مخزون منخفض"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                    <CheckCircle size={11} /> {"جيد"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}

            {/* MAINTENANCE SCHEDULES */}
            {activeTab === "schedules" &&
              (schedules.length === 0 ? (
                <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
                  <Calendar className="mx-auto mb-3 text-slate-400" size={40} />
                  <p className="text-slate-500">
                    {"لا توجد جداول صيانة بعد"}
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {schedules.map((s) => {
                    const overdue =
                      isOverdue(s.nextScheduledDate) &&
                      s.status !== "COMPLETED";
                    return (
                      <Card
                        key={s.id}
                        className={`p-4 border-l-4 ${
                          s.status === "COMPLETED"
                            ? "border-l-green-500"
                            : overdue
                              ? "border-l-red-500"
                              : "border-l-blue-500"
                        } border border-slate-200 dark:border-slate-700`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                {s.machine?.name || `Machine #${s.machineId}`}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  s.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                    : overdue
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                }`}
                              >
                                {overdue ? "متأخر" : s.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {s.scheduleType} · {s.frequency} ·{" "}
                              {"موعد"}:{" "}
                              {new Date(
                                s.nextScheduledDate,
                              ).toLocaleDateString()}
                            </p>
                            {s.assignedEngineer && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {"المهندس"}:{" "}
                                {s.assignedEngineer.fullName}
                              </p>
                            )}
                          </div>
                          {s.status === "COMPLETED" ? (
                            <CheckCircle size={18} className="text-green-600" />
                          ) : (
                            <Clock size={18} className="text-blue-500" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ))}

            {/* QUALITY CHECKS */}
            {activeTab === "quality" &&
              (quality.length === 0 ? (
                <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
                  <CheckCircle
                    className="mx-auto mb-3 text-slate-400"
                    size={40}
                  />
                  <p className="text-slate-500">
                    {"لا توجد فحوصات جودة بعد"}
                  </p>
                </Card>
              ) : (
                <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الآلة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"نوع المشكلة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الخطورة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"المهندس"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"الحالة"}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                            {"التاريخ"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {quality.map((q) => (
                          <tr
                            key={q.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {q.machine?.name ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {q.issueType.replace(/_/g, " ")}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV_COLORS[q.severity] ?? "bg-slate-100 text-slate-700"}`}
                              >
                                {q.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {q.engineer?.fullName ?? "—"}
                            </td>
                            <td className="py-3 px-4">
                              {q.resolvedAt ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                  <CheckCircle size={10} />{" "}
                                  {"محلول"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                                  <Clock size={10} /> {"مفتوح"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {new Date(q.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
          </>
        )}
      </div>
    </ModulePageShell>
  );
}
