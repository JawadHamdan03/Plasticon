import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface CostAnalysis {
  id: number;
  category: string;
  cost: number;
  percentage: number;
  period: string;
  notes?: string;
}

export default function CostAnalysis() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [analyses, setAnalyses] = useState<CostAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    category: "",
    cost: 0,
    percentage: 0,
    period: "",
    notes: "",
  });

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/cost-analysis", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/cost-analysis/${editingId}`
        : "http://localhost:8080/cost-analysis";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          cost: parseFloat(String(form.cost)),
          percentage: parseFloat(String(form.percentage)),
        }),
      });

      if (response.ok) {
        setForm({ category: "", cost: 0, percentage: 0, period: "", notes: "" });
        setEditingId(null);
        setShowForm(false);
        fetchAnalyses();
      }
    } catch (error) {
      console.error("Failed to save analysis:", error);
    }
  };

  const handleEdit = (analysis: CostAnalysis) => {
    setForm({
      category: analysis.category,
      cost: analysis.cost,
      percentage: analysis.percentage,
      period: analysis.period.split("T")[0],
      notes: analysis.notes || "",
    });
    setEditingId(analysis.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/cost-analysis/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnalyses();
    } catch (error) {
      console.error("Failed to delete analysis:", error);
    }
  };

  const totalCost = analyses.reduce((sum, a) => sum + a.cost, 0);

  return (
    <ModulePageShell
      title="Cost Analysis"
      subtitle="Analyze cost distribution and trends"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Cost Analysis", "تحليل التكاليف")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Analysis", "إضافة تحليل")}
          </Button>
        </div>

        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-slate-600">{nav("Total Cost", "التكلفة الإجمالية")}</p>
          <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
        </Card>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={nav("Category", "الفئة")}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Cost", "التكلفة")}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <input
                  type="number"
                  placeholder={nav("Percentage", "نسبة مئوية")}
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  min="0"
                  max="100"
                />
                <input
                  type="month"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <textarea
                placeholder={nav("Notes", "ملاحظات")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 border rounded-md bg-white dark:bg-slate-700"
                >
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : analyses.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No analyses yet", "لا توجد تحليلات حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Category", "الفئة")}</th>
                  <th className="text-left py-3 px-4">{nav("Cost", "التكلفة")}</th>
                  <th className="text-left py-3 px-4">{nav("Percentage", "نسبة مئوية")}</th>
                  <th className="text-left py-3 px-4">{nav("Period", "الفترة")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">{analysis.category}</td>
                    <td className="py-3 px-4">${analysis.cost.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded h-2">
                          <div
                            className="bg-blue-500 h-2 rounded"
                            style={{ width: `${Math.min(analysis.percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span>{analysis.percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">{new Date(analysis.period).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(analysis)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(analysis.id)}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
