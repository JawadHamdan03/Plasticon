import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function EquipmentTransferLog() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const transfers = [
    { id: 1, equipment: "Machine A", from: "Warehouse A", to: "Factory Floor 1", date: "2026-04-10", transferredBy: "John Doe" },
    { id: 2, equipment: "Machine B", from: "Factory Floor 1", to: "Warehouse B", date: "2026-03-28", transferredBy: "Jane Smith" },
    { id: 3, equipment: "Scale C", from: "Warehouse B", to: "Quality Lab", date: "2026-03-15", transferredBy: "Mike Johnson" },
  ];

  return (
    <ModulePageShell
      title="Equipment Transfer Log"
      subtitle="Track equipment movements and transfers"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>

        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-slate-600">{nav("Total Transfers", "إجمالي النقلات")}</p>
          <p className="text-2xl font-bold">42</p>
        </Card>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("Equipment", "المعدات")}</th>
                <th className="text-left py-2">{nav("From", "من")}</th>
                <th className="text-left py-2">{nav("To", "إلى")}</th>
                <th className="text-left py-2">{nav("Date", "التاريخ")}</th>
                <th className="text-left py-2">{nav("By", "بواسطة")}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3">{transfer.equipment}</td>
                  <td className="py-3 text-xs text-slate-600 dark:text-slate-400">{transfer.from}</td>
                  <td className="py-3 text-xs text-slate-600 dark:text-slate-400">{transfer.to}</td>
                  <td className="py-3 text-xs">{transfer.date}</td>
                  <td className="py-3 text-xs">{transfer.transferredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </ModulePageShell>
  );
}
