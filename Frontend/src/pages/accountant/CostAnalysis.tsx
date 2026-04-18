import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, PieChart } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface CostAnalysis {
  id: number;
  category: string;
  cost: number;
  percentage: number;
  period: string;
  notes?: string;
}

const BAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500",
  "bg-red-500", "bg-teal-500", "bg-pink-500", "bg-yellow-500",
];

export default function CostAnalysis() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [analyses, setAnalyses] = useState<CostAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: "", cost: 0, percentage: 0, period: "", notes: "" });

  useEffect(() => { fetchAnalyses(); }, []);

  const fetchAnalyses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cost-analysis`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/cost-analysis/${editingId}` : `${API_BASE_URL}/cost-analysis`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ ...form, cost: parseFloat(String(form.cost)), percentage: parseFloat(String(form.percentage)) }),
      });
      if (res.ok) {
        setForm({ category: "", cost: 0, percentage: 0, period: "", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchAnalyses();
      }
    } catch { }
  };

  const handleEdit = (a: CostAnalysis) => {
    setForm({ category: a.category, cost: a.cost, percentage: a.percentage, period: a.period.split("T")[0], notes: a.notes || "" });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this analysis?", "حذف هذا التحليل؟"))) return;
    await fetch(`${API_BASE_URL}/cost-analysis/${id}`, {
      method: "DELETE", headers: { ...authHeaders() }, credentials: "include",
    });
    fetchAnalyses();
  };

  const totalCost = analyses.reduce((s, a) => s + a.cost, 0);
  const topCategory = analyses.reduce((top, a) => (a.cost > (top?.cost ?? 0) ? a : top), analyses[0]);

  return (
    <ModulePageShell
      title={nav("Cost Analysis", "تحليل التكاليف")}
      subtitle={nav("Analyze cost distribution and trends", "تحليل توزيع التكاليف والاتجاهات")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Cost", "التكلفة الإجمالية")}</p>
              <PieChart size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${totalCost.toFixed(2)}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Categories", "الفئات")}</p>
              <PieChart size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{analyses.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Top Category", "أعلى فئة")}</p>
              <PieChart size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-300 truncate">
              {topCategory?.category ?? "—"}
            </p>
          </Card>
        </div>

        {/* Visual breakdown */}
        {analyses.length > 0 && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{nav("Cost Distribution", "توزيع التكاليف")}</h3>
            <div className="space-y-3">
              {[...analyses].sort((a, b) => b.cost - a.cost).map((a, idx) => {
                const pct = totalCost > 0 ? (a.cost / totalCost) * 100 : 0;
                return (
                  <div key={a.id}>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <span className="font-medium">{a.category}</span>
                      <span>${a.cost.toFixed(2)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Cost Entries", "مدخلات التكاليف")}</h2>
          {!isAdmin && (
            <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
              <Plus size={16} />
              {nav("Add Analysis", "إضافة تحليل")}
            </Button>
          )}
        </div>

        {/* Form */}
        {!isAdmin && showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Analysis", "تعديل التحليل") : nav("New Cost Entry", "إدخال تكلفة جديد")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Category", "الفئة")}</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Cost ($)", "التكلفة ($)")}</label>
                  <input type="number" min={0} step={0.01} value={form.cost}
                    onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Percentage (%)", "النسبة المئوية (%)")}</label>
                  <input type="number" min={0} max={100} step={0.1} value={form.percentage}
                    onChange={e => setForm({ ...form, percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Period", "الفترة")}</label>
                  <input type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Notes", "ملاحظات")}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : analyses.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <PieChart className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No cost entries yet. Click 'Add Analysis' to start.", "لا توجد مدخلات تكاليف بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Category", "الفئة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Cost", "التكلفة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Share", "الحصة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Period", "الفترة")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {analyses.map((a, idx) => {
                    const sharePct = totalCost > 0 ? (a.cost / totalCost) * 100 : 0;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{a.category}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">${a.cost.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                              <div className={`h-2 rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                                style={{ width: `${sharePct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{sharePct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {a.period ? new Date(a.period).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {!isAdmin && (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => handleEdit(a)}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDelete(a.id)}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
