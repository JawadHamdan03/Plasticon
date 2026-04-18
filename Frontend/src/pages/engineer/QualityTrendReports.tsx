import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function QualityTrendReports() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  return (
    <ModulePageShell
      title="Quality Trends"
      subtitle="Track quality metrics and trend analysis"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Pass Rate", "معدل النجاح")}</p>
            <p className="text-2xl font-bold">96.2%</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Defects Found", "العيوب المكتشفة")}</p>
            <p className="text-2xl font-bold">23</p>
          </Card>
          <Card className="p-4 bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-slate-600">{nav("Critical Issues", "مشاكل حرجة")}</p>
            <p className="text-2xl font-bold">2</p>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-slate-500 text-center py-8">{nav("Quality trend charts will appear here", "ستظهر مخططات اتجاهات الجودة هنا")}</p>
        </Card>
      </div>
    </ModulePageShell>
  );
}
