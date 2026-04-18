import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface HealthRecord {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  operationalStatus: string;
  downtimePercentage: number;
  maintenanceHours: number;
  efficiencyRating: number;
  notes?: string;
  recordedAt: string;
  recordedBy?: { id: number; fullName: string };
}

export default function MachineHealthDashboard() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    machineId: "",
    operationalStatus: "OPERATIONAL",
    downtimePercentage: 0,
    maintenanceHours: 0,
    efficiencyRating: 100,
    notes: "",
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/machine-health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/machine-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          machineId: parseInt(form.machineId),
          downtimePercentage: parseFloat(String(form.downtimePercentage)),
          maintenanceHours: parseFloat(String(form.maintenanceHours)),
          efficiencyRating: parseFloat(String(form.efficiencyRating)),
        }),
      });

      if (response.ok) {
        setForm({
          machineId: "",
          operationalStatus: "OPERATIONAL",
          downtimePercentage: 0,
          maintenanceHours: 0,
          efficiencyRating: 100,
          notes: "",
        });
        setShowForm(false);
        fetchRecords();
      }
    } catch (error) {
      console.error("Failed to create record:", error);
    }
  };

  return (
    <ModulePageShell
      title="Machine Health Dashboard"
      subtitle="View and track machine operational status"
    >
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Health Records", "سجلات الصحة")}</h2>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={18} />
            {nav("Add Record", "إضافة سجل")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder={nav("Machine ID", "معرف الآلة")}
                  value={form.machineId}
                  onChange={(e) =>
                    setForm({ ...form, machineId: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <select
                  value={form.operationalStatus}
                  onChange={(e) =>
                    setForm({ ...form, operationalStatus: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="OPERATIONAL">Operational</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="DOWNTIME">Downtime</option>
                </select>

                <input
                  type="number"
                  placeholder={nav("Downtime %", "نسبة التوقف")}
                  value={form.downtimePercentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      downtimePercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  max="100"
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />

                <input
                  type="number"
                  placeholder={nav("Maintenance Hours", "ساعات الصيانة")}
                  value={form.maintenanceHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maintenanceHours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />

                <input
                  type="number"
                  placeholder={nav("Efficiency Rating", "تقييم الكفاءة")}
                  value={form.efficiencyRating}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      efficiencyRating: parseFloat(e.target.value) || 100,
                    })
                  }
                  min="0"
                  max="100"
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>

              <textarea
                placeholder={nav("Notes", "ملاحظات")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                rows={3}
              />

              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-md bg-white dark:bg-slate-700"
                >
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Records Table */}
        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : records.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No health records yet", "لا توجد سجلات صحة حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Machine", "الآلة")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Downtime %", "نسبة التوقف")}</th>
                  <th className="text-left py-3 px-4">{nav("Efficiency", "الكفاءة")}</th>
                  <th className="text-left py-3 px-4">{nav("Recorded At", "مسجل في")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="py-3 px-4">{record.machine?.name || `Machine #${record.machineId}`}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          record.operationalStatus === "OPERATIONAL"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : record.operationalStatus === "MAINTENANCE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {record.operationalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${record.downtimePercentage}%` }}
                          ></div>
                        </div>
                        <span>{record.downtimePercentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${record.efficiencyRating}%` }}
                          ></div>
                        </div>
                        <span>{record.efficiencyRating}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(record.recordedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
