import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function EquipmentLifecycleTracking() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const mockData = [
    { id: 1, equipment: "Machine A", status: "Active", age: "3 years", nextMaint: "2026-05-15" },
    { id: 2, equipment: "Machine B", status: "Active", age: "1 year", nextMaint: "2026-06-20" },
    { id: 3, equipment: "Machine C", status: "Maintenance", age: "5 years", nextMaint: "2026-04-25" },
  ];

  return (
    <ModulePageShell
      title="Equipment Lifecycle"
      subtitle="Monitor equipment status and lifecycle stages"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Active Equipment", "معدات نشطة")}</p>
            <p className="text-2xl font-bold">12</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Deprecated", "مستقطع")}</p>
            <p className="text-2xl font-bold">3</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Under Review", "قيد المراجعة")}</p>
            <p className="text-2xl font-bold">2</p>
          </Card>
        </div>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("Equipment", "المعدات")}</th>
                <th className="text-left py-2">{nav("Status", "الحالة")}</th>
                <th className="text-left py-2">{nav("Age", "العمر")}</th>
                <th className="text-left py-2">{nav("Next Maint", "الصيانة التالية")}</th>
              </tr>
            </thead>
            <tbody>
              {mockData.map((row) => (
                <tr key={row.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3">{row.equipment}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${row.status === "Active" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3">{row.age}</td>
                  <td className="py-3">{row.nextMaint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </ModulePageShell>
  );
}
