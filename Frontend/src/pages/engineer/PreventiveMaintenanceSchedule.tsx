import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface Schedule {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  scheduleType: string;
  frequency: string;
  nextScheduledDate: string;
  lastScheduledDate?: string;
  assignedEngineerId?: number;
  assignedEngineer?: { id: number; fullName: string };
  status: string;
  description?: string;
}

export default function PreventiveMaintenanceSchedule() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    machineId: "",
    scheduleType: "PREVENTIVE",
    frequency: "WEEKLY",
    nextScheduledDate: "",
    assignedEngineerId: "",
    description: "",
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/maintenance-schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/maintenance-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          machineId: parseInt(form.machineId),
          assignedEngineerId: form.assignedEngineerId
            ? parseInt(form.assignedEngineerId)
            : null,
        }),
      });

      if (response.ok) {
        setForm({
          machineId: "",
          scheduleType: "PREVENTIVE",
          frequency: "WEEKLY",
          nextScheduledDate: "",
          assignedEngineerId: "",
          description: "",
        });
        setShowForm(false);
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
    }
  };

  const isOverdue = (date: string) => new Date(date) < new Date();

  return (
    <ModulePageShell
      title="Preventive Maintenance Schedule"
      subtitle="Manage and track preventive maintenance schedules"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Maintenance Schedules", "جداول الصيانة")}</h2>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={18} />
            {nav("Create Schedule", "إنشاء جدول")}
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
                  value={form.scheduleType}
                  onChange={(e) =>
                    setForm({ ...form, scheduleType: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREDICTIVE">Predictive</option>
                </select>

                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>

                <input
                  type="date"
                  value={form.nextScheduledDate}
                  onChange={(e) =>
                    setForm({ ...form, nextScheduledDate: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="number"
                  placeholder={nav("Assigned Engineer ID", "معرف المهندس المعين")}
                  value={form.assignedEngineerId}
                  onChange={(e) =>
                    setForm({ ...form, assignedEngineerId: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>

              <textarea
                placeholder={nav("Description", "الوصف")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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

        {/* Schedules List */}
        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : schedules.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No schedules yet", "لا توجد جداول حتى الآن")}
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {schedule.machine?.name || `Machine #${schedule.machineId}`}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          schedule.status === "COMPLETED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : isOverdue(schedule.nextScheduledDate)
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {isOverdue(schedule.nextScheduledDate)
                          ? nav("Overdue", "متأخر")
                          : schedule.status || nav("Pending", "قيد الانتظار")}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p>
                        {nav("Type", "النوع")}: {schedule.scheduleType} | {nav("Frequency", "التكرار")}: {schedule.frequency}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar size={14} />
                        {nav("Scheduled", "مجدول")}: {new Date(schedule.nextScheduledDate).toLocaleDateString()}
                      </p>
                      {schedule.assignedEngineer && (
                        <p>
                          {nav("Assigned to", "مسند إلى")}: {schedule.assignedEngineer.fullName}
                        </p>
                      )}
                      {schedule.description && <p>{schedule.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {schedule.status === "COMPLETED" ? (
                      <CheckCircle className="text-green-600" size={20} />
                    ) : (
                      <Clock className="text-blue-600" size={20} />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
