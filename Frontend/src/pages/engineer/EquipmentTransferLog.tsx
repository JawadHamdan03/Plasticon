import { useEffect, useState } from "react";
import { History, ArrowRight, Wrench } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Transfer {
  id: number; machineId: number;
  machine?: { id: number; name: string; type: string };
  partsUsed: string; downtimeReason: string;
  createdAt: string;
  engineer?: { id: number; fullName: string };
}

export default function EquipmentTransferLog() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTransfers(); }, []);

  const fetchTransfers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/all`, { headers: { ...authHeaders() }, credentials: "include" });
      if (res.ok) { const d = await res.json(); setTransfers(Array.isArray(d) ? d : (d.data || [])); }
    } catch { } finally { setLoading(false); }
  };

  const uniqueMachines  = new Set(transfers.map(t => t.machineId)).size;
  const withPartsCount  = transfers.filter(t => t.partsUsed && t.partsUsed.trim() !== "").length;

  return (
    <ModulePageShell
      title={nav("Equipment Transfer Log", "سجل نقل المعدات")}
      subtitle={nav("Track equipment movements and service history", "تتبع تنقلات المعدات وتاريخ الخدمة")}
      icon={<History size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Records", "إجمالي السجلات"),    value: transfers.length, icon: "📋", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Machines Involved", "الآلات المعنية"), value: uniqueMachines,   icon: "🔧", color: "#7c3aed", bg: "#ede9fe" },
          { label: nav("Parts Replaced", "الأجزاء المستبدلة"), value: withPartsCount,  icon: "🔩", color: "#d97706", bg: "#fef3c7" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : transfers.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              <History size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">{nav("No transfer records found", "لم يتم العثور على سجلات النقل")}</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Equipment", "المعدات")}</th>
                  <th>{nav("Maintenance Work", "عمل الصيانة")}</th>
                  <th>{nav("Parts Used", "الأجزاء المستخدمة")}</th>
                  <th>{nav("Date", "التاريخ")}</th>
                  <th>{nav("By", "بواسطة")}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.machine?.name || `Machine #${t.machineId}`}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{t.downtimeReason || nav("Maintenance", "صيانة")}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{t.partsUsed || "—"}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="text-sm text-[var(--text-secondary)]">{t.engineer?.fullName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
