import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface ApprovalWorkflow {
  id: number;
  workflowName: string;
  status: string;
  itemsCount: number;
  approverCount: number;
  createdById: number;
  createdBy?: { id: number; fullName: string };
}

export default function ApprovalWorkflows() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    workflowName: "",
    status: "ACTIVE",
    itemsCount: 0,
    approverCount: 0,
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/approval-workflows", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingId
        ? `http://localhost:8080/approval-workflows/${editingId}`
        : "http://localhost:8080/approval-workflows";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          itemsCount: parseInt(String(form.itemsCount)),
          approverCount: parseInt(String(form.approverCount)),
        }),
      });

      if (response.ok) {
        setForm({ workflowName: "", status: "ACTIVE", itemsCount: 0, approverCount: 0 });
        setEditingId(null);
        setShowForm(false);
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  };

  const handleEdit = (workflow: ApprovalWorkflow) => {
    setForm({
      workflowName: workflow.workflowName,
      status: workflow.status,
      itemsCount: workflow.itemsCount,
      approverCount: workflow.approverCount,
    });
    setEditingId(workflow.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:8080/approval-workflows/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkflows();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const activeWorkflows = workflows.filter(w => w.status === "ACTIVE").length;
  const totalItems = workflows.reduce((sum, w) => sum + w.itemsCount, 0);

  return (
    <ModulePageShell
      title="Approval Workflows"
      subtitle="Configure and manage approval processes"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Workflows", "سير العمل")}</h2>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
            <Plus size={18} />
            {nav("Add Workflow", "إضافة سير عمل")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-slate-600">{nav("Active Workflows", "سير العمل النشطة")}</p>
            <p className="text-2xl font-bold">{activeWorkflows}</p>
          </Card>
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-slate-600">{nav("Total Items", "إجمالي العناصر")}</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </Card>
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-slate-600">{nav("Total Workflows", "إجمالي سير العمل")}</p>
            <p className="text-2xl font-bold">{workflows.length}</p>
          </Card>
        </div>

        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={nav("Workflow Name", "اسم سير العمل")}
                  value={form.workflowName}
                  onChange={(e) => setForm({ ...form, workflowName: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <input
                  type="number"
                  placeholder={nav("Items Count", "عدد العناصر")}
                  value={form.itemsCount}
                  onChange={(e) => setForm({ ...form, itemsCount: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
                <input
                  type="number"
                  placeholder={nav("Approver Count", "عدد الموافقين")}
                  value={form.approverCount}
                  onChange={(e) => setForm({ ...form, approverCount: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{nav("Save", "حفظ")}</Button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 border rounded-md bg-white dark:bg-slate-700"
                >
                  {nav("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : workflows.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No workflows yet", "لا توجد سير عمل حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Workflow", "سير العمل")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Items", "العناصر")}</th>
                  <th className="text-left py-3 px-4">{nav("Approvers", "الموافقين")}</th>
                  <th className="text-left py-3 px-4">{nav("Created By", "تم الإنشاء بواسطة")}</th>
                  <th className="text-left py-3 px-4">{nav("Actions", "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">{workflow.workflowName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        workflow.status === "ACTIVE"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : workflow.status === "DRAFT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                      }`}>
                        {workflow.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{workflow.itemsCount}</td>
                    <td className="py-3 px-4">{workflow.approverCount}</td>
                    <td className="py-3 px-4 text-xs">{workflow.createdBy?.fullName}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(workflow)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
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
