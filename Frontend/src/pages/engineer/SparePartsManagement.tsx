import { useEffect, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface SparePart {
  id: number;
  name: string;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  supplier?: string;
  lastRestockedDate?: string;
  expiryDate?: string;
  notes?: string;
}

export default function SparePartsManagement() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    machineId: "",
    name: "",
    quantity: 0,
    minQuantity: 0,
    unitPrice: 0,
    supplier: "",
    notes: "",
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/spare-parts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setParts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/spare-parts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          machineId: parseInt(form.machineId),
          quantity: parseInt(String(form.quantity)),
          minQuantity: parseInt(String(form.minQuantity)),
          unitPrice: parseFloat(String(form.unitPrice)),
        }),
      });

      if (response.ok) {
        setForm({
          machineId: "",
          name: "",
          quantity: 0,
          minQuantity: 0,
          unitPrice: 0,
          supplier: "",
          notes: "",
        });
        setShowForm(false);
        fetchParts();
      }
    } catch (error) {
      console.error("Failed to create part:", error);
    }
  };

  const isLowStock = (part: SparePart) => part.quantity <= part.minQuantity;
  const totalValue = parts.reduce((sum, part) => sum + part.quantity * part.unitPrice, 0);

  return (
    <ModulePageShell
      title="Spare Parts Management"
      subtitle="Track and manage inventory of spare parts"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Total Parts", "إجمالي القطع")}
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {parts.length}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Low Stock", "المخزون المنخفض")}
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {parts.filter(isLowStock).length}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Inventory Value", "قيمة المخزون")}
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              ${totalValue.toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Spare Parts List", "قائمة القطع الغيار")}</h2>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={18} />
            {nav("Add Part", "إضافة قطعة")}
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

                <input
                  type="text"
                  placeholder={nav("Part Name", "اسم القطعة")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="number"
                  placeholder={nav("Quantity", "الكمية")}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: parseInt(e.target.value) || 0 })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="number"
                  placeholder={nav("Min Quantity", "أدنى كمية")}
                  value={form.minQuantity}
                  onChange={(e) =>
                    setForm({ ...form, minQuantity: parseInt(e.target.value) || 0 })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />

                <input
                  type="number"
                  placeholder={nav("Unit Price", "سعر الوحدة")}
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="text"
                  placeholder={nav("Supplier", "المورد")}
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
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

        {/* Parts Table */}
        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : parts.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No spare parts yet", "لا توجد قطع غيار حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Part Name", "اسم القطعة")}</th>
                  <th className="text-left py-3 px-4">{nav("Machine", "الآلة")}</th>
                  <th className="text-left py-3 px-4">{nav("Qty", "الكمية")}</th>
                  <th className="text-left py-3 px-4">{nav("Min", "أدنى")}</th>
                  <th className="text-left py-3 px-4">{nav("Unit Price", "السعر")}</th>
                  <th className="text-left py-3 px-4">{nav("Total Value", "القيمة الكلية")}</th>
                  <th className="text-left py-3 px-4">{nav("Supplier", "المورد")}</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr
                    key={part.id}
                    className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      isLowStock(part) ? "bg-orange-50 dark:bg-orange-900/20" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isLowStock(part) && (
                          <AlertTriangle size={16} className="text-orange-600" />
                        )}
                        {part.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {part.machine?.name || `Machine #${part.machineId}`}
                    </td>
                    <td className="py-3 px-4 font-semibold">{part.quantity}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {part.minQuantity}
                    </td>
                    <td className="py-3 px-4">${part.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold">
                      ${(part.quantity * part.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {part.supplier || "-"}
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
