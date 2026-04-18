import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, FileText, BarChart2, Calendar } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


interface FinancialReport {
  id: number;
  title: string;
  reportType: string;
  period: string;
  pdfPath?: string;
  generatedById: number;
  generatedBy?: { id: number; fullName: string };
  createdAt: string;
}

const TYPE_STYLES: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  QUARTERLY: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  ANNUAL: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export default function FinancialReports() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", reportType: "MONTHLY", period: "", pdfPath: "" });

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/financial-reports`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/financial-reports/${editingId}` : `${API_BASE_URL}/financial-reports`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: "", reportType: "MONTHLY", period: "", pdfPath: "" });
        setEditingId(null);
        setShowForm(false);
        fetchReports();
      }
    } catch { }
  };

  const handleEdit = (r: FinancialReport) => {
    setForm({ title: r.title, reportType: r.reportType, period: r.period, pdfPath: r.pdfPath || "" });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this report?", "حذف هذا التقرير؟"))) return;
    await fetch(`${API_BASE_URL}/financial-reports/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchReports();
  };

  const monthly = reports.filter(r => r.reportType === "MONTHLY").length;
  const quarterly = reports.filter(r => r.reportType === "QUARTERLY").length;
  const annual = reports.filter(r => r.reportType === "ANNUAL").length;

  return (
    <ModulePageShell
      title={nav("Financial Reports", "التقارير المالية")}
      subtitle={nav("Generate and access financial reports", "إنشاء الوصول إلى التقارير المالية")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Monthly Reports", "التقارير الشهرية")}</p>
              <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{monthly}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Quarterly Reports", "التقارير الفصلية")}</p>
              <BarChart2 size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{quarterly}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Annual Reports", "التقارير السنوية")}</p>
              <FileText size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{annual}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Reports", "التقارير")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Report", "إضافة تقرير")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Report", "تعديل التقرير") : nav("New Report", "تقرير جديد")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Report Title", "عنوان التقرير")}</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Report Type", "نوع التقرير")}</label>
                  <select value={form.reportType} onChange={e => setForm({ ...form, reportType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Period", "الفترة")}</label>
                  <input type="text" placeholder="e.g. Q1 2025, Jan 2025" value={form.period}
                    onChange={e => setForm({ ...form, period: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("PDF Path (optional)", "مسار PDF (اختياري)")}</label>
                  <input type="text" value={form.pdfPath} onChange={e => setForm({ ...form, pdfPath: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
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
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <FileText className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No reports yet. Click 'Add Report' to create one.", "لا توجد تقارير بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Title", "العنوان")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Type", "النوع")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Period", "الفترة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Generated By", "أنشأه")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Date", "التاريخ")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{r.title}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_STYLES[r.reportType] ?? TYPE_STYLES.MONTHLY}`}>
                          {nav(r.reportType, r.reportType === "MONTHLY" ? "شهري" : r.reportType === "QUARTERLY" ? "فصلي" : "سنوي")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.period}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{r.generatedBy?.fullName ?? "—"}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          {r.pdfPath && (
                            <a href={r.pdfPath} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500">
                              <FileText size={14} />
                            </a>
                          )}
                          <button onClick={() => handleEdit(r)}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModulePageShell>
  );
}
