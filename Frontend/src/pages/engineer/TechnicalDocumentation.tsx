import { FileText, Download, Clock } from "lucide-react";
import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function TechnicalDocumentation() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const docs = [
    { id: 1, title: "Machine A - User Manual", category: "Manual", updated: "2026-03-15", downloads: 24 },
    { id: 2, title: "Machine B - Maintenance Guide", category: "Maintenance", updated: "2026-02-20", downloads: 18 },
    { id: 3, title: "Safety Procedures Overview", category: "Safety", updated: "2026-01-10", downloads: 42 },
    { id: 4, title: "Calibration Standards", category: "Reference", updated: "2026-03-01", downloads: 12 },
    { id: 5, title: "Troubleshooting Guide", category: "Support", updated: "2026-02-28", downloads: 35 },
  ];

  const categories = ["All", "Manual", "Maintenance", "Safety", "Reference", "Support"];

  return (
    <ModulePageShell
      title="Technical Documentation"
      subtitle="Access and manage technical resources and manuals"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Documents", "إجمالي الوثائق")}</p>
              <FileText size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{docs.length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Recently Updated", "محدث مؤخرا")}</p>
              <Clock size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{docs.filter(d => new Date(d.updated) > new Date(Date.now() - 30*24*60*60*1000)).length}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{nav("Total Downloads", "إجمالي التنزيلات")}</p>
              <Download size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{docs.reduce((s, d) => s + d.downloads, 0)}</p>
          </Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} className={`px-3 py-1 text-sm rounded-full transition-all ${
              cat === "All"
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}>
              {cat}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Title", "العنوان")}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Category", "الفئة")}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Updated", "آخر تحديث")}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Downloads", "التنزيلات")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(doc.updated).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600 dark:text-slate-400">{doc.downloads}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ModulePageShell>
  );
}
