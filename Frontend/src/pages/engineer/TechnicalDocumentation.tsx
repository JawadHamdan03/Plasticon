import { Card } from "../../components/ui/card";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";

export default function TechnicalDocumentation() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const docs = [
    { id: 1, title: "Machine A - User Manual", updated: "2026-03-15" },
    { id: 2, title: "Machine B - Maintenance Guide", updated: "2026-02-20" },
    { id: 3, title: "Safety Procedures", updated: "2026-01-10" },
  ];

  return (
    <ModulePageShell
      title="Technical Documentation"
      subtitle="Access and manage technical resources and manuals"
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{nav("Coming Soon", "قريبا")}</h2>

        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-slate-600">{nav("Total Documents", "إجمالي الوثائق")}</p>
          <p className="text-2xl font-bold">12</p>
        </Card>

        <Card className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{nav("Title", "العنوان")}</th>
                <th className="text-left py-2">{nav("Updated", "آخر تحديث")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="py-3">{doc.title}</td>
                  <td className="py-3 text-slate-500">{doc.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </ModulePageShell>
  );
}
