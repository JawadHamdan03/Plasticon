import { useEffect, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Transfer {
  id: number;
  machine?: { id: number; name: string; type: string };
  machineId: number;
  partsUsed: string;
  downtimeReason: string;
  createdAt: string;
  engineer?: { id: number; fullName: string };
}

export default function EquipmentTransferLog() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/all`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : (data.data || []);
        setTransfers(records.slice(0, 50));
      }
    } catch { } finally { setLoading(false); }
  };

  const totalTransfers = transfers.length;

  return (
    <ModulePageShell
      title="Equipment Transfer Log"
      subtitle="Track equipment movements and service history"
    >
      <div className="space-y-6">
        <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{nav("Total Maintenance Records", "إجمالي سجلات الصيانة")}</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalTransfers}</p>
            </div>
            <ArrowRight size={24} className="text-blue-600" />
          </div>
        </Card>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}</div>
        ) : transfers.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <History className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500">{nav("No transfer records found", "لم يتم العثور على سجلات النقل")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Equipment", "المعدات")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Maintenance Work", "عمل الصيانة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Parts Used", "الأجزاء المستخدمة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Date", "التاريخ")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("By", "بواسطة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transfers.map(transfer => (
                    <tr key={transfer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{transfer.machine?.name || `Machine #${transfer.machineId}`}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{transfer.downtimeReason || "Maintenance"}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{transfer.partsUsed || "—"}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(transfer.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{transfer.engineer?.fullName || "—"}</td>
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
