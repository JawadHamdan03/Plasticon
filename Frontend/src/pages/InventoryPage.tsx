import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";
import { ModulePageShell } from "../components/ModulePageShell";

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
  createdBy?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
};

type TransactionResponse = {
  transaction: InventoryTransaction;
  updatedMaterial: RawMaterial;
};

const inventoryTypes = ["IN", "OUT"] as const;
const referenceTypes = ["PRODUCTION", "ADJUSTMENT", "MANUAL", "OTHER"] as const;

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

export function InventoryPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

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
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    materialId: "",
    type: "IN",
    quantity: "",
    referenceType: "PRODUCTION",
    referenceId: "",
  });

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

  useEffect(() => {
    void loadMaterials();
    void loadTransactions();
  }, [loadTransactions]);

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

  return (
    <ModulePageShell
      title={copy.inventory.title}
      subtitle={copy.inventory.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            void loadMaterials();
            void loadTransactions();
          }}
        >
          {copy.refresh}
        </button>
      }
    >
      <div className="module-summary-bar">
        <span>{copy.inventory.totalMaterials}</span>
        <strong>{materials.length}</strong>
        <span>{copy.inventory.totalTransactions}</span>
        <strong>{transactions.length}</strong>
      </div>

      <section className="module-grid">
        <article className="module-panel">
          <h2>{copy.inventory.createTransaction}</h2>
          <form className="module-form" onSubmit={handleSubmit}>
            <label>
              {copy.inventory.material}
              <select
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
              <input
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
              <input
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

            <button type="submit" className="auth-button">
              {copy.inventory.saveTransaction}
            </button>
          </form>
          {successMessage ? (
            <div className="auth-alert">{successMessage}</div>
          ) : null}
          {errorMessage ? (
            <div className="auth-alert auth-alert--error">{errorMessage}</div>
          ) : null}
        </article>

        <article className="module-panel">
          <h2>{copy.inventory.rawMaterialsStock}</h2>
          {loadingMaterials ? <p>{copy.inventory.loadingMaterials}</p> : null}
          <div className="module-list">
            {materials.map((material) => (
              <div className="module-row" key={material.id}>
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
        </article>
      </section>

      <section className="module-panel module-panel--full">
        <h2>
          {canSeeAllTransactions
            ? copy.inventory.allTransactions
            : copy.inventory.myTransactions}
        </h2>
        {loadingTransactions ? (
          <p>{copy.inventory.loadingTransactions}</p>
        ) : null}
        <div className="module-list">
          {transactions.map((transaction) => (
            <div className="module-row" key={transaction.id}>
              <strong>
                {transaction.material?.name ??
                  `Material #${transaction.material?.id ?? transaction.id}`}
              </strong>
              <span>
                {getTransactionTypeLabel(transaction.type as "IN" | "OUT")} •{" "}
                {transaction.quantity}
              </span>
              <small>
                {getReferenceTypeLabel(
                  transaction.referenceType as
                    | "PRODUCTION"
                    | "ADJUSTMENT"
                    | "MANUAL"
                    | "OTHER",
                )}{" "}
                {transaction.referenceId ? `#${transaction.referenceId}` : ""}
              </small>
            </div>
          ))}
        </div>
      </section>
    </ModulePageShell>
  );
}
