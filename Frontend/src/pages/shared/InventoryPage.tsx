import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { PageHeader } from "../../components/ui/page-header";
import { TableBase, TableShell } from "../../components/ui/table-shell";

type RawMaterial = {
  id: number;
  name: string;
  currentQuantity: number;
  unit: string;
  lastTransaction?: {
    id: number;
    type: string;
    quantity: number;
    createdAt: string;
  } | null;
};

type InventoryTransaction = {
  id: number;
  type: string;
  quantity: number;
  referenceType: string;
  referenceId: number | null;
  createdAt: string;
  material?: {
    id: number;
    name: string;
    unit: string;
  };
};

type TransactionResponse = {
  transaction: InventoryTransaction;
  updatedMaterial: RawMaterial;
};

type SupplierOption = {
  id: number;
  name: string;
};

type CustomerOption = {
  id: number;
  name: string;
};

type PurchaseItem = {
  id: number;
  materialId: number;
  quantity: number;
  pricePerUnit: number;
  material?: {
    id: number;
    name: string;
    unit: string;
  };
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

type PurchaseRecord = {
  id: number;
  supplierId: number;
  date: string;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  supplier?: { id: number; name: string };
  items: PurchaseItem[];
  fileAttachments?: FileAttachment[];
};

type SaleRecord = {
  id: number;
  customerId: number;
  date: string;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  customer?: { id: number; name: string };
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
};

const inventoryTypes = ["IN", "OUT"] as const;
const referenceTypes = ["PRODUCTION", "ADJUSTMENT", "MANUAL", "OTHER"] as const;

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const toPublicFileUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl || !pathOrUrl.trim()) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  if (pathOrUrl.startsWith("/pictures/")) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }

  const normalized = pathOrUrl
    .replace(/^prisma[\\/]+pictures[\\/]+/i, "")
    .replace(/^pictures[\\/]+/i, "")
    .replace(/^\/+/, "");

  if (!normalized) return "";
  return `${API_BASE_URL}/pictures/${normalized}`;
};

const getRecordInvoiceUrl = (record: {
  invoiceUrl?: string;
  invoiceImage?: string;
  fileAttachments?: FileAttachment[];
}) => {
  if (record.invoiceUrl) return toPublicFileUrl(record.invoiceUrl);

  const invoiceAttachment = record.fileAttachments?.[0];
  if (invoiceAttachment?.publicUrl) {
    return toPublicFileUrl(invoiceAttachment.publicUrl);
  }

  if (invoiceAttachment?.filePath) {
    return toPublicFileUrl(invoiceAttachment.filePath);
  }

  return toPublicFileUrl(record.invoiceImage);
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

export function InventoryPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const isArabic = locale === "ar";

  const purchaseText = useMemo(
    () => ({
      title: isArabic ? "المشتريات" : "Purchases",
      subtitle: isArabic
        ? "إدارة المشتريات مع رفع فاتورة PDF/صورة والتعديل والحذف"
        : "Manage purchases with PDF/image invoice upload, edit, and delete",
      supplier: isArabic ? "المورد" : "Supplier",
      suppliers: isArabic ? "الموردون" : "Suppliers",
      selectSupplier: isArabic ? "اختر المورد" : "Select supplier",
      date: isArabic ? "التاريخ" : "Date",
      total: isArabic ? "الإجمالي" : "Total amount",
      items: isArabic ? "الأصناف" : "Items",
      addItem: isArabic ? "إضافة صنف" : "Add item",
      removeItem: isArabic ? "حذف الصنف" : "Remove item",
      create: isArabic ? "إضافة شراء" : "Create purchase",
      update: isArabic ? "حفظ التعديل" : "Save changes",
      cancel: isArabic ? "إلغاء التعديل" : "Cancel edit",
      invoice: isArabic ? "الفاتورة (PDF/صورة)" : "Invoice (PDF/Image)",
      list: isArabic ? "سجل المشتريات" : "Purchases list",
      noData: isArabic ? "لا توجد مشتريات" : "No purchases yet",
      edit: isArabic ? "تعديل" : "Edit",
      delete: isArabic ? "حذف" : "Delete",
      confirmDelete: isArabic
        ? "هل أنت متأكد من حذف عملية الشراء؟"
        : "Are you sure you want to delete this purchase?",
      invoiceLink: isArabic ? "عرض الفاتورة" : "View invoice",
      material: isArabic ? "المادة" : "Material",
      quantity: isArabic ? "الكمية" : "Quantity",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
      actions: isArabic ? "إجراءات" : "Actions",
      fileSelected: isArabic ? "الملف المحدد" : "Selected file",
    }),
    [isArabic],
  );

  const saleText = useMemo(
    () => ({
      title: isArabic ? "المبيعات" : "Sales",
      subtitle: isArabic
        ? "إدارة المبيعات مع رفع فاتورة PDF/صورة والتعديل والحذف"
        : "Manage sales with PDF/image invoice upload, edit, and delete",
      customer: isArabic ? "العميل" : "Customer",
      customers: isArabic ? "العملاء" : "Customers",
      selectCustomer: isArabic ? "اختر العميل" : "Select customer",
      date: isArabic ? "التاريخ" : "Date",
      total: isArabic ? "الإجمالي" : "Total amount",
      items: isArabic ? "الأصناف" : "Items",
      addItem: isArabic ? "إضافة صنف" : "Add item",
      removeItem: isArabic ? "حذف الصنف" : "Remove item",
      create: isArabic ? "إضافة بيع" : "Create sale",
      update: isArabic ? "حفظ التعديل" : "Save changes",
      cancel: isArabic ? "إلغاء التعديل" : "Cancel edit",
      invoice: isArabic ? "الفاتورة (PDF/صورة)" : "Invoice (PDF/Image)",
      list: isArabic ? "سجل المبيعات" : "Sales list",
      noData: isArabic ? "لا توجد مبيعات" : "No sales yet",
      edit: isArabic ? "تعديل" : "Edit",
      delete: isArabic ? "حذف" : "Delete",
      confirmDelete: isArabic
        ? "هل أنت متأكد من حذف عملية البيع؟"
        : "Are you sure you want to delete this sale?",
      invoiceLink: isArabic ? "عرض الفاتورة" : "View invoice",
      machineType: isArabic ? "نوع الماكينة" : "Machine type",
      size: isArabic ? "المقاس" : "Size",
      quantity: isArabic ? "الكمية" : "Quantity",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
      actions: isArabic ? "إجراءات" : "Actions",
      fileSelected: isArabic ? "الملف المحدد" : "Selected file",
    }),
    [isArabic],
  );

  const getTransactionTypeLabel = useCallback(
    (type: "IN" | "OUT") => copy.inventory.transactionTypeLabels[type] ?? type,
    [copy.inventory.transactionTypeLabels],
  );

  const getReferenceTypeLabel = useCallback(
    (type: "PRODUCTION" | "ADJUSTMENT" | "MANUAL" | "OTHER") =>
      copy.inventory.referenceTypeLabels[type] ?? type,
    [copy.inventory.referenceTypeLabels],
  );

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    materialId: "",
    type: "IN",
    quantity: "",
    referenceType: "PRODUCTION",
    referenceId: "",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "",
    date: "",
    totalAmount: "",
    items: [{ materialId: "", quantity: "", pricePerUnit: "" }],
  });
  const [purchaseInvoiceFile, setPurchaseInvoiceFile] = useState<File | null>(
    null,
  );
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(
    null,
  );

  const [saleForm, setSaleForm] = useState({
    customerId: "",
    date: "",
    totalAmount: "",
    items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
  });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<File | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  const canSeeAllTransactions = useMemo(
    () => user?.role === "ADMIN" || user?.role === "ACCOUNTANT",
    [user?.role],
  );

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const response = await fetchWithAuth("/inventory/materials");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as RawMaterial[];
      setMaterials(data);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const endpoint = canSeeAllTransactions
        ? "/inventory/transactions/all"
        : "/inventory/transactions/me";
      const response = await fetchWithAuth(endpoint);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as InventoryTransaction[];
      setTransactions(data);
    } finally {
      setLoadingTransactions(false);
    }
  }, [canSeeAllTransactions]);

  const loadSuppliers = useCallback(async () => {
    const response = await fetchWithAuth("/purchases/suppliers");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setSuppliers((await response.json()) as SupplierOption[]);
  }, []);

  const loadCustomers = useCallback(async () => {
    const response = await fetchWithAuth("/sales/customers");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setCustomers((await response.json()) as CustomerOption[]);
  }, []);

  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const response = await fetchWithAuth("/purchases/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setPurchases((await response.json()) as PurchaseRecord[]);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const response = await fetchWithAuth("/sales/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setSales((await response.json()) as SaleRecord[]);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const resetPurchaseForm = () => {
    setPurchaseForm({
      supplierId: "",
      date: "",
      totalAmount: "",
      items: [{ materialId: "", quantity: "", pricePerUnit: "" }],
    });
    setPurchaseInvoiceFile(null);
    setEditingPurchaseId(null);
  };

  const resetSaleForm = () => {
    setSaleForm({
      customerId: "",
      date: "",
      totalAmount: "",
      items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
    });
    setSaleInvoiceFile(null);
    setEditingSaleId(null);
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          loadMaterials(),
          loadTransactions(),
          loadSuppliers(),
          loadCustomers(),
          loadPurchases(),
          loadSales(),
        ]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load inventory data",
        );
      }
    };

    void loadAll();
  }, [
    loadCustomers,
    loadPurchases,
    loadSales,
    loadSuppliers,
    loadTransactions,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        materialId: Number(form.materialId),
        type: form.type,
        quantity: Number(form.quantity),
        referenceType: form.referenceType,
        ...(form.referenceId ? { referenceId: Number(form.referenceId) } : {}),
      };

      const response = await fetchWithAuth("/inventory/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as TransactionResponse;
      setSuccessMessage(
        `Transaction #${data.transaction.id} saved. New stock for ${data.updatedMaterial.name}: ${data.updatedMaterial.currentQuantity} ${data.updatedMaterial.unit}`,
      );
      await loadMaterials();
      await loadTransactions();
      setForm((prev) => ({ ...prev, quantity: "", referenceId: "" }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save inventory transaction",
      );
    }
  };

  const handlePurchaseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = new FormData();
      body.append("supplierId", purchaseForm.supplierId);
      if (purchaseForm.date) body.append("date", purchaseForm.date);
      if (purchaseForm.totalAmount)
        body.append("totalAmount", purchaseForm.totalAmount);

      const items = purchaseForm.items
        .filter((item) => item.materialId && item.quantity && item.pricePerUnit)
        .map((item) => ({
          materialId: Number(item.materialId),
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
        }));

      body.append("items", JSON.stringify(items));

      if (purchaseInvoiceFile) {
        body.append("invoiceFile", purchaseInvoiceFile);
      }

      const response = await fetchWithAuth(
        editingPurchaseId ? `/purchases/${editingPurchaseId}` : "/purchases",
        {
          method: editingPurchaseId ? "PUT" : "POST",
          body,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setSuccessMessage(
        editingPurchaseId
          ? isArabic
            ? "تم تعديل الشراء بنجاح"
            : "Purchase updated successfully"
          : isArabic
            ? "تم إنشاء الشراء بنجاح"
            : "Purchase created successfully",
      );

      await Promise.all([loadPurchases(), loadMaterials(), loadTransactions()]);
      resetPurchaseForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save purchase",
      );
    }
  };

  const handleSaleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = new FormData();
      body.append("customerId", saleForm.customerId);
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
            ? "تم تعديل البيع بنجاح"
            : "Sale updated successfully"
          : isArabic
            ? "تم إنشاء البيع بنجاح"
            : "Sale created successfully",
      );

      await loadSales();
      resetSaleForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save sale",
      );
    }
  };

  const deletePurchase = async (id: number) => {
    const confirmed = await confirmDialog(purchaseText.confirmDelete, { danger: true });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/purchases/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await Promise.all([loadPurchases(), loadMaterials(), loadTransactions()]);
      setSuccessMessage(isArabic ? "تم حذف الشراء" : "Purchase deleted");
      if (editingPurchaseId === id) resetPurchaseForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete purchase",
      );
    }
  };

  const deleteSale = async (id: number) => {
    const confirmed = await confirmDialog(saleText.confirmDelete, { danger: true });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/sales/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await loadSales();
      setSuccessMessage(isArabic ? "تم حذف البيع" : "Sale deleted");
      if (editingSaleId === id) resetSaleForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete sale",
      );
    }
  };

  const startEditPurchase = (purchase: PurchaseRecord) => {
    setEditingPurchaseId(purchase.id);
    setPurchaseForm({
      supplierId: String(purchase.supplierId),
      date: toDateInput(purchase.date),
      totalAmount:
        Number.isFinite(purchase.totalAmount) && purchase.totalAmount >= 0
          ? String(purchase.totalAmount)
          : "",
      items:
        purchase.items.length > 0
          ? purchase.items.map((item) => ({
              materialId: String(item.materialId),
              quantity: String(item.quantity),
              pricePerUnit: String(item.pricePerUnit),
            }))
          : [{ materialId: "", quantity: "", pricePerUnit: "" }],
    });
    setPurchaseInvoiceFile(null);
  };

  const startEditSale = (sale: SaleRecord) => {
    setEditingSaleId(sale.id);
    setSaleForm({
      customerId: String(sale.customerId),
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
      title={copy.inventory.title}
      subtitle={copy.inventory.subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void loadMaterials();
            void loadTransactions();
            void loadSuppliers();
            void loadCustomers();
            void loadPurchases();
            void loadSales();
          }}
        >
          {copy.refresh}
        </Button>
      }
    >
      <div className="module-summary-bar flex flex-wrap items-center gap-2 rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3">
        <Badge tone="soft">{copy.inventory.totalMaterials}</Badge>
        <Badge>{String(materials.length)}</Badge>
        <Badge tone="soft">{copy.inventory.totalTransactions}</Badge>
        <Badge>{String(transactions.length)}</Badge>
        <Badge tone="soft">{purchaseText.title}</Badge>
        <Badge>{String(purchases.length)}</Badge>
        <Badge tone="soft">{saleText.title}</Badge>
        <Badge>{String(sales.length)}</Badge>
      </div>

      <section className="module-grid grid gap-4 xl:grid-cols-2">
        <Card className="module-panel p-5">
          <PageHeader title={copy.inventory.createTransaction} />
          <form className="module-form mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label>
              {copy.inventory.material}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                value={form.materialId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    materialId: event.target.value,
                  }))
                }
                required
              >
                <option value="">{copy.inventory.selectMaterial}</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.currentQuantity} {material.unit})
                  </option>
                ))}
              </select>
            </label>

            <label>
              {copy.inventory.type}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value }))
                }
              >
                {inventoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {getTransactionTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {copy.inventory.quantity}
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                required
              />
            </label>

            <label>
              {copy.inventory.referenceType}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                value={form.referenceType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    referenceType: event.target.value,
                  }))
                }
              >
                {referenceTypes.map((type) => (
                  <option key={type} value={type}>
                    {getReferenceTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {copy.inventory.referenceId}
              <Input
                type="number"
                min={1}
                value={form.referenceId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    referenceId: event.target.value,
                  }))
                }
              />
            </label>

            <Button type="submit" className="w-fit">
              {copy.inventory.saveTransaction}
            </Button>
          </form>
        </Card>

        <Card className="module-panel p-5">
          <PageHeader title={copy.inventory.rawMaterialsStock} />
          {loadingMaterials ? <p>{copy.inventory.loadingMaterials}</p> : null}
          <div className="module-list mt-4 grid gap-2">
            {!loadingMaterials && materials.length === 0 ? (
              <EmptyState title={copy.inventory.noTransactions} />
            ) : null}
            {materials.map((material) => (
              <div
                className="module-row rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3"
                key={material.id}
              >
                <strong>{material.name}</strong>
                <span>
                  {material.currentQuantity} {material.unit}
                </span>
                <small>
                  {copy.inventory.lastTransaction}:{" "}
                  {material.lastTransaction
                    ? `${getTransactionTypeLabel(material.lastTransaction.type as "IN" | "OUT")} ${material.lastTransaction.quantity}`
                    : copy.inventory.noTransactions}
                </small>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="module-panel module-panel--full p-5">
        <PageHeader
          title={
            canSeeAllTransactions
              ? copy.inventory.allTransactions
              : copy.inventory.myTransactions
          }
        />
        {loadingTransactions ? (
          <p>{copy.inventory.loadingTransactions}</p>
        ) : null}
        {!loadingTransactions && transactions.length === 0 ? (
          <EmptyState title={copy.inventory.noTransactions} />
        ) : null}
        <TableShell className="mt-4">
          <TableBase className="admin-table">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Material</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Qty</th>
                <th className="px-3 py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-3 py-2">
                    {transaction.material?.name ??
                      `Material #${transaction.material?.id ?? transaction.id}`}
                  </td>
                  <td className="px-3 py-2">
                    {getTransactionTypeLabel(transaction.type as "IN" | "OUT")}
                  </td>
                  <td className="px-3 py-2">{transaction.quantity}</td>
                  <td className="px-3 py-2">
                    {getReferenceTypeLabel(
                      transaction.referenceType as
                        | "PRODUCTION"
                        | "ADJUSTMENT"
                        | "MANUAL"
                        | "OTHER",
                    )}{" "}
                    {transaction.referenceId
                      ? `#${transaction.referenceId}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableBase>
        </TableShell>
      </Card>

      <section className="module-grid grid gap-4 xl:grid-cols-2">
        <Card className="module-panel p-5">
          <PageHeader
            title={purchaseText.title}
            subtitle={purchaseText.subtitle}
          />
          <form
            className="module-form mt-4 grid gap-3"
            onSubmit={handlePurchaseSubmit}
          >
            <label>
              {purchaseText.supplier}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                value={purchaseForm.supplierId}
                onChange={(event) =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    supplierId: event.target.value,
                  }))
                }
                required
              >
                <option value="">{purchaseText.selectSupplier}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {purchaseText.date}
              <Input
                type="date"
                value={purchaseForm.date}
                onChange={(event) =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              {purchaseText.total}
              <Input
                type="number"
                min={0}
                step="0.01"
                value={purchaseForm.totalAmount}
                onChange={(event) =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    totalAmount: event.target.value,
                  }))
                }
              />
            </label>

            <div className="grid gap-2">
              <strong>{purchaseText.items}</strong>
              {purchaseForm.items.map((item, index) => (
                <div
                  key={`purchase-item-${index}`}
                  className="grid gap-2 rounded-xl border border-[#EEEEEE] p-2"
                >
                  <select
                    className="h-10 rounded-xl border border-[#EEEEEE] bg-[#FFFFFF] px-3"
                    value={item.materialId}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, materialId: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  >
                    <option value="">{copy.inventory.selectMaterial}</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    placeholder={purchaseText.quantity}
                    value={item.quantity}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, quantity: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={purchaseText.unitPrice}
                    value={item.pricePerUnit}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, pricePerUnit: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  />
                  {purchaseForm.items.length > 1 ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setPurchaseForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      {purchaseText.removeItem}
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      { materialId: "", quantity: "", pricePerUnit: "" },
                    ],
                  }))
                }
              >
                {purchaseText.addItem}
              </Button>
            </div>

            <label>
              {purchaseText.invoice}
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) =>
                  setPurchaseInvoiceFile(event.target.files?.[0] ?? null)
                }
              />
              {purchaseInvoiceFile ? (
                <small>
                  {purchaseText.fileSelected}: {purchaseInvoiceFile.name}
                </small>
              ) : null}
            </label>

            <div className="flex gap-2">
              <Button type="submit">
                {editingPurchaseId ? purchaseText.update : purchaseText.create}
              </Button>
              {editingPurchaseId ? (
                <Button variant="ghost" onClick={resetPurchaseForm}>
                  {purchaseText.cancel}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="module-panel p-5">
          <PageHeader title={purchaseText.list} />
          {loadingPurchases ? <p>{copy.load}</p> : null}
          {!loadingPurchases && purchases.length === 0 ? (
            <EmptyState title={purchaseText.noData} />
          ) : null}
          <TableShell className="mt-4">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{purchaseText.supplier}</th>
                  <th>{purchaseText.date}</th>
                  <th>{purchaseText.total}</th>
                  <th>{purchaseText.invoice}</th>
                  <th>{purchaseText.actions}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const invoiceUrl = getRecordInvoiceUrl(purchase);
                  return (
                    <tr key={purchase.id}>
                      <td>
                        {purchase.supplier?.name ?? `#${purchase.supplierId}`}
                      </td>
                      <td>{new Date(purchase.date).toLocaleDateString()}</td>
                      <td>{purchase.totalAmount}</td>
                      <td>
                        {invoiceUrl ? (
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            {purchaseText.invoiceLink}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => startEditPurchase(purchase)}
                          >
                            {purchaseText.edit}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void deletePurchase(purchase.id)}
                          >
                            {purchaseText.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      </section>

      <section className="module-grid grid gap-4 xl:grid-cols-2">
        <Card className="module-panel p-5">
          <PageHeader title={saleText.title} subtitle={saleText.subtitle} />
          <form
            className="module-form mt-4 grid gap-3"
            onSubmit={handleSaleSubmit}
          >
            <label>
              {saleText.customer}
              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] px-4 text-sm text-[#000000]"
                value={saleForm.customerId}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    customerId: event.target.value,
                  }))
                }
                required
              >
                <option value="">{saleText.selectCustomer}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {saleText.date}
              <Input
                type="date"
                value={saleForm.date}
                onChange={(event) =>
                  setSaleForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>

            <label>
              {saleText.total}
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
              <strong>{saleText.items}</strong>
              {saleForm.items.map((item, index) => (
                <div
                  key={`sale-item-${index}`}
                  className="grid gap-2 rounded-xl border border-[#EEEEEE] p-2"
                >
                  <Input
                    placeholder={saleText.machineType}
                    value={item.machineType}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, machineType: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  />
                  <Input
                    placeholder={saleText.size}
                    value={item.size}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index ? { ...x, size: event.target.value } : x,
                        ),
                      }))
                    }
                    required
                  />
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    placeholder={saleText.quantity}
                    value={item.quantity}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, quantity: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={saleText.unitPrice}
                    value={item.pricePerUnit}
                    onChange={(event) =>
                      setSaleForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === index
                            ? { ...x, pricePerUnit: event.target.value }
                            : x,
                        ),
                      }))
                    }
                    required
                  />
                  {saleForm.items.length > 1 ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSaleForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      {saleText.removeItem}
                    </Button>
                  ) : null}
                </div>
              ))}

              <Button
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
                {saleText.addItem}
              </Button>
            </div>

            <label>
              {saleText.invoice}
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) =>
                  setSaleInvoiceFile(event.target.files?.[0] ?? null)
                }
              />
              {saleInvoiceFile ? (
                <small>
                  {saleText.fileSelected}: {saleInvoiceFile.name}
                </small>
              ) : null}
            </label>

            <div className="flex gap-2">
              <Button type="submit">
                {editingSaleId ? saleText.update : saleText.create}
              </Button>
              {editingSaleId ? (
                <Button variant="ghost" onClick={resetSaleForm}>
                  {saleText.cancel}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="module-panel p-5">
          <PageHeader title={saleText.list} />
          {loadingSales ? <p>{copy.load}</p> : null}
          {!loadingSales && sales.length === 0 ? (
            <EmptyState title={saleText.noData} />
          ) : null}
          <TableShell className="mt-4">
            <TableBase className="admin-table">
              <thead>
                <tr>
                  <th>{saleText.customer}</th>
                  <th>{saleText.date}</th>
                  <th>{saleText.total}</th>
                  <th>{saleText.invoice}</th>
                  <th>{saleText.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const invoiceUrl = getRecordInvoiceUrl(sale);
                  return (
                    <tr key={sale.id}>
                      <td>{sale.customer?.name ?? `#${sale.customerId}`}</td>
                      <td>{new Date(sale.date).toLocaleDateString()}</td>
                      <td>{sale.totalAmount}</td>
                      <td>
                        {invoiceUrl ? (
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            {saleText.invoiceLink}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => startEditSale(sale)}
                          >
                            {saleText.edit}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void deleteSale(sale.id)}
                          >
                            {saleText.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      </section>

      {successMessage ? (
        <div className="auth-alert">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}
