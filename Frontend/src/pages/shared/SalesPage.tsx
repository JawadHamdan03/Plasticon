import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { PageHeader } from "../../components/ui/page-header";
import { TableBase, TableShell } from "../../components/ui/table-shell";

type CustomerOption = {
  id: number;
  name: string;
};

type SaleItem = {
  id: number;
  machineType: string;
  size: string;
  quantity: number;
  pricePerUnit: number;
};

type FileAttachment = {
  id: number;
  fileName: string;
  filePath: string;
  publicUrl?: string;
};

type SaleRecord = {
  id: number;
  customerId: number;
  date: string;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

const toPublicFileUrl = (pathOrUrl?: string | null) => {
  if (!pathOrUrl || !pathOrUrl.trim()) {
    return "";
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (pathOrUrl.startsWith("/pictures/")) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }

  const normalized = pathOrUrl
    .replace(/^prisma[\\/]+pictures[\\/]+/i, "")
    .replace(/^pictures[\\/]+/i, "")
    .replace(/^\/+/, "");

  return normalized ? `${API_BASE_URL}/pictures/${normalized}` : "";
};

const getRecordInvoiceUrl = (record: {
  invoiceUrl?: string;
  invoiceImage?: string;
  fileAttachments?: FileAttachment[];
}) => {
  if (record.invoiceUrl) {
    return toPublicFileUrl(record.invoiceUrl);
  }

  const invoiceAttachment = record.fileAttachments?.[0];
  if (invoiceAttachment?.publicUrl) {
    return toPublicFileUrl(invoiceAttachment.publicUrl);
  }

  if (invoiceAttachment?.filePath) {
    return toPublicFileUrl(invoiceAttachment.filePath);
  }

  return toPublicFileUrl(record.invoiceImage);
};

const formatMoney = (locale: string, value: number) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export function SalesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const canManageSales = user?.role === "ACCOUNTANT";

  const text = useMemo(
    () => ({
      title: isArabic ? "المبيعات" : "Sales",
      subtitle: isArabic
        ? "إدارة عمليات البيع مع عرض كامل للإدمن، والمحاسب يمكنه الإضافة والتعديل والحذف."
        : "Manage sales with full admin visibility while accountants can create, edit, and delete.",
      summaryCustomers: isArabic ? "الزبائن" : "Customers",
      summarySales: isArabic ? "عمليات البيع" : "Sales",
      summaryAmount: isArabic ? "إجمالي المبيعات" : "Total sales",
      refresh: isArabic ? "تحديث" : "Refresh",
      searchTitle: isArabic ? "ابحث في المبيعات" : "Search sales",
      searchPlaceholder: isArabic
        ? "الزبون، المقاس، نوع الماكينة، أو الفاتورة"
        : "Customer, size, machine type, or invoice",
      formTitle: isArabic ? "تفاصيل عملية البيع" : "Sale details",
      customer: isArabic ? "الزبون" : "Customer",
      selectCustomer: isArabic ? "اختر الزبون" : "Select customer",
      saleDate: isArabic ? "تاريخ البيع" : "Sale date",
      totalAmount: isArabic ? "إجمالي السعر" : "Total amount",
      items: isArabic ? "الأصناف" : "Items",
      machineType: isArabic ? "نوع الماكينة" : "Machine type",
      size: isArabic ? "المقاس" : "Size",
      quantity: isArabic ? "الكمية" : "Quantity",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
      addItem: isArabic ? "إضافة صنف" : "Add item",
      removeItem: isArabic ? "حذف الصنف" : "Remove item",
      invoice: isArabic
        ? "فاتورة/إرسالية (PDF/صورة)"
        : "Invoice/Delivery note (PDF/Image)",
      fileSelected: isArabic ? "الملف المحدد" : "Selected file",
      create: isArabic ? "إضافة بيع" : "Create sale",
      update: isArabic ? "حفظ التعديل" : "Save changes",
      cancel: isArabic ? "إلغاء التعديل" : "Cancel edit",
      listTitle: isArabic ? "سجل المبيعات" : "Sales ledger",
      noData: isArabic ? "لا توجد مبيعات" : "No sales yet",
      edit: isArabic ? "تعديل" : "Edit",
      delete: isArabic ? "حذف" : "Delete",
      confirmDelete: isArabic
        ? "هل أنت متأكد من حذف عملية البيع؟"
        : "Are you sure you want to delete this sale?",
      invoiceLink: isArabic ? "عرض الفاتورة" : "View invoice",
      actions: isArabic ? "إجراءات" : "Actions",
      deliveryPdf: isArabic ? "PDF الإرسالية" : "Delivery PDF",
      loading: isArabic ? "جارٍ التحميل..." : "Loading...",
    }),
    [isArabic],
  );

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [query, setQuery] = useState("");

  const [saleForm, setSaleForm] = useState({
    customerName: "",
    date: "",
    totalAmount: "",
    items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
  });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<File | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  const loadCustomers = useCallback(async () => {
    const response = await fetchWithAuth("/sales/customers");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setCustomers((await response.json()) as CustomerOption[]);
  }, []);

  const loadSales = useCallback(async () => {
    const response = await fetchWithAuth("/sales/all");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setSales((await response.json()) as SaleRecord[]);
  }, []);

  const resetForm = () => {
    setSaleForm({
      customerName: "",
      date: "",
      totalAmount: "",
      items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
    });
    setSaleInvoiceFile(null);
    setEditingSaleId(null);
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        await Promise.all([loadCustomers(), loadSales()]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load sales",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [loadCustomers, loadSales]);

  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sales;
    }

    return sales.filter((sale) => {
      const haystack = [
        sale.customer?.name ?? `#${sale.customerId}`,
        sale.customer?.phone ?? "",
        sale.customer?.email ?? "",
        sale.items.map((item) => `${item.machineType} ${item.size}`).join(" "),
        sale.invoiceImage ?? "",
        sale.invoiceUrl ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, sales]);

  const totals = useMemo(() => {
    const customerSet = new Set(
      sales.map((sale) => sale.customer?.id ?? sale.customerId),
    );

    return {
      customers: customerSet.size,
      sales: sales.length,
      amount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    };
  }, [sales]);

  const exportDeliveryPdf = (sale: SaleRecord) => {
    const doc = new jsPDF();
    const customerName = sale.customer?.name ?? `#${sale.customerId}`;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Plasticon", 14, 8);

    doc.setTextColor(23, 37, 84);
    doc.setFontSize(16);
    doc.text(isArabic ? "إرسالية بيع" : "Sales Delivery Note", 14, 22);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(`${isArabic ? "رقم العملية" : "Sale ID"}: #${sale.id}`, 14, 30);
    doc.text(`${isArabic ? "الزبون" : "Customer"}: ${customerName}`, 14, 36);
    doc.text(
      `${isArabic ? "التاريخ" : "Date"}: ${new Date(sale.date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}`,
      14,
      42,
    );
    doc.text(
      `${isArabic ? "الإجمالي" : "Total"}: ${formatMoney(locale, sale.totalAmount)}`,
      14,
      48,
    );

    autoTable(doc, {
      startY: 56,
      head: [
        [
          isArabic ? "نوع الماكينة" : "Machine type",
          isArabic ? "المقاس" : "Size",
          isArabic ? "الكمية" : "Quantity",
          isArabic ? "سعر الوحدة" : "Unit price",
          isArabic ? "الإجمالي" : "Line total",
        ],
      ],
      body: sale.items.map((item) => [
        item.machineType,
        item.size,
        String(item.quantity),
        formatMoney(locale, item.pricePerUnit),
        formatMoney(locale, item.quantity * item.pricePerUnit),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`delivery-note-sale-${sale.id}.pdf`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSales) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = new FormData();
      body.append("customerName", saleForm.customerName.trim());
      if (saleForm.date) body.append("date", saleForm.date);
      if (saleForm.totalAmount)
        body.append("totalAmount", saleForm.totalAmount);

      const items = saleForm.items
        .filter(
          (item) =>
            item.machineType && item.size && item.quantity && item.pricePerUnit,
        )
        .map((item) => ({
          machineType: item.machineType,
          size: item.size,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
        }));

      body.append("items", JSON.stringify(items));

      if (saleInvoiceFile) {
        body.append("invoiceFile", saleInvoiceFile);
      }

      const response = await fetchWithAuth(
        editingSaleId ? `/sales/${editingSaleId}` : "/sales",
        {
          method: editingSaleId ? "PUT" : "POST",
          body,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setSuccessMessage(
        editingSaleId
          ? isArabic
            ? "تم تعديل عملية البيع"
            : "Sale updated successfully"
          : isArabic
            ? "تمت إضافة عملية بيع جديدة"
            : "Sale created successfully",
      );

      await loadSales();
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save sale",
      );
    }
  };

  const deleteSale = async (id: number) => {
    if (!canManageSales) {
      return;
    }

    const confirmed = window.confirm(text.confirmDelete);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/sales/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadSales();
      setSuccessMessage(isArabic ? "تم حذف عملية البيع" : "Sale deleted");
      if (editingSaleId === id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete sale",
      );
    }
  };

  const startEditSale = (sale: SaleRecord) => {
    if (!canManageSales) {
      return;
    }

    setEditingSaleId(sale.id);
    setSaleForm({
      customerName: sale.customer?.name ?? "",
      date: toDateInput(sale.date),
      totalAmount:
        Number.isFinite(sale.totalAmount) && sale.totalAmount >= 0
          ? String(sale.totalAmount)
          : "",
      items:
        sale.items.length > 0
          ? sale.items.map((item) => ({
              machineType: item.machineType,
              size: item.size,
              quantity: String(item.quantity),
              pricePerUnit: String(item.pricePerUnit),
            }))
          : [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
    });
    setSaleInvoiceFile(null);
  };

  return (
    <ModulePageShell
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button variant="outline" onClick={() => void loadSales()}>
          {text.refresh}
        </Button>
      }
    >
      <div className="module-summary-bar flex flex-wrap items-center gap-2 rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3">
        <Badge tone="soft">{text.summaryCustomers}</Badge>
        <Badge>{totals.customers}</Badge>
        <Badge tone="soft">{text.summarySales}</Badge>
        <Badge>{totals.sales}</Badge>
        <Badge tone="soft">{text.summaryAmount}</Badge>
        <Badge>{formatMoney(locale, totals.amount)}</Badge>
      </div>

      <Card className="module-panel p-5">
        <PageHeader
          title={text.searchTitle}
          subtitle={text.searchPlaceholder}
        />
        <div className="mt-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
          />
        </div>
      </Card>

      <section className="module-grid grid gap-4 xl:grid-cols-2">
        {canManageSales ? (
          <Card className="module-panel p-5">
            <PageHeader title={text.formTitle} />
            <form
              className="module-form mt-4 grid gap-3"
              onSubmit={handleSubmit}
            >
              <label>
                {text.customer}
                <input
                  list="customers-datalist"
                  className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                  value={saleForm.customerName}
                  onChange={(event) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      customerName: event.target.value,
                    }))
                  }
                  placeholder={isArabic ? "اكتب اسم الزبون..." : "Type customer name..."}
                  required
                />
                <datalist id="customers-datalist">
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </label>

              <label>
                {text.saleDate}
                <Input
                  type="date"
                  value={saleForm.date}
                  onChange={(event) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {text.totalAmount}
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={saleForm.totalAmount}
                  onChange={(event) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      totalAmount: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-2">
                <strong>{text.items}</strong>
                {saleForm.items.map((item, index) => (
                  <div
                    key={`sale-item-${index}`}
                    className="grid gap-2 rounded-xl border border-[#EEEEEE] p-2"
                  >
                    <Input
                      placeholder={text.machineType}
                      value={item.machineType}
                      onChange={(event) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, machineType: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      required
                    />
                    <Input
                      placeholder={text.size}
                      value={item.size}
                      onChange={(event) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, size: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      required
                    />
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder={text.quantity}
                      value={item.quantity}
                      onChange={(event) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, quantity: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      required
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={text.unitPrice}
                      value={item.pricePerUnit}
                      onChange={(event) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          items: prev.items.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, pricePerUnit: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      required
                    />
                    {saleForm.items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSaleForm((prev) => ({
                            ...prev,
                            items: prev.items.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        {text.removeItem}
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSaleForm((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        {
                          machineType: "",
                          size: "",
                          quantity: "",
                          pricePerUnit: "",
                        },
                      ],
                    }))
                  }
                >
                  {text.addItem}
                </Button>
              </div>

              <label>
                {text.invoice}
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) =>
                    setSaleInvoiceFile(event.target.files?.[0] ?? null)
                  }
                />
                {saleInvoiceFile ? (
                  <small>
                    {text.fileSelected}: {saleInvoiceFile.name}
                  </small>
                ) : null}
              </label>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingSaleId ? text.update : text.create}
                </Button>
                {editingSaleId ? (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    {text.cancel}
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        ) : null}

        <Card className="module-panel p-5">
          <PageHeader title={text.listTitle} />
          {loading ? <p>{text.loading}</p> : null}
          {!loading && filteredSales.length === 0 ? (
            <EmptyState title={text.noData} />
          ) : null}
          <TableShell className="mt-4 sales-ledger-table-wrap">
            <TableBase className="admin-table sales-ledger-table">
              <thead>
                <tr>
                  <th>{text.customer}</th>
                  <th>{text.saleDate}</th>
                  <th>{text.items}</th>
                  <th>{text.totalAmount}</th>
                  <th>{text.invoice}</th>
                  <th>{text.deliveryPdf}</th>
                  {canManageSales ? <th>{text.actions}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const invoiceUrl = getRecordInvoiceUrl(sale);
                  return (
                    <tr key={sale.id}>
                      <td>{sale.customer?.name ?? `#${sale.customerId}`}</td>
                      <td>
                        {new Date(sale.date).toLocaleDateString(
                          locale === "ar" ? "ar-EG" : "en-US",
                        )}
                      </td>
                      <td>
                        <div className="grid gap-1">
                          {sale.items.map((item) => (
                            <div
                              key={item.id}
                              className="text-xs text-[#5F6659]"
                            >
                              {item.machineType} {item.size}
                              {` · ${item.quantity} × ${formatMoney(locale, item.pricePerUnit)}`}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{formatMoney(locale, sale.totalAmount)}</td>
                      <td>
                        {invoiceUrl ? (
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            {text.invoiceLink}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => exportDeliveryPdf(sale)}
                        >
                          {text.deliveryPdf}
                        </Button>
                      </td>
                      {canManageSales ? (
                        <td>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEditSale(sale)}
                            >
                              {text.edit}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void deleteSale(sale.id)}
                            >
                              {text.delete}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      </section>

      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className="auth-alert auth-alert--success">{successMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}
