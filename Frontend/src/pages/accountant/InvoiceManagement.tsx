import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";

interface Invoice {
  id: number;
  customerId: number;
  customer?: { id: number; name: string; email: string; phone: string };
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  paymentStatus: string;
  createdAt: string;
  paymentRecordedAt?: string;
  createdBy?: { id: number; fullName: string };
}

export default function InvoiceManagement() {
  const { locale } = useLocale();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    invoiceNumber: "",
    totalAmount: 0,
    dueDate: "",
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          customerId: parseInt(form.customerId),
          totalAmount: parseFloat(String(form.totalAmount)),
        }),
      });

      if (response.ok) {
        setForm({
          customerId: "",
          invoiceNumber: "",
          totalAmount: 0,
          dueDate: "",
        });
        setShowForm(false);
        fetchInvoices();
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  };

  const handleRecordPayment = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8080/invoices/${id}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus: "PAID" }),
      });

      if (response.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Failed to record payment:", error);
    }
  };

  const isOverdue = (dueDate: string, status: string) =>
    new Date(dueDate) < new Date() && status !== "PAID";

  const totalInvoices = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidInvoices = invoices
    .filter((inv) => inv.paymentStatus === "PAID")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingInvoices = invoices
    .filter((inv) => inv.paymentStatus === "PENDING")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <ModulePageShell
      title="Invoice Management"
      subtitle="Create and manage customer invoices"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Total Invoiced", "إجمالي الفواتير")}
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${totalInvoices.toFixed(2)}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Paid", "مدفوع")}
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              ${paidInvoices.toFixed(2)}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-0">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
              {nav("Outstanding", "المستحق")}
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              ${pendingInvoices.toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{nav("Invoices", "الفواتير")}</h2>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus size={18} />
            {nav("Create Invoice", "إنشاء فاتورة")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder={nav("Customer ID", "معرف العميل")}
                  value={form.customerId}
                  onChange={(e) =>
                    setForm({ ...form, customerId: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="text"
                  placeholder={nav("Invoice Number", "رقم الفاتورة")}
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNumber: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="number"
                  placeholder={nav("Total Amount", "المبلغ الإجمالي")}
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      totalAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0"
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />

                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  required
                />
              </div>

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

        {/* Invoices List */}
        {loading ? (
          <p>{nav("Loading...", "جاري التحميل...")}</p>
        ) : invoices.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {nav("No invoices yet", "لا توجد فواتير حتى الآن")}
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="text-left py-3 px-4">{nav("Invoice #", "رقم الفاتورة")}</th>
                  <th className="text-left py-3 px-4">{nav("Customer", "العميل")}</th>
                  <th className="text-left py-3 px-4">{nav("Amount", "المبلغ")}</th>
                  <th className="text-left py-3 px-4">{nav("Due Date", "تاريخ الاستحقاق")}</th>
                  <th className="text-left py-3 px-4">{nav("Status", "الحالة")}</th>
                  <th className="text-left py-3 px-4">{nav("Action", "الإجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      isOverdue(invoice.dueDate, invoice.paymentStatus)
                        ? "bg-red-50 dark:bg-red-900/20"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{invoice.customer?.name}</p>
                        <p className="text-xs text-slate-500">
                          {invoice.customer?.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      ${invoice.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                      {isOverdue(invoice.dueDate, invoice.paymentStatus) && (
                        <span className="ml-2 text-red-600 font-semibold">
                          ({nav("OVERDUE", "متأخر")})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-fit ${
                          invoice.paymentStatus === "PAID"
                            ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                            : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                        }`}
                      >
                        {invoice.paymentStatus === "PAID" ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.paymentStatus === "PENDING" && (
                        <Button
                          onClick={() => handleRecordPayment(invoice.id)}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          {nav("Mark Paid", "تحديد مدفوع")}
                        </Button>
                      )}
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
