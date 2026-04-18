import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function EquipmentCalibration() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const calibrations = [
    { id: 1, equipment: "Machine A", lastCalib: "2026-03-01", nextDue: "2026-09-01", status: "Valid" },
    { id: 2, equipment: "Machine B", lastCalib: "2026-02-15", nextDue: "2026-08-15", status: "Valid" },
    { id: 3, equipment: "Scale C", lastCalib: "2025-12-10", nextDue: "2026-06-10", status: "Pending" },
  ];

  return (
    <ModulePageShell
      title="Equipment Calibration"
      subtitle="Manage equipment calibration schedules and records"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Valid", "صحيح")}</p>
            <p className="text-2xl font-bold">8</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Pending", "قيد الانتظار")}</p>
            <p className="text-2xl font-bold">2</p>
          </Card>
          <Card className="p-4 bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-slate-600">{nav("Expired", "منتهي الصلاحية")}</p>
            <p className="text-2xl font-bold">1</p>
          </Card>
        </div>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("Equipment", "المعدات")}</th>
                <th className="text-left py-2">{nav("Last Calibrated", "آخر معايرة")}</th>
                <th className="text-left py-2">{nav("Next Due", "التالي المستحق")}</th>
                <th className="text-left py-2">{nav("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {calibrations.map((cal) => (
                <tr key={cal.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3">{cal.equipment}</td>
                  <td className="py-3">{cal.lastCalib}</td>
                  <td className="py-3">{cal.nextDue}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${cal.status === "Valid" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"}`}>
                      {cal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </ModulePageShell>
  );
}
