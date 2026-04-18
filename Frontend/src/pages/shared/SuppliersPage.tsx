import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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

type RawMaterial = {
  id: number;
  name: string;
  unit: string;
};

type SupplierOption = {
  id: number;
  name: string;
};

type PurchaseItem = {
  id: number;
  materialId: number;
  quantity: number;
  pricePerUnit: number;
  material?: RawMaterial;
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
  supplier?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: PurchaseItem[];
  fileAttachments?: FileAttachment[];
};

type SupplierLedger = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  totalSpent: number;
  purchasesCount: number;
  lastPurchaseDate: string | null;
  purchases: PurchaseRecord[];
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

const formatMoney = (locale: string, value: number) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (locale: string, value: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
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

export function SuppliersPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const canManagePurchases = user?.role === "ACCOUNTANT";

  const text = useMemo(
    () => ({
      title: isArabic ? "المشتريات" : "Purchases",
      subtitle: isArabic
        ? "إدارة مشتريات الموردين مع تاريخ الاستلام والأصناف والكمية وسعر الوحدة والإجمالي، مع عرض فقط للأدمن."
        : "Manage supplier receipts with received date, items, quantity, unit price, and total, with view-only access for admins.",
      summarySuppliers: isArabic ? "الموردون" : "Suppliers",
      summaryPurchases: isArabic ? "عمليات الشراء" : "Purchases",
      summaryAmount: isArabic ? "إجمالي المشتريات" : "Total spent",
      refresh: isArabic ? "تحديث" : "Refresh",
      searchTitle: isArabic
        ? "ابحث في الموردين والمشتريات"
        : "Search suppliers and purchases",
      searchPlaceholder: isArabic
        ? "اسم المورد، المادة، الهاتف، أو رقم الفاتورة"
        : "Supplier, material, phone, or invoice number",
      formTitle: isArabic ? "تفاصيل عملية الشراء" : "Purchase details",
      supplier: isArabic ? "المورد" : "Supplier",
      selectSupplier: isArabic ? "اختر المورد" : "Select supplier",
      receivedDate: isArabic ? "تاريخ استلام البضاعة" : "Received date",
      totalAmount: isArabic ? "إجمالي السعر" : "Total amount",
      items: isArabic ? "الأصناف" : "Items",
      material: isArabic ? "اسم البضاعة" : "Item name",
      quantity: isArabic ? "الكمية" : "Quantity",
      unit: isArabic ? "الوحدة" : "Unit",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
      addItem: isArabic ? "إضافة صنف" : "Add item",
      removeItem: isArabic ? "حذف الصنف" : "Remove item",
      invoice: isArabic ? "الفاتورة (PDF/صورة)" : "Invoice (PDF/Image)",
      fileSelected: isArabic ? "الملف المحدد" : "Selected file",
      create: isArabic ? "إضافة شراء" : "Create purchase",
      update: isArabic ? "حفظ التعديل" : "Save changes",
      cancel: isArabic ? "إلغاء التعديل" : "Cancel edit",
      listTitle: isArabic
        ? "سجل الموردين والعمليات"
        : "Supplier and purchase ledger",
      noData: isArabic ? "لا توجد عمليات شراء بعد" : "No purchases yet",
      edit: isArabic ? "تعديل" : "Edit",
      delete: isArabic ? "حذف" : "Delete",
      confirmDelete: isArabic
        ? "هل أنت متأكد من حذف عملية الشراء؟"
        : "Are you sure you want to delete this purchase?",
      invoiceLink: isArabic ? "عرض الفاتورة" : "View invoice",
      purchaseDate: isArabic ? "التاريخ" : "Date",
      invoiceCol: isArabic ? "الفاتورة" : "Invoice",
      actions: isArabic ? "إجراءات" : "Actions",
      totalPurchases: isArabic ? "إجمالي عمليات الشراء" : "Total purchases",
      loading: isArabic ? "جارٍ التحميل..." : "Loading...",
    }),
    [isArabic],
  );

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [query, setQuery] = useState("");

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

  const loadMaterials = useCallback(async () => {
    const response = await fetchWithAuth("/inventory/materials");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setMaterials((await response.json()) as RawMaterial[]);
  }, []);

  const loadSuppliers = useCallback(async () => {
    const response = await fetchWithAuth("/purchases/suppliers");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setSuppliers((await response.json()) as SupplierOption[]);
  }, []);

  const loadPurchases = useCallback(async () => {
    const response = await fetchWithAuth("/purchases/all");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setPurchases((await response.json()) as PurchaseRecord[]);
  }, []);

  const resetForm = () => {
    setPurchaseForm({
      supplierId: "",
      date: "",
      totalAmount: "",
      items: [{ materialId: "", quantity: "", pricePerUnit: "" }],
    });
    setPurchaseInvoiceFile(null);
    setEditingPurchaseId(null);
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        await Promise.all([loadMaterials(), loadSuppliers(), loadPurchases()]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load suppliers",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [loadMaterials, loadPurchases, loadSuppliers]);

  const ledgers = useMemo<SupplierLedger[]>(() => {
    const map = new Map<number, SupplierLedger>();

    for (const purchase of purchases) {
      const supplierId = purchase.supplier?.id ?? purchase.supplierId;
      const supplierName = purchase.supplier?.name ?? `#${supplierId}`;
      const current = map.get(supplierId) ?? {
        id: supplierId,
        name: supplierName,
        phone: purchase.supplier?.phone ?? null,
        email: purchase.supplier?.email ?? null,
        address: purchase.supplier?.address ?? null,
        totalSpent: 0,
        purchasesCount: 0,
        lastPurchaseDate: null,
        purchases: [],
      };

      current.totalSpent += purchase.totalAmount ?? 0;
      current.purchasesCount += 1;
      current.purchases.push(purchase);

      if (
        !current.lastPurchaseDate ||
        new Date(purchase.date).getTime() >
          new Date(current.lastPurchaseDate).getTime()
      ) {
        current.lastPurchaseDate = purchase.date;
      }

      map.set(supplierId, current);
    }

    return Array.from(map.values())
      .map((ledger) => ({
        ...ledger,
        purchases: ledger.purchases.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [purchases]);

  const filteredLedgers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return ledgers;
    }

    return ledgers.filter((ledger) => {
      const haystack = [
        ledger.name,
        ledger.phone ?? "",
        ledger.email ?? "",
        ledger.address ?? "",
        ...ledger.purchases.flatMap((purchase) => [
          purchase.items
            .map((item) => item.material?.name ?? `#${item.materialId}`)
            .join(" "),
          purchase.invoiceImage,
          purchase.invoiceUrl ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [ledgers, query]);

  const totals = useMemo(() => {
    return {
      suppliers: ledgers.length,
      purchases: purchases.length,
      amount: purchases.reduce(
        (sum, purchase) => sum + purchase.totalAmount,
        0,
      ),
    };
  }, [ledgers.length, purchases]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManagePurchases) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = new FormData();
      body.append("supplierId", purchaseForm.supplierId);
      if (purchaseForm.date) {
        body.append("date", purchaseForm.date);
      }
      if (purchaseForm.totalAmount) {
        body.append("totalAmount", purchaseForm.totalAmount);
      }

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
            ? "تم تعديل عملية الشراء"
            : "Purchase updated successfully"
          : isArabic
            ? "تمت إضافة عملية شراء جديدة"
            : "Purchase created successfully",
      );

      await Promise.all([loadPurchases(), loadMaterials()]);
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save purchase",
      );
    }
  };

  const deletePurchase = async (id: number) => {
    if (!canManagePurchases) {
      return;
    }

    const confirmed = window.confirm(text.confirmDelete);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/purchases/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadPurchases();
      setSuccessMessage(isArabic ? "تم حذف عملية الشراء" : "Purchase deleted");
      if (editingPurchaseId === id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete purchase",
      );
    }
  };

  const startEditPurchase = (purchase: PurchaseRecord) => {
    if (!canManagePurchases) {
      return;
    }

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

  return (
    <ModulePageShell
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void loadMaterials();
            void loadSuppliers();
            void loadPurchases();
          }}
        >
          {text.refresh}
        </Button>
      }
    >
      <div className="module-summary-bar flex flex-wrap items-center gap-2 rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3">
        <Badge tone="soft">{text.summarySuppliers}</Badge>
        <Badge>{totals.suppliers}</Badge>
        <Badge tone="soft">{text.summaryPurchases}</Badge>
        <Badge>{totals.purchases}</Badge>
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
        {canManagePurchases ? (
          <Card className="module-panel p-5">
            <PageHeader title={text.formTitle} />
            <form
              className="module-form mt-4 grid gap-3"
              onSubmit={handleSubmit}
            >
              <label>
                {text.supplier}
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
                  <option value="">{text.selectSupplier}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {text.receivedDate}
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
                {text.totalAmount}
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
                <strong>{text.items}</strong>
                {purchaseForm.items.map((item, index) => {
                  const selectedMaterial = materials.find(
                    (material) => String(material.id) === item.materialId,
                  );

                  return (
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
                            items: prev.items.map((current, currentIndex) =>
                              currentIndex === index
                                ? { ...current, materialId: event.target.value }
                                : current,
                            ),
                          }))
                        }
                        required
                      >
                        <option value="">{text.material}</option>
                        {materials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name}
                          </option>
                        ))}
                      </select>
                      {selectedMaterial ? (
                        <small className="text-[#5F6659]">
                          {text.unit}: {selectedMaterial.unit}
                        </small>
                      ) : null}
                      <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        placeholder={text.quantity}
                        value={item.quantity}
                        onChange={(event) =>
                          setPurchaseForm((prev) => ({
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
                          setPurchaseForm((prev) => ({
                            ...prev,
                            items: prev.items.map((current, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...current,
                                    pricePerUnit: event.target.value,
                                  }
                                : current,
                            ),
                          }))
                        }
                        required
                      />
                      {purchaseForm.items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setPurchaseForm((prev) => ({
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
                  );
                })}
                <Button
                  type="button"
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
                  {text.addItem}
                </Button>
              </div>

              <label>
                {text.invoice}
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) =>
                    setPurchaseInvoiceFile(event.target.files?.[0] ?? null)
                  }
                />
                {purchaseInvoiceFile ? (
                  <small>
                    {text.fileSelected}: {purchaseInvoiceFile.name}
                  </small>
                ) : null}
              </label>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingPurchaseId ? text.update : text.create}
                </Button>
                {editingPurchaseId ? (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    {text.cancel}
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        ) : null}

        <Card className="module-panel p-5">
          <PageHeader title={text.summarySuppliers} />
          {loading ? <p>{text.loading}</p> : null}
          {!loading && filteredLedgers.length === 0 ? (
            <EmptyState title={text.noData} />
          ) : null}
          <TableShell className="mt-4 suppliers-table-wrap">
            <TableBase className="admin-table suppliers-table">
              <thead>
                <tr>
                  <th>{text.supplier}</th>
                  <th>{text.totalPurchases}</th>
                  <th>{text.summaryAmount}</th>
                  <th>{text.purchaseDate}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.map((ledger) => (
                  <tr key={ledger.id}>
                    <td>
                      <strong>{ledger.name}</strong>
                      <div className="text-xs text-[#5F6659]">
                        {ledger.phone ?? ledger.email ?? ledger.address ?? "-"}
                      </div>
                    </td>
                    <td>{ledger.purchasesCount}</td>
                    <td>{formatMoney(locale, ledger.totalSpent)}</td>
                    <td>
                      {ledger.lastPurchaseDate
                        ? formatDate(locale, ledger.lastPurchaseDate)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBase>
          </TableShell>
        </Card>
      </section>

      <Card className="module-panel p-5">
        <PageHeader title={text.listTitle} />
        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}
        {successMessage ? (
          <div className="auth-alert auth-alert--success">{successMessage}</div>
        ) : null}
        {!loading && filteredLedgers.length === 0 ? (
          <EmptyState title={text.noData} />
        ) : null}
        <TableShell className="mt-4 suppliers-table-wrap">
          <TableBase className="admin-table suppliers-table">
            <thead>
              <tr>
                <th>{text.supplier}</th>
                <th>{text.purchaseDate}</th>
                <th>{text.items}</th>
                <th>{text.totalAmount}</th>
                <th>{text.invoiceCol}</th>
                {canManagePurchases ? <th>{text.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredLedgers.flatMap((ledger) =>
                ledger.purchases.map((purchase) => {
                  const invoiceUrl = getRecordInvoiceUrl(purchase);
                  return (
                    <tr key={purchase.id}>
                      <td>{purchase.supplier?.name ?? ledger.name}</td>
                      <td>{formatDate(locale, purchase.date)}</td>
                      <td>
                        <div className="grid gap-1">
                          {purchase.items.map((item) => (
                            <div
                              key={item.id}
                              className="text-xs text-[#5F6659]"
                            >
                              {item.material?.name ?? `#${item.materialId}`}
                              {item.material?.unit
                                ? ` (${item.material.unit})`
                                : ""}
                              {` · ${item.quantity} × ${formatMoney(locale, item.pricePerUnit)}`}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{formatMoney(locale, purchase.totalAmount)}</td>
                      <td>
                        {invoiceUrl ? (
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            {text.invoiceLink}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      {canManagePurchases ? (
                        <td>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEditPurchase(purchase)}
                            >
                              {text.edit}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void deletePurchase(purchase.id)}
                            >
                              {text.delete}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                }),
              )}
            </tbody>
          </TableBase>
        </TableShell>
      </Card>
    </ModulePageShell>
  );
}
