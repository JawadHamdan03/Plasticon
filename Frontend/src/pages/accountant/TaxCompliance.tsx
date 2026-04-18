import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function TaxCompliance() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const filings = [
    { id: 1, type: "VAT Return", dueDate: "2026-05-20", status: "Pending", amount: 8500 },
    { id: 2, type: "Income Tax", dueDate: "2026-06-30", status: "Pending", amount: 15000 },
    { id: 3, type: "Payroll Tax", dueDate: "2026-04-30", status: "Completed", amount: 12000 },
  ];

  return (
    <ModulePageShell
      title="Tax Compliance"
      subtitle="Manage tax filings and compliance requirements"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Filings", "إجمالي الإقرارات")}</p>
            <p className="text-2xl font-bold">12</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Completed", "اكتمل")}</p>
            <p className="text-2xl font-bold">8</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Pending", "قيد الانتظار")}</p>
            <p className="text-2xl font-bold">4</p>
          </Card>
        </div>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("Filing Type", "نوع الإقرار")}</th>
                <th className="text-left py-2">{nav("Amount", "المبلغ")}</th>
                <th className="text-left py-2">{nav("Due Date", "تاريخ الاستحقاق")}</th>
                <th className="text-left py-2">{nav("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((filing) => (
                <tr key={filing.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3">{filing.type}</td>
                  <td className="py-3">${filing.amount}</td>
                  <td className="py-3 text-xs">{filing.dueDate}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${filing.status === "Completed" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"}`}>
                      {filing.status}
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
