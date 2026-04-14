import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { TableBase, TableShell } from "../components/ui/table-shell";

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

type ProductionRecord = {
  id: number;
  cartonsCount: number;
  piecesPerCarton?: number;
  machine?: {
    id: number;
    type?: string | null;
  };
  user?: {
    id: number;
    role?: string | null;
  };
};

type SaleItem = {
  machineType: string;
  quantity: number;
};

type SaleRecord = {
  id: number;
  soldBy?: {
    id: number;
    role?: string | null;
  };
  items: SaleItem[];
};

type ProductBuckets = {
  preform: number;
  caps: number;
  total: number;
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function InventoryStockPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const copy = appCopy[locale];

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingFinishedGoods, setLoadingFinishedGoods] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSeeAllTransactions = useMemo(
    () => user?.role === "ADMIN" || user?.role === "ACCOUNTANT",
    [user?.role],
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

  const loadMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const response = await fetchWithAuth("/inventory/materials");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setMaterials((await response.json()) as RawMaterial[]);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

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
      setTransactions((await response.json()) as InventoryTransaction[]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [canSeeAllTransactions]);

  const classifyProductType = useCallback((value?: string | null) => {
    const normalized = (value ?? "").trim().toUpperCase();
    if (
      normalized === "PREFORM" ||
      normalized.includes("PREFORM") ||
      normalized.includes("PET")
    ) {
      return "PREFORM" as const;
    }
    if (normalized === "CAPS" || normalized.includes("CAP")) {
      return "CAPS" as const;
    }
    return "OTHER" as const;
  }, []);

  const loadFinishedGoods = useCallback(async () => {
    setLoadingFinishedGoods(true);
    try {
      const [productionResponse, salesResponse] = await Promise.all([
        fetchWithAuth("/production/all"),
        fetchWithAuth("/sales/all"),
      ]);

      if (!productionResponse.ok) {
        throw new Error(await readApiError(productionResponse));
      }
      if (!salesResponse.ok) {
        throw new Error(await readApiError(salesResponse));
      }

      setProductions((await productionResponse.json()) as ProductionRecord[]);
      setSales((await salesResponse.json()) as SaleRecord[]);
    } finally {
      setLoadingFinishedGoods(false);
    }
  }, []);

  const produced = useMemo<ProductBuckets>(() => {
    const totals = { preform: 0, caps: 0, total: 0 };
    for (const record of productions) {
      const cartons = Number(record.cartonsCount ?? 0);
      if (!Number.isFinite(cartons) || cartons <= 0) {
        continue;
      }

      totals.total += cartons;
      const productType = classifyProductType(record.machine?.type);
      if (productType === "PREFORM") {
        totals.preform += cartons;
      }
      if (productType === "CAPS") {
        totals.caps += cartons;
      }
    }
    return totals;
  }, [classifyProductType, productions]);

  const sold = useMemo<ProductBuckets>(() => {
    const totals = { preform: 0, caps: 0, total: 0 };
    for (const sale of sales) {
      for (const item of sale.items ?? []) {
        const qty = Number(item.quantity ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) {
          continue;
        }

        totals.total += qty;
        const productType = classifyProductType(item.machineType);
        if (productType === "PREFORM") {
          totals.preform += qty;
        }
        if (productType === "CAPS") {
          totals.caps += qty;
        }
      }
    }
    return totals;
  }, [classifyProductType, sales]);

  const stored = useMemo<ProductBuckets>(
    () => ({
      preform: Math.max(produced.preform - sold.preform, 0),
      caps: Math.max(produced.caps - sold.caps, 0),
      total: Math.max(produced.total - sold.total, 0),
    }),
    [produced, sold],
  );

  const piecesPerCartonByType = useMemo(() => {
    const map: Record<"PREFORM" | "CAPS", number> = {
      PREFORM: 7200,
      CAPS: 6000,
    };

    for (const record of productions) {
      const type = classifyProductType(record.machine?.type);
      const piecesPerCarton = Number(record.piecesPerCarton ?? 0);
      if (
        (type === "PREFORM" || type === "CAPS") &&
        Number.isFinite(piecesPerCarton) &&
        piecesPerCarton > 0
      ) {
        map[type] = piecesPerCarton;
      }
    }

    return map;
  }, [classifyProductType, productions]);

  const stockCards = useMemo(
    () => ({
      preform: {
        boxes: stored.preform,
        piecesPerCarton: piecesPerCartonByType.PREFORM,
        totalPieces: stored.preform * piecesPerCartonByType.PREFORM,
      },
      caps: {
        boxes: stored.caps,
        piecesPerCarton: piecesPerCartonByType.CAPS,
        totalPieces: stored.caps * piecesPerCartonByType.CAPS,
      },
      total: {
        boxes: stored.total,
        totalPieces:
          stored.preform * piecesPerCartonByType.PREFORM +
          stored.caps * piecesPerCartonByType.CAPS,
      },
    }),
    [piecesPerCartonByType, stored],
  );

  const workflowStats = useMemo(() => {
    const workerRecordedCount = productions.filter(
      (record) => (record.user?.role ?? "").toUpperCase() === "WORKER",
    ).length;

    const accountantUploadedCount = sales.filter(
      (sale) => (sale.soldBy?.role ?? "").toUpperCase() === "ACCOUNTANT",
    ).length;

    return {
      workerRecordedCount,
      accountantUploadedCount,
      adminVisibleCount: productions.length,
    };
  }, [productions, sales]);

  const inventoryKpis = useMemo(() => {
    const totalRawQuantity = materials.reduce(
      (sum, material) => sum + (Number(material.currentQuantity) || 0),
      0,
    );

    return {
      materialsCount: materials.length,
      totalRawQuantity,
      stockBoxes: stockCards.total.boxes,
      stockPieces: stockCards.total.totalPieces,
      movementsCount: transactions.length,
    };
  }, [
    materials,
    stockCards.total.boxes,
    stockCards.total.totalPieces,
    transactions.length,
  ]);

  useEffect(() => {
    const loadAll = async () => {
      setErrorMessage("");
      try {
        await Promise.all([
          loadMaterials(),
          loadTransactions(),
          loadFinishedGoods(),
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
  }, [loadMaterials, loadTransactions, loadFinishedGoods]);

  return (
    <ModulePageShell
      title={copy.inventory.title}
      subtitle=""
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void loadMaterials();
            void loadTransactions();
            void loadFinishedGoods();
          }}
        >
          {copy.refresh}
        </Button>
      }
    >
      <div className="inventory-kpi-grid">
        <article className="inventory-kpi-card">
          <span>{isArabic ? "عدد المواد الخام" : "Raw materials"}</span>
          <strong>
            {inventoryKpis.materialsCount.toLocaleString(
              locale === "ar" ? "ar-EG" : "en-US",
            )}
          </strong>
        </article>
        <article className="inventory-kpi-card">
          <span>{isArabic ? "إجمالي كمية الخام" : "Total raw quantity"}</span>
          <strong>
            {inventoryKpis.totalRawQuantity.toLocaleString(
              locale === "ar" ? "ar-EG" : "en-US",
            )}
          </strong>
        </article>
        <article className="inventory-kpi-card">
          <span>
            {isArabic ? "المخزون الجاهز (صناديق)" : "Ready stock (boxes)"}
          </span>
          <strong>
            {inventoryKpis.stockBoxes.toLocaleString(
              locale === "ar" ? "ar-EG" : "en-US",
            )}
          </strong>
        </article>
        <article className="inventory-kpi-card">
          <span>
            {isArabic ? "المخزون الجاهز (قطع)" : "Ready stock (pieces)"}
          </span>
          <strong>
            {inventoryKpis.stockPieces.toLocaleString(
              locale === "ar" ? "ar-EG" : "en-US",
            )}
          </strong>
          <small>
            {isArabic
              ? `حركات المخزون: ${inventoryKpis.movementsCount}`
              : `Stock movements: ${inventoryKpis.movementsCount}`}
          </small>
        </article>
      </div>

      <Card className="module-panel p-5">
        <PageHeader
          title={isArabic ? "مخزون البضاعة الجاهزة" : "Finished goods stock"}
          subtitle={
            isArabic
              ? "دينمك حسب سير العمل: العامل يسجل الإنتاج، والمحاسب يرفعه على النظام، ثم يظهر للإدمن."
              : "Dynamic workflow: worker records production, accountant uploads to system, then admin sees it."
          }
        />
        {loadingFinishedGoods ? (
          <p>
            {isArabic
              ? "جارٍ تحميل البضاعة الجاهزة..."
              : "Loading finished goods..."}
          </p>
        ) : null}

        <div className="inventory-finished-grid mt-4">
          <article className="inventory-finished-card">
            <span>{isArabic ? "بريفورم" : "Preform"}</span>
            <strong>
              {stockCards.preform.boxes.toLocaleString(
                locale === "ar" ? "ar-EG" : "en-US",
              )}{" "}
              {isArabic ? "صندوق" : "boxes"}
            </strong>
            <small>
              {isArabic
                ? `القطعة/صندوق: ${stockCards.preform.piecesPerCarton.toLocaleString("ar-EG")}`
                : `Pieces/box: ${stockCards.preform.piecesPerCarton.toLocaleString("en-US")}`}
            </small>
            <small>
              {isArabic
                ? `المجموع: ${stockCards.preform.totalPieces.toLocaleString("ar-EG")} قطعة`
                : `Total: ${stockCards.preform.totalPieces.toLocaleString("en-US")} pieces`}
            </small>
          </article>

          <article className="inventory-finished-card">
            <span>{isArabic ? "أغطية" : "Caps"}</span>
            <strong>
              {stockCards.caps.boxes.toLocaleString(
                locale === "ar" ? "ar-EG" : "en-US",
              )}{" "}
              {isArabic ? "صندوق" : "boxes"}
            </strong>
            <small>
              {isArabic
                ? `القطعة/صندوق: ${stockCards.caps.piecesPerCarton.toLocaleString("ar-EG")}`
                : `Pieces/box: ${stockCards.caps.piecesPerCarton.toLocaleString("en-US")}`}
            </small>
            <small>
              {isArabic
                ? `المجموع: ${stockCards.caps.totalPieces.toLocaleString("ar-EG")} قطعة`
                : `Total: ${stockCards.caps.totalPieces.toLocaleString("en-US")} pieces`}
            </small>
          </article>

          <article className="inventory-finished-card">
            <span>{isArabic ? "الإجمالي" : "Total"}</span>
            <strong>
              {stockCards.total.boxes.toLocaleString(
                locale === "ar" ? "ar-EG" : "en-US",
              )}{" "}
              {isArabic ? "صندوق" : "boxes"}
            </strong>
            <small>
              {isArabic
                ? `إجمالي القطع: ${stockCards.total.totalPieces.toLocaleString("ar-EG")} قطعة`
                : `Total pieces: ${stockCards.total.totalPieces.toLocaleString("en-US")} pieces`}
            </small>
            <small>
              {isArabic
                ? `مرجع الحساب: بريفورم ${piecesPerCartonByType.PREFORM} • أغطية ${piecesPerCartonByType.CAPS}`
                : `Reference: Preform ${piecesPerCartonByType.PREFORM} • Caps ${piecesPerCartonByType.CAPS}`}
            </small>
          </article>
        </div>

        <div className="inventory-workflow-strip mt-4">
          <Badge tone="soft">
            {isArabic
              ? `العامل سجّل: ${workflowStats.workerRecordedCount}`
              : `Worker recorded: ${workflowStats.workerRecordedCount}`}
          </Badge>
          <Badge tone="soft">
            {isArabic
              ? `المحاسب رفع: ${workflowStats.accountantUploadedCount}`
              : `Accountant uploaded: ${workflowStats.accountantUploadedCount}`}
          </Badge>
          <Badge tone="soft">
            {isArabic
              ? `ظاهر للإدمن: ${workflowStats.adminVisibleCount}`
              : `Visible to admin: ${workflowStats.adminVisibleCount}`}
          </Badge>
        </div>
      </Card>

      <Card className="module-panel p-5">
        <PageHeader title={copy.inventory.rawMaterialsStock} />
        {loadingMaterials ? <p>{copy.inventory.loadingMaterials}</p> : null}
        <div className="module-list inventory-stock-row mt-4">
          {!loadingMaterials && materials.length === 0 ? (
            <EmptyState title={copy.inventory.noTransactions} />
          ) : null}
          {materials.map((material) => (
            <div
              className="module-row inventory-stock-chip rounded-2xl border border-[#EEEEEE] bg-[#FFFFFF] p-3"
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
                <th className="px-3 py-2 text-left">
                  {isArabic ? "المادة" : "Material"}
                </th>
                <th className="px-3 py-2 text-left">
                  {isArabic ? "النوع" : "Type"}
                </th>
                <th className="px-3 py-2 text-left">
                  {isArabic ? "الكمية" : "Qty"}
                </th>
                <th className="px-3 py-2 text-left">
                  {isArabic ? "المرجع" : "Reference"}
                </th>
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

      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}
