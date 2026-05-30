import { useCallback, useEffect, useMemo, useState } from "react";
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
  mimeType: string;
  publicUrl?: string;
};

type SaleRecord = {
  id: number;
  customerId: number;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  date: string;
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
};

type CustomerLedger = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  totalDebt: number;
  salesCount: number;
  lastSaleDate: string | null;
  sales: SaleRecord[];
};

function authToken(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authToken(),
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

export function CustomersPage() {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");

  const loadSales = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/sales/all");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setSales((await response.json()) as SaleRecord[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const ledgers = useMemo<CustomerLedger[]>(() => {
    const map = new Map<number, CustomerLedger>();

    for (const sale of sales) {
      const customerId = sale.customer?.id ?? sale.customerId;
      const customerName = sale.customer?.name ?? `#${customerId}`;
      const current = map.get(customerId) ?? {
        id: customerId,
        name: customerName,
        phone: sale.customer?.phone ?? null,
        email: sale.customer?.email ?? null,
        address: sale.customer?.address ?? null,
        totalDebt: 0,
        salesCount: 0,
        lastSaleDate: null,
        sales: [],
      };

      current.totalDebt += sale.totalAmount ?? 0;
      current.salesCount += 1;
      current.sales.push(sale);

      if (
        !current.lastSaleDate ||
        new Date(sale.date).getTime() > new Date(current.lastSaleDate).getTime()
      ) {
        current.lastSaleDate = sale.date;
      }

      map.set(customerId, current);
    }

    return Array.from(map.values())
      .map((ledger) => ({
        ...ledger,
        sales: ledger.sales.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [sales]);

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
        ...ledger.sales.flatMap((sale) => [
          sale.items
            .map((item) => `${item.machineType} ${item.size} ${item.quantity}`)
            .join(" "),
          sale.invoiceImage,
          sale.invoiceUrl ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [ledgers, query]);

  const totals = useMemo(() => {
    return {
      customers: ledgers.length,
      debt: ledgers.reduce((sum, ledger) => sum + ledger.totalDebt, 0),
      sales: sales.length,
    };
  }, [ledgers.length, sales.length, sales]);

  return (
    <ModulePageShell
      title={isArabic ? "الزبائن والمديونيات" : "Customers & Debts"}
      subtitle={
        isArabic
          ? "هذه الصفحة تجمع مديونية كل زبون من سجلات المبيعات التي أضافها المحاسب، مع تفاصيل الأصناف وتاريخ البيع وصورة الفاتورة."
          : "This page groups each customer's outstanding debt from recorded sales, with item details, dates, and invoice images."
      }
      actions={
        <Button variant="outline" onClick={() => void loadSales()}>
          {isArabic ? "تحديث" : "Refresh"}
        </Button>
      }
    >
      <div className="module-summary-bar flex flex-wrap items-center gap-2 rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3">
        <Badge tone="soft">{isArabic ? "الزبائن" : "Customers"}</Badge>
        <Badge>{totals.customers}</Badge>
        <Badge tone="soft">{isArabic ? "إجمالي الدين" : "Total debt"}</Badge>
        <Badge>{formatMoney(locale, totals.debt)}</Badge>
        <Badge tone="soft">{isArabic ? "سجلات البيع" : "Sales records"}</Badge>
        <Badge>{totals.sales}</Badge>
      </div>

      <Card className="module-panel p-5">
        <PageHeader
          title={isArabic ? "ابحث عن زبون" : "Search customers"}
          subtitle={
            isArabic
              ? "ابحث بالاسم أو الهاتف أو تفاصيل الفاتورة"
              : "Search by name, phone, or invoice details"
          }
        />
        <div className="mt-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isArabic
                ? "اكتب اسم الزبون أو الهاتف"
                : "Type customer name or phone"
            }
          />
        </div>
      </Card>

      {loading ? (
        <p>{isArabic ? "جاري تحميل الزبائن..." : "Loading customers..."}</p>
      ) : null}
      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}

      {!loading && filteredLedgers.length === 0 ? (
        <EmptyState
          title={
            isArabic ? "لا يوجد زبائن لديهم مديونية" : "No customer debts found"
          }
          description={
            isArabic
              ? "إذا كانت هناك مبيعات مسجلة سيظهر كل زبون هنا مع تفاصيل المبيعات والفاتورة."
              : "Once sales are recorded, each customer will appear here with their sales and invoice image."
          }
        />
      ) : null}

      <div className="grid gap-4">
        {filteredLedgers.map((ledger) => (
          <Card key={ledger.id} className="module-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5F6659]">
                  {isArabic ? "الزبون" : "Customer"}
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#000000]">
                  {ledger.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#5F6659]">
                  {ledger.phone ? <span>{ledger.phone}</span> : null}
                  {ledger.email ? <span>{ledger.email}</span> : null}
                  {ledger.address ? <span>{ledger.address}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">
                  {isArabic ? "مديون" : "Debt"}:{" "}
                  {formatMoney(locale, ledger.totalDebt)}
                </Badge>
                <Badge tone="soft">
                  {isArabic ? "المبيعات" : "Sales"}: {ledger.salesCount}
                </Badge>
                <Badge tone="soft">
                  {isArabic ? "آخر بيع" : "Last sale"}:{" "}
                  {ledger.lastSaleDate
                    ? formatDate(locale, ledger.lastSaleDate)
                    : "-"}
                </Badge>
              </div>
            </div>

            <TableShell className="mt-4">
              <TableBase className="admin-table">
                <thead>
                  <tr>
                    <th>{isArabic ? "التاريخ" : "Date"}</th>
                    <th>{isArabic ? "المنتجات" : "Items"}</th>
                    <th>{isArabic ? "الإجمالي" : "Amount"}</th>
                    <th>{isArabic ? "الفاتورة" : "Invoice"}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.sales.map((sale) => {
                    const invoiceUrl = toPublicFileUrl(
                      sale.invoiceUrl ??
                        sale.fileAttachments?.[0]?.publicUrl ??
                        sale.fileAttachments?.[0]?.filePath ??
                        sale.invoiceImage,
                    );
                    const firstAttachment = sale.fileAttachments?.[0];
                    const isImage =
                      firstAttachment?.mimeType?.startsWith("image/") ||
                      /\.(png|jpe?g|gif|webp)$/i.test(invoiceUrl);

                    return (
                      <tr key={sale.id}>
                        <td>{formatDate(locale, sale.date)}</td>
                        <td>
                          <div className="grid gap-1">
                            {sale.items.map((item) => (
                              <span key={item.id} className="text-sm">
                                {item.machineType} {item.size} x {item.quantity}{" "}
                                @ {formatMoney(locale, item.pricePerUnit)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{formatMoney(locale, sale.totalAmount)}</td>
                        <td>
                          {invoiceUrl ? (
                            <div className="grid gap-2">
                              {isImage ? (
                                <a
                                  href={invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={invoiceUrl}
                                    alt={
                                      isArabic
                                        ? "صورة الفاتورة"
                                        : "Invoice image"
                                    }
                                    className="h-20 w-20 rounded-xl border border-[#EEEEEE] object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-fit items-center rounded-full border border-[#EEEEEE] bg-[#FAF9EE] px-3 py-1 text-sm font-semibold text-[#000000]"
                                >
                                  {firstAttachment?.fileName ??
                                    (isArabic
                                      ? "فتح الفاتورة"
                                      : "Open invoice")}
                                </a>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableBase>
            </TableShell>
          </Card>
        ))}
      </div>
    </ModulePageShell>
  );
}

