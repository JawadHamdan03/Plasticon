import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, Clock, Archive, GitBranch } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";


interface ApprovalWorkflow {
  id: number;
  workflowName: string;
  status: string;
  itemsCount: number;
  approverCount: number;
  createdById: number;
  createdBy?: { id: number; fullName: string };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DRAFT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ARCHIVED: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export default function ApprovalWorkflows() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ workflowName: "", status: "ACTIVE", itemsCount: 0, approverCount: 0 });

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/approval-workflows`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/approval-workflows/${editingId}` : `${API_BASE_URL}/approval-workflows`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, itemsCount: parseInt(String(form.itemsCount)), approverCount: parseInt(String(form.approverCount)) }),
      });
      if (res.ok) {
        setForm({ workflowName: "", status: "ACTIVE", itemsCount: 0, approverCount: 0 });
        setEditingId(null);
        setShowForm(false);
        fetchWorkflows();
      }
    } catch { }
  };

  const handleEdit = (w: ApprovalWorkflow) => {
    setForm({ workflowName: w.workflowName, status: w.status, itemsCount: w.itemsCount, approverCount: w.approverCount });
    setEditingId(w.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(nav("Delete this workflow?", "حذف سير العمل هذا؟"))) return;
    await fetch(`${API_BASE_URL}/approval-workflows/${id}`, {
      method: "DELETE", credentials: "include",
    });
    fetchWorkflows();
  };

  const activeCount = workflows.filter(w => w.status === "ACTIVE").length;
  const draftCount = workflows.filter(w => w.status === "DRAFT").length;
  const totalItems = workflows.reduce((s, w) => s + w.itemsCount, 0);

  return (
    <ModulePageShell
      title={nav("Approval Workflows", "سير عمل الموافقة")}
      subtitle={nav("Configure and manage approval processes", "تكوين وإدارة عمليات الموافقة")}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Active", "نشط")}</p>
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{activeCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Draft", "مسودة")}</p>
              <Clock size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{draftCount}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{nav("Total Items", "إجمالي العناصر")}</p>
              <GitBranch size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalItems}</p>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{nav("Workflows", "سير العمل")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={16} />
            {nav("Add Workflow", "إضافة سير عمل")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
              {editingId ? nav("Edit Workflow", "تعديل سير العمل") : nav("New Workflow", "سير عمل جديد")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Workflow Name", "اسم سير العمل")}</label>
                  <input type="text" value={form.workflowName} onChange={e => setForm({ ...form, workflowName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Status", "الحالة")}</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm">
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Items Count", "عدد العناصر")}</label>
                  <input type="number" min={0} value={form.itemsCount}
                    onChange={e => setForm({ ...form, itemsCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{nav("Approvers Required", "الموافقون المطلوبون")}</label>
                  <input type="number" min={0} value={form.approverCount}
                    onChange={e => setForm({ ...form, approverCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-slate-300 dark:border-slate-600 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-slate-50 dark:hover:bg-slate-600">
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : workflows.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-600">
            <GitBranch className="mx-auto mb-3 text-slate-400" size={40} />
            <p className="text-slate-500 dark:text-slate-400">{nav("No workflows yet. Click 'Add Workflow' to create one.", "لا توجد سير عمل بعد.")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Workflow Name", "اسم سير العمل")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Status", "الحالة")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Items", "العناصر")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Approvers", "الموافقون")}</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">{nav("Created By", "أنشأه")}</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {workflows.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{w.workflowName}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[w.status] ?? STATUS_STYLES.DRAFT}`}>
                          {w.status === "ACTIVE" ? <CheckCircle size={11} /> : w.status === "DRAFT" ? <Clock size={11} /> : <Archive size={11} />}
                          {nav(w.status, w.status === "ACTIVE" ? "نشط" : w.status === "DRAFT" ? "مسودة" : "مؤرشف")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{w.itemsCount}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{w.approverCount}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{w.createdBy?.fullName ?? "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(w)}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(w.id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
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
