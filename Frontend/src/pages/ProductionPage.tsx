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

type ProductionItem = {
  id: number;
  productionDate: string;
  date: string;
  shiftId: number | null;
  machineId: number | null;
  status: string;
  producedCartons?: number | null;
  totalCartons?: number | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
};

type ProductionResponse = {
  production: ProductionItem;
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

export function ProductionPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const [myProductions, setMyProductions] = useState<ProductionItem[]>([]);
  const [allProductions, setAllProductions] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    productionDate: new Date().toISOString().slice(0, 10),
    shiftId: "",
    machineId: "",
    cartons: "",
    notes: "",
  });

  const canSeeAllProductions = useMemo(
    () => user?.role === "ADMIN" || user?.role === "ACCOUNTANT",
    [user?.role],
  );

  const loadProductions = useCallback(async () => {
    setLoading(true);
    try {
      const [mineResponse, allResponse] = await Promise.all([
        fetchWithAuth("/production/me"),
        canSeeAllProductions
          ? fetchWithAuth("/production/all")
          : Promise.resolve(null),
      ]);

      if (!mineResponse.ok) {
        throw new Error(await readApiError(mineResponse));
      }
      setMyProductions((await mineResponse.json()) as ProductionItem[]);

      if (allResponse) {
        if (!allResponse.ok) {
          throw new Error(await readApiError(allResponse));
        }
        setAllProductions((await allResponse.json()) as ProductionItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [canSeeAllProductions]);

  useEffect(() => {
    void loadProductions();
  }, [loadProductions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        productionDate: form.productionDate,
        shiftId: form.shiftId ? Number(form.shiftId) : undefined,
        machineId: form.machineId ? Number(form.machineId) : undefined,
        cartons: form.cartons ? Number(form.cartons) : undefined,
        notes: form.notes || undefined,
      };

      const response = await fetchWithAuth("/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as ProductionResponse;
      setSuccessMessage(
        `Production record #${data.production.id} saved successfully.`,
      );
      setForm((prev) => ({
        ...prev,
        shiftId: "",
        machineId: "",
        cartons: "",
        notes: "",
      }));
      await loadProductions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save production record",
      );
    }
  };

  return (
    <ModulePageShell
      title={copy.production.title}
      subtitle={copy.production.subtitle}
      actions={
        <button
          type="button"
          className="auth-button auth-button--ghost"
          onClick={() => {
            void loadProductions();
          }}
        >
          {copy.refresh}
        </button>
      }
    >
      <div className="module-summary-bar">
        <span>{copy.production.totalMine}</span>
        <strong>{myProductions.length}</strong>
        {canSeeAllProductions ? (
          <>
            <span>{copy.production.totalAll}</span>
            <strong>{allProductions.length}</strong>
          </>
        ) : null}
      </div>

      <section className="module-grid">
        <article className="module-panel">
          <h2>{copy.production.newEntry}</h2>
          <form className="module-form" onSubmit={handleSubmit}>
            <label>
              {copy.production.productionDate}
              <input
                type="date"
                value={form.productionDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    productionDate: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              {copy.production.shiftId}
              <input
                type="number"
                min={1}
                value={form.shiftId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, shiftId: event.target.value }))
                }
              />
            </label>

            <label>
              {copy.production.machineId}
              <input
                type="number"
                min={1}
                value={form.machineId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    machineId: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              {copy.production.cartons}
              <input
                type="number"
                min={0}
                value={form.cartons}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cartons: event.target.value }))
                }
              />
            </label>

            <label>
              {copy.production.notes}
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </label>

            <button type="submit" className="auth-button">
              {copy.production.saveProduction}
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
          <h2>{copy.production.myRecords}</h2>
          {loading ? <p>{copy.production.loading}</p> : null}
          <div className="module-list">
            {myProductions.map((production) => (
              <div className="module-row" key={production.id}>
                <strong>{production.productionDate ?? production.date}</strong>
                <span>
                  Shift {production.shiftId ?? "-"} • Machine{" "}
                  {production.machineId ?? "-"}
                </span>
                <small>
                  {production.status} •{" "}
                  {production.producedCartons ?? production.totalCartons ?? 0}{" "}
                  cartons
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canSeeAllProductions ? (
        <section className="module-panel module-panel--full">
          <h2>{copy.production.allRecords}</h2>
          <div className="module-list">
            {allProductions.map((production) => (
              <div className="module-row" key={production.id}>
                <strong>{production.productionDate ?? production.date}</strong>
                <span>
                  Shift {production.shiftId ?? "-"} • Machine{" "}
                  {production.machineId ?? "-"}
                </span>
                <small>
                  {production.status} •{" "}
                  {production.producedCartons ?? production.totalCartons ?? 0}{" "}
                  cartons
                </small>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </ModulePageShell>
  );
}
