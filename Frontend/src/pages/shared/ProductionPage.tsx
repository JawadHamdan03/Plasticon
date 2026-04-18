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
import { ModulePageShell } from "../../components/ModulePageShell";
import { TruckLoader } from "../../components/TruckLoader";
import { Card } from "../../components/ui/card";

type ProductionItem = {
  id: number;
  hourSlot?: string | null;
  shiftId?: number | null;
  machineId?: number | null;
  cartonsCount?: number | null;
  totalPieces?: number | null;
  rawHdpeUsed?: number | null;
  rawLdpeUsed?: number | null;
  rawPetUsed?: number | null;
  adhesiveUsed?: number | null;
  emptyBagsUsed?: number | null;
  colorUsed?: number | null;
  notes?: string | null;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  machine?: {
    id: number;
    name: string;
    type?: string | null;
  };
  shift?: {
    id: number;
    name: string;
  };
};

type ProductionCreateResponse = ProductionItem;

type AdminOverviewResponse = {
  totals: {
    records: number;
    cartons: number;
    pieces: number;
  };
  byShiftProduct?: Array<{
    date: string;
    shiftId: number | null;
    shiftName: string;
    capsCartons: number;
    preformCartons: number;
    totalCartons: number;
    totalPieces: number;
  }>;
  dailyByProduct?: Array<{
    date: string;
    capsCartons: number;
    preformCartons: number;
    totalCartons: number;
    totalPieces: number;
  }>;
  dailyRawMaterialUsage?: Array<{
    date: string;
    hdpe: number;
    ldpe: number;
    pet: number;
    adhesive: number;
    emptyBags: number;
    color: number;
    totalRawUsed: number;
  }>;
};

type AdminRawDeductionsResponse = {
  range?: {
    fromDate?: string;
    toDate?: string;
  };
  daily: Array<{
    date: string;
    hdpe: number;
    ldpe: number;
    pet: number;
    adhesive: number;
    emptyBags: number;
    color: number;
    other: number;
    totalRawUsed: number;
  }>;
  totals: {
    hdpe: number;
    ldpe: number;
    pet: number;
    adhesive: number;
    emptyBags: number;
    color: number;
    other: number;
    totalRawUsed: number;
  };
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers ?? {}),
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
  const [adminOverview, setAdminOverview] =
    useState<AdminOverviewResponse | null>(null);
  const [adminRawDeductions, setAdminRawDeductions] =
    useState<AdminRawDeductionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [adminFromDate, setAdminFromDate] = useState("");
  const [adminToDate, setAdminToDate] = useState("");

  const [form, setForm] = useState({
    shiftId: "",
    machineId: "",
    cartonsCount: "",
    rawHdpeUsed: "",
    rawLdpeUsed: "",
    rawPetUsed: "",
    adhesiveUsed: "",
    emptyBagsUsed: "",
    colorUsed: "",
    notes: "",
  });

  const canSeeAllProductions = useMemo(
    () => user?.role === "ADMIN" || user?.role === "ACCOUNTANT",
    [user?.role],
  );
  const canCreateProduction = useMemo(
    () => user?.role === "WORKER",
    [user?.role],
  );
  const isAdmin = useMemo(() => user?.role === "ADMIN", [user?.role]);

  const loadProductions = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [mineResponse, allResponse] = await Promise.all([
        fetchWithAuth("/production/me"),
        canSeeAllProductions
          ? fetchWithAuth("/production/all")
          : Promise.resolve(null),
      ]);

      if (isAdmin) {
        const query = new URLSearchParams();
        if (adminFromDate) {
          query.set("fromDate", adminFromDate);
        }
        if (adminToDate) {
          query.set("toDate", adminToDate);
        }
        const queryString = query.toString();

        const adminResponse = await fetchWithAuth(
          `/production/admin/overview${queryString ? `?${queryString}` : ""}`,
        );
        if (!adminResponse.ok) {
          throw new Error(await readApiError(adminResponse));
        }
        setAdminOverview((await adminResponse.json()) as AdminOverviewResponse);

        const deductionsResponse = await fetchWithAuth(
          `/production/admin/raw-deductions-daily${
            queryString ? `?${queryString}` : ""
          }`,
        );
        if (!deductionsResponse.ok) {
          throw new Error(await readApiError(deductionsResponse));
        }
        setAdminRawDeductions(
          (await deductionsResponse.json()) as AdminRawDeductionsResponse,
        );
      } else {
        setAdminOverview(null);
        setAdminRawDeductions(null);
      }

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
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load production data",
      );
    } finally {
      setLoading(false);
    }
  }, [adminFromDate, adminToDate, canSeeAllProductions, isAdmin]);

  useEffect(() => {
    void loadProductions();
  }, [loadProductions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        shiftId: form.shiftId ? Number(form.shiftId) : undefined,
        machineId: form.machineId ? Number(form.machineId) : undefined,
        cartonsCount: form.cartonsCount ? Number(form.cartonsCount) : undefined,
        rawHdpeUsed: form.rawHdpeUsed ? Number(form.rawHdpeUsed) : undefined,
        rawLdpeUsed: form.rawLdpeUsed ? Number(form.rawLdpeUsed) : undefined,
        rawPetUsed: form.rawPetUsed ? Number(form.rawPetUsed) : undefined,
        adhesiveUsed: form.adhesiveUsed ? Number(form.adhesiveUsed) : undefined,
        emptyBagsUsed: form.emptyBagsUsed
          ? Number(form.emptyBagsUsed)
          : undefined,
        colorUsed: form.colorUsed ? Number(form.colorUsed) : undefined,
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

      const data = (await response.json()) as ProductionCreateResponse;
      setSuccessMessage(`Production record #${data.id} saved successfully.`);
      setForm((prev) => ({
        ...prev,
        shiftId: "",
        machineId: "",
        cartonsCount: "",
        rawHdpeUsed: "",
        rawLdpeUsed: "",
        rawPetUsed: "",
        adhesiveUsed: "",
        emptyBagsUsed: "",
        colorUsed: "",
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

      {/* PREFORM / CAPS KPI boxes */}
      {canSeeAllProductions && adminOverview ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4">
          <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-slate-500 mb-1">Total Cartons</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{adminOverview.totals.cartons.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
            <p className="text-xs text-slate-500 mb-1">Caps Cartons</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {(adminOverview.dailyByProduct ?? []).reduce((s, d) => s + d.capsCartons, 0).toLocaleString()}
            </p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-slate-500 mb-1">Preform Cartons</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {(adminOverview.dailyByProduct ?? []).reduce((s, d) => s + d.preformCartons, 0).toLocaleString()}
            </p>
          </Card>
          <Card className="p-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-slate-500 mb-1">Total Pieces</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{adminOverview.totals.pieces.toLocaleString()}</p>
          </Card>
        </div>
      ) : null}

      <section className="module-grid">
        {canCreateProduction ? (
          <article className="module-panel">
            <h2>{copy.production.newEntry}</h2>
            <form className="module-form" onSubmit={handleSubmit}>
              <label>
                {copy.production.shiftId}
                <input
                  type="number"
                  min={1}
                  value={form.shiftId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      shiftId: event.target.value,
                    }))
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
                  value={form.cartonsCount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      cartonsCount: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                HDPE Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rawHdpeUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rawHdpeUsed: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                LDPE Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rawLdpeUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rawLdpeUsed: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                PET Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rawPetUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rawPetUsed: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Adhesive Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.adhesiveUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      adhesiveUsed: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Empty Bags Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.emptyBagsUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      emptyBagsUsed: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Color Used
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.colorUsed}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      colorUsed: event.target.value,
                    }))
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
        ) : null}

        <article className="module-panel">
          <h2>{copy.production.myRecords}</h2>
          {loading ? <TruckLoader /> : null}

          {/* Preform / Caps count boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "linear-gradient(to bottom right, #f0fdf4, #dcfce7)", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Caps Cartons (Mine)</p>
              <p style={{ fontSize: "22px", fontWeight: "bold", color: "#15803d" }}>
                {myProductions.reduce((s, p) => s + (p.cartonsCount ?? 0), 0)}
              </p>
            </div>
            <div style={{ background: "linear-gradient(to bottom right, #faf5ff, #f3e8ff)", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Total Pieces (Mine)</p>
              <p style={{ fontSize: "22px", fontWeight: "bold", color: "#7e22ce" }}>
                {myProductions.reduce((s, p) => s + (p.totalPieces ?? 0), 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="module-list">
            {myProductions.map((production) => (
              <div className="module-row" key={production.id}>
                <strong>
                  {new Date(production.createdAt).toLocaleString()}
                </strong>
                <span>
                  Shift {production.shift?.name ?? production.shiftId ?? "-"} •
                  Machine{" "}
                  {production.machine?.name ?? production.machineId ?? "-"}
                </span>
                <small>
                  {production.cartonsCount ?? 0} cartons •{" "}
                  {production.totalPieces ?? 0} pieces
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canSeeAllProductions ? (
        <section className="module-panel module-panel--full">
          <h2>{copy.production.allRecords}</h2>
          {loading ? <TruckLoader /> : null}
          <div className="module-list">
            {allProductions.map((production) => (
              <div className="module-row" key={production.id}>
                <strong>
                  {new Date(production.createdAt).toLocaleString()}
                </strong>
                <span>
                  Shift {production.shift?.name ?? production.shiftId ?? "-"} •
                  Machine{" "}
                  {production.machine?.name ?? production.machineId ?? "-"}
                </span>
                <small>
                  {production.cartonsCount ?? 0} cartons •{" "}
                  {production.totalPieces ?? 0}
                  pieces
                </small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isAdmin && adminOverview ? (
        <section className="module-grid">
          <article className="module-panel module-panel--full">
            <h2>Admin Date Filters</h2>
            <div className="module-form">
              <label>
                From Date
                <input
                  type="date"
                  value={adminFromDate}
                  onChange={(event) => setAdminFromDate(event.target.value)}
                />
              </label>
              <label>
                To Date
                <input
                  type="date"
                  value={adminToDate}
                  onChange={(event) => setAdminToDate(event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="module-panel">
            <h2>Shift Production (Caps vs Preform)</h2>
            {loading ? <TruckLoader /> : null}
            <div className="module-list">
              {(adminOverview.byShiftProduct ?? []).slice(0, 20).map((row) => (
                <div
                  className="module-row"
                  key={`${row.date}-${row.shiftId ?? "x"}`}
                >
                  <strong>
                    {row.date} • {row.shiftName}
                  </strong>
                  <span>
                    Caps: {row.capsCartons} cartons • Preform:{" "}
                    {row.preformCartons} cartons
                  </span>
                  <small>
                    Total: {row.totalCartons} cartons • {row.totalPieces} pieces
                  </small>
                </div>
              ))}
            </div>
          </article>

          <article className="module-panel">
            <h2>Daily Totals (End of Day)</h2>
            {loading ? <TruckLoader /> : null}
            <div className="module-list">
              {(adminOverview.dailyByProduct ?? []).slice(0, 20).map((row) => (
                <div className="module-row" key={row.date}>
                  <strong>{row.date}</strong>
                  <span>
                    Caps: {row.capsCartons} cartons • Preform:{" "}
                    {row.preformCartons} cartons
                  </span>
                  <small>
                    Total: {row.totalCartons} cartons • {row.totalPieces} pieces
                  </small>
                </div>
              ))}
            </div>
          </article>

          <article className="module-panel module-panel--full">
            <h2>Daily Raw Material Deductions</h2>
            {loading ? <TruckLoader /> : null}
            <div className="module-list">
              {(adminOverview.dailyRawMaterialUsage ?? [])
                .slice(0, 20)
                .map((row) => (
                  <div className="module-row" key={row.date}>
                    <strong>{row.date}</strong>
                    <span>
                      HDPE {row.hdpe} • LDPE {row.ldpe} • PET {row.pet} •
                      Adhesive {row.adhesive}
                    </span>
                    <small>
                      Empty Bags {row.emptyBags} • Color {row.color} • Total{" "}
                      {row.totalRawUsed}
                    </small>
                  </div>
                ))}
            </div>
          </article>

          <article className="module-panel module-panel--full">
            <h2>Daily Raw Deductions (From Inventory Transactions)</h2>
            {loading ? <TruckLoader /> : null}
            <div className="module-list">
              {(adminRawDeductions?.daily ?? []).slice(0, 20).map((row) => (
                <div className="module-row" key={row.date}>
                  <strong>{row.date}</strong>
                  <span>
                    HDPE {row.hdpe} • LDPE {row.ldpe} • PET {row.pet} • Adhesive{" "}
                    {row.adhesive}
                  </span>
                  <small>
                    Empty Bags {row.emptyBags} • Color {row.color} • Other{" "}
                    {row.other} • Total {row.totalRawUsed}
                  </small>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </ModulePageShell>
  );
}
