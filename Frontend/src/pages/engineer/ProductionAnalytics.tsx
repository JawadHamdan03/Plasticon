import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function ProductionAnalytics() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  return (
    <ModulePageShell
      title="Production Analytics"
      subtitle="Analyze production metrics and performance trends"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Units Produced", "الوحدات المُنتجة")}</p>
            <p className="text-2xl font-bold">1,245</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Efficiency", "الكفاءة")}</p>
            <p className="text-2xl font-bold">92%</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Downtime", "التوقف")}</p>
            <p className="text-2xl font-bold">2.5h</p>
          </Card>
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
            <p className="text-sm text-slate-600">{nav("Quality Rate", "معدل الجودة")}</p>
            <p className="text-2xl font-bold">98.5%</p>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-slate-500 text-center py-8">{nav("Production analytics data will appear here", "ستظهر بيانات تحليل الإنتاج هنا")}</p>
        </Card>
      </div>
    </ModulePageShell>
  );
}
