import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Award, Plus, Trash2, X, Save, Zap } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface PerfRecord {
  id: number;
  periodType: string;
  periodDate: string;
  productionScore: number;
  qualityScore: number;
  attendanceScore: number;
  kaizenScore: number;
  totalScore: number;
  notes: string | null;
  user: { id: number; fullName: string; username: string; role: string };
  calculatedBy: { id: number; fullName: string };
}

interface UserOption { id: number; fullName: string; username: string; role: string }

const emptyForm = {
  userId: "",
  periodType: "DAILY",
  periodDate: new Date().toISOString().split("T")[0],
  productionScore: "100",
  qualityScore: "100",
  attendanceScore: "100",
  kaizenScore: "0",
  notes: "",
};

const scoreBadge = (score: number) => {
  if (score >= 85) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (score >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
};

export default function EmployeePerformance() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [records, setRecords] = useState<PerfRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [autoCalc, setAutoCalc] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE_URL}/performance`, { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(`${API_BASE_URL}/users/all`, { headers: { ...authHeaders() }, credentials: "include" }),
      ]);
      if (r1.ok) {
        const d = await r1.json();
        setRecords(d.records ?? d ?? []);
      }
      if (r2.ok) {
        const d = await r2.json();
        setUsers((d.users ?? d ?? []).filter((u: UserOption) => u.role !== "ADMIN"));
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.userId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          userId: parseInt(form.userId),
          periodType: form.periodType,
          periodDate: form.periodDate,
          productionScore: parseFloat(form.productionScore || "0"),
          qualityScore: parseFloat(form.qualityScore || "0"),
          attendanceScore: parseFloat(form.attendanceScore || "0"),
          kaizenScore: parseFloat(form.kaizenScore || "0"),
          notes: form.notes.trim() || undefined,
        }),
      });
      if (res.ok) { setShowForm(false); fetchAll(); }
    } catch { } finally { setSaving(false); }
  };

  const handleAutoCalc = async () => {
    if (!form.userId) return;
    setAutoCalc(true);
    try {
      const res = await fetch(`${API_BASE_URL}/performance/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          userId: parseInt(form.userId),
          periodType: form.periodType,
          periodDate: form.periodDate,
        }),
      });
      if (res.ok) { setShowForm(false); fetchAll(); }
    } catch { } finally { setAutoCalc(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this performance record?", "حذف هذا السجل؟"), { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/performance/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      fetchAll();
    } catch { }
  };

  const totalRecords = records.length;
  const avgScore = records.length
    ? (records.reduce((a, b) => a + b.totalScore, 0) / records.length).toFixed(1)
    : "—";
  const topPerformer = records.length
    ? records.reduce((a, b) => a.totalScore > b.totalScore ? a : b).user.fullName
    : "—";

  return (
    <ModulePageShell
      title={nav("Employee Performance", "أداء الموظفين")}
      subtitle={nav("Track and evaluate employee performance scores", "تتبع وتقييم درجات أداء الموظفين")}
      icon={<Award size={22} />}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{nav("Total Assessments", "إجمالي التقييمات")}</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalRecords}</p>
        </Card>
        <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">{nav("Average Score", "متوسط الدرجات")}</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{avgScore}</p>
        </Card>
        <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">{nav("Top Performer", "أفضل أداء")}</p>
          <p className="text-lg font-bold text-purple-800 dark:text-purple-200 truncate">{topPerformer}</p>
        </Card>
      </div>

      {/* Toolbar */}
      {!isAdmin && (
        <div className="mb-4">
          <Button size="sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
            <Plus size={15} className="me-1" />
            {nav("Add Assessment", "إضافة تقييم")}
          </Button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">{nav("New Performance Assessment", "تقييم أداء جديد")}</h3>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{nav("Employee *", "الموظف *")}</label>
              <select className="input" value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}>
                <option value="">{nav("Select employee...", "اختر موظفًا...")}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="label">{nav("Period Type", "نوع الفترة")}</label>
              <select className="input" value={form.periodType} onChange={(e) => setForm((p) => ({ ...p, periodType: e.target.value }))}>
                <option value="DAILY">{nav("Daily", "يومي")}</option>
                <option value="WEEKLY">{nav("Weekly", "أسبوعي")}</option>
              </select>
            </div>
            <div>
              <label className="label">{nav("Period Date", "تاريخ الفترة")}</label>
              <input type="date" className="input" value={form.periodDate} onChange={(e) => setForm((p) => ({ ...p, periodDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Production Score (0-100)", "درجة الإنتاج")}</label>
              <input type="number" min="0" max="100" className="input" value={form.productionScore} onChange={(e) => setForm((p) => ({ ...p, productionScore: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Quality Score (0-100)", "درجة الجودة")}</label>
              <input type="number" min="0" max="100" className="input" value={form.qualityScore} onChange={(e) => setForm((p) => ({ ...p, qualityScore: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Attendance Score (0-100)", "درجة الحضور")}</label>
              <input type="number" min="0" max="100" className="input" value={form.attendanceScore} onChange={(e) => setForm((p) => ({ ...p, attendanceScore: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Kaizen Score (0-100)", "درجة كايزن")}</label>
              <input type="number" min="0" max="100" className="input" value={form.kaizenScore} onChange={(e) => setForm((p) => ({ ...p, kaizenScore: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <input className="input" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Manual", "حفظ يدوي")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleAutoCalc} disabled={autoCalc}>
              <Zap size={14} className="me-1" />
              {autoCalc ? nav("Calculating...", "جارٍ الحساب...") : nav("Auto-Calculate", "حساب تلقائي")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">{nav("No performance records", "لا توجد سجلات")}</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Employee", "الموظف")}</th>
                  <th>{nav("Period", "الفترة")}</th>
                  <th>{nav("Production", "الإنتاج")}</th>
                  <th>{nav("Quality", "الجودة")}</th>
                  <th>{nav("Attendance", "الحضور")}</th>
                  <th>{nav("Kaizen", "كايزن")}</th>
                  <th>{nav("Total", "المجموع")}</th>
                  <th>{nav("By", "بواسطة")}</th>
                  {!isAdmin && <th>{nav("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium">{r.user.fullName}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{r.user.role}</div>
                    </td>
                    <td>
                      <div>{r.periodType}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{new Date(r.periodDate).toLocaleDateString()}</div>
                    </td>
                    <td>{r.productionScore.toFixed(1)}</td>
                    <td>{r.qualityScore.toFixed(1)}</td>
                    <td>{r.attendanceScore.toFixed(1)}</td>
                    <td>{r.kaizenScore.toFixed(1)}</td>
                    <td>
                      <span className={`badge ${scoreBadge(r.totalScore)}`}>{r.totalScore.toFixed(1)}</span>
                    </td>
                    <td className="text-sm">{r.calculatedBy.fullName}</td>
                    {!isAdmin && (
                      <td>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    )}
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
