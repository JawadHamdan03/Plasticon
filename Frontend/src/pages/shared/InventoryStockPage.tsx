import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";

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
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
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

  const loc = (en: string, ar: string) => (isArabic ? ar : en);

  return (
    <ModulePageShell
      title={copy.inventory.title}
      subtitle={loc("Raw materials, finished goods, and stock movements.", "المواد الخام والبضاعة الجاهزة وحركات المخزون.")}
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
      {errorMessage ? (
        <div className="auth-alert auth-alert--error mb-4">{errorMessage}</div>
      ) : null}

      {/* Top KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: loc("Raw Materials", "عدد المواد الخام"), value: inventoryKpis.materialsCount.toLocaleString(), sub: null, gradient: "bg-linear-to-br from-blue-500 to-blue-700" },
          { label: loc("Total Raw Qty", "إجمالي كمية الخام"), value: inventoryKpis.totalRawQuantity.toLocaleString(), sub: null, gradient: "bg-linear-to-br from-purple-500 to-purple-700" },
          { label: loc("Ready Stock (boxes)", "المخزون الجاهز (صناديق)"), value: inventoryKpis.stockBoxes.toLocaleString(), sub: null, gradient: "bg-linear-to-br from-orange-500 to-orange-700" },
          { label: loc("Ready Stock (pieces)", "المخزون الجاهز (قطع)"), value: inventoryKpis.stockPieces.toLocaleString(), sub: loc(`${inventoryKpis.movementsCount} movements`, `${inventoryKpis.movementsCount} حركة`), gradient: "bg-linear-to-br from-green-500 to-emerald-700" },
        ].map((kpi) => (
          <Card key={kpi.label} className={`${kpi.gradient} p-4 text-white`}>
            <p style={{ margin: "0 0 .5rem", fontSize: ".8rem", fontWeight: 600, opacity: .85 }}>{kpi.label}</p>
            <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-.03em" }}>{kpi.value}</p>
            {kpi.sub ? <p style={{ margin: ".25rem 0 0", fontSize: ".75rem", opacity: .75 }}>{kpi.sub}</p> : null}
          </Card>
        ))}
      </div>

      {/* Finished goods section */}
      <Card className="p-5 mb-5">
        <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{loc("Finished Goods Stock", "مخزون البضاعة الجاهزة")}</h2>
          <p style={{ margin: ".25rem 0 0", fontSize: ".825rem", color: "var(--text-secondary)" }}>
            {loc("Dynamic: worker records → accountant uploads → admin sees.", "العامل يسجل → المحاسب يرفع → الإدمن يرى.")}
          </p>
        </div>

        {loadingFinishedGoods ? <p style={{ color: "var(--text-secondary)" }}>{loc("Loading…", "جارٍ التحميل…")}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          {[
            { label: loc("Preform", "بريفورم"), boxes: stockCards.preform.boxes, ppc: stockCards.preform.piecesPerCarton, total: stockCards.preform.totalPieces, color: "#3b82f6" },
            { label: loc("Caps", "أغطية"), boxes: stockCards.caps.boxes, ppc: stockCards.caps.piecesPerCarton, total: stockCards.caps.totalPieces, color: "#f97316" },
            { label: loc("Total", "الإجمالي"), boxes: stockCards.total.boxes, ppc: null, total: stockCards.total.totalPieces, color: "#22c55e" },
          ].map((item) => (
            <div key={item.label} style={{ padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{item.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>{item.boxes.toLocaleString()} <span style={{ fontSize: ".8rem", fontWeight: 500, color: "var(--text-secondary)" }}>{loc("boxes", "صندوق")}</span></p>
              {item.ppc ? <p style={{ margin: ".2rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{loc("Pieces/box", "قطعة/صندوق")}: {item.ppc.toLocaleString()}</p> : null}
              <p style={{ margin: ".2rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{loc("Total pieces", "إجمالي القطع")}: {item.total.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          {[
            { label: loc(`Worker recorded: ${workflowStats.workerRecordedCount}`, `العامل سجّل: ${workflowStats.workerRecordedCount}`) },
            { label: loc(`Accountant uploaded: ${workflowStats.accountantUploadedCount}`, `المحاسب رفع: ${workflowStats.accountantUploadedCount}`) },
            { label: loc(`Visible to admin: ${workflowStats.adminVisibleCount}`, `ظاهر للإدمن: ${workflowStats.adminVisibleCount}`) },
          ].map((b) => (
            <Badge key={b.label} tone="soft">{b.label}</Badge>
          ))}
        </div>
      </Card>

      {/* Raw materials cards */}
      <Card className="p-5 mb-5">
        <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: ".75rem", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{copy.inventory.rawMaterialsStock}</h2>
        </div>
        {loadingMaterials ? <p style={{ color: "var(--text-secondary)" }}>{copy.inventory.loadingMaterials}</p> : null}
        {!loadingMaterials && materials.length === 0 ? (
          <EmptyState title={copy.inventory.noTransactions} />
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: ".75rem" }}>
          {materials.map((material) => (
            <div
              key={material.id}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-card)",
                display: "flex",
                flexDirection: "column",
                gap: ".3rem",
              }}
            >
              <strong style={{ fontSize: ".9rem" }}>{material.name}</strong>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {material.currentQuantity} <span style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--text-secondary)" }}>{material.unit}</span>
              </span>
              <small style={{ color: "var(--text-secondary)", fontSize: ".75rem" }}>
                {copy.inventory.lastTransaction}:{" "}
                {material.lastTransaction
                  ? `${getTransactionTypeLabel(material.lastTransaction.type as "IN" | "OUT")} ${material.lastTransaction.quantity}`
                  : copy.inventory.noTransactions}
              </small>
            </div>
          ))}
        </div>
      </Card>

      {/* Transactions table */}
      <Card className="overflow-hidden">
        <div style={{ padding: "1rem 1.25rem .75rem", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            {canSeeAllTransactions ? copy.inventory.allTransactions : copy.inventory.myTransactions}
          </h2>
        </div>
        {loadingTransactions ? <p style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>{copy.inventory.loadingTransactions}</p> : null}
        {!loadingTransactions && transactions.length === 0 ? (
          <div style={{ padding: "2rem 1.25rem" }}><EmptyState title={copy.inventory.noTransactions} /></div>
        ) : null}
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{isArabic ? "المادة" : "Material"}</th>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "الكمية" : "Qty"}</th>
                <th>{isArabic ? "المرجع" : "Reference"}</th>
                <th>{isArabic ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td style={{ fontWeight: 600 }}>
                    {transaction.material?.name ?? `Material #${transaction.id}`}
                  </td>
                  <td>
                    <span style={{
                      padding: ".2rem .6rem",
                      borderRadius: 999,
                      fontSize: ".78rem",
                      fontWeight: 700,
                      background: transaction.type === "IN" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
                      color: transaction.type === "IN" ? "#16a34a" : "#dc2626",
                    }}>
                      {getTransactionTypeLabel(transaction.type as "IN" | "OUT")}
                    </span>
                  </td>
                  <td><strong>{transaction.quantity}</strong> {transaction.material?.unit ?? ""}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>
                    {getReferenceTypeLabel(transaction.referenceType as "PRODUCTION" | "ADJUSTMENT" | "MANUAL" | "OTHER")}
                    {transaction.referenceId ? ` #${transaction.referenceId}` : ""}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>
                    {new Date(transaction.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ModulePageShell>
  );
}
