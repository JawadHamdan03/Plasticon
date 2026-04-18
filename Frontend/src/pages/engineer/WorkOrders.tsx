import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function WorkOrders() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const orders = [
    { id: "WO-001", title: "Machine A Repair", priority: "High", status: "In Progress", due: "2026-04-20" },
    { id: "WO-002", title: "Machine B Maintenance", priority: "Medium", status: "Completed", due: "2026-04-15" },
    { id: "WO-003", title: "Machine C Inspection", priority: "Low", status: "Pending", due: "2026-04-25" },
  ];

  return (
    <ModulePageShell
      title="Work Orders"
      subtitle="Create and manage work orders and tasks"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total", "الإجمالي")}</p>
            <p className="text-2xl font-bold">15</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("In Progress", "قيد التنفيذ")}</p>
            <p className="text-2xl font-bold">5</p>
          </Card>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Completed", "اكتمل")}</p>
            <p className="text-2xl font-bold">8</p>
          </Card>
        </div>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("ID", "المعرف")}</th>
                <th className="text-left py-2">{nav("Title", "العنوان")}</th>
                <th className="text-left py-2">{nav("Priority", "الأولوية")}</th>
                <th className="text-left py-2">{nav("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3 font-semibold">{order.id}</td>
                  <td className="py-3">{order.title}</td>
                  <td className="py-3">{order.priority}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${order.status === "Completed" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : order.status === "In Progress" ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"}`}>
                      {order.status}
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
