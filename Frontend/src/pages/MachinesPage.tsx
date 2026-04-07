import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "../components/LocaleSwitch";
import { DateTimeBadge } from "../components/DateTimeBadge";
import { appCopy } from "../content/appCopy";
import { API_BASE_URL, readApiError } from "../lib/api";

type Machine = {
  id: number;
  name: string;
  type: string;
  status: string;
  createdAt: string;
};

const tokenKey = "plasticon_token";

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem(tokenKey);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function MachinesPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = appCopy[locale];

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null);
  const [newMachineForm, setNewMachineForm] = useState<{
    name: string;
    type: string;
  }>({
    name: "",
    type: "",
  });
  const [machineForm, setMachineForm] = useState<{
    name: string;
    type: string;
    status: string;
  }>({
    name: "",
    type: "",
    status: "OPERATIONAL",
  });

  const machineStatuses = [
    "OPERATIONAL",
    "UNDER_MAINTENANCE",
    "BROKEN",
    "OFFLINE",
    "DECOMMISSIONED",
  ];

  const pageText = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "الماكينات",
            loading: "جارٍ تحميل الماكينات...",
            noData: "لا توجد ماكينات",
          }
        : {
            title: "Machines",
            loading: "Loading machines...",
            noData: "No machines available",
          },
    [locale],
  );

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/machines");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setMachines((await response.json()) as Machine[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : pageText.loading,
      );
    } finally {
      setLoading(false);
    }
  }, [pageText.loading]);

  useEffect(() => {
    void loadMachines();
  }, [loadMachines]);

  const startEditMachine = (machine: Machine) => {
    setEditingMachineId(machine.id);
    setMachineForm({
      name: machine.name,
      type: machine.type,
      status: machine.status,
    });
  };

  const cancelEditMachine = () => {
    setEditingMachineId(null);
    setMachineForm({
      name: "",
      type: "",
      status: "OPERATIONAL",
    });
  };

  const createMachine = async () => {
    const trimmedName = newMachineForm.name.trim();
    const trimmedType = newMachineForm.type.trim();
    if (!trimmedName || !trimmedType) {
      window.alert(
        locale === "ar" ? "الاسم والنوع مطلوبان" : "Name and type are required",
      );
      return;
    }

    try {
      setCreating(true);
      const response = await fetchWithAdminAuth("/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, type: trimmedType }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await loadMachines();
      setNewMachineForm({ name: "", type: "" });
    } catch (createError) {
      window.alert(
        createError instanceof Error
          ? createError.message
          : "Failed to create machine",
      );
    } finally {
      setCreating(false);
    }
  };

  const saveMachineEdit = async (id: number) => {
    try {
      const response = await fetchWithAdminAuth(`/machines/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(machineForm),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const updated = (await response.json()) as {
        id: number;
        name: string;
        type: string;
        status: string;
      };

      setMachines((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                name: updated.name,
                type: updated.type,
                status: updated.status,
              }
            : item,
        ),
      );
      cancelEditMachine();
    } catch (saveError) {
      window.alert(
        saveError instanceof Error ? saveError.message : "Failed to update",
      );
    }
  };

  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{pageText.title}</h1>
          </div>
          <div className="admin-header__actions">
            <DateTimeBadge />
            <LocaleSwitch />
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/dashboard")}
            >
              {copy.backToDashboard}
            </button>
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => navigate("/admin")}
            >
              {locale === "ar" ? "لوحة الإدارة" : "Admin"}
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              {copy.signOut}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2>{pageText.title}</h2>
            <button
              type="button"
              className="auth-button"
              onClick={() => void loadMachines()}
            >
              {copy.refresh}
            </button>
          </div>

          {loading ? <p>{pageText.loading}</p> : null}
          {error ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}
          <div className="admin-panel" style={{ marginBottom: "16px" }}>
            <h3>{copy.admin.addNewMachine}</h3>
            <div className="admin-form-grid">
              <label>
                {copy.admin.name}
                <input
                  value={newMachineForm.name}
                  onChange={(event) =>
                    setNewMachineForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {copy.admin.machineType}
                <input
                  value={newMachineForm.type}
                  onChange={(event) =>
                    setNewMachineForm((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="auth-button"
              disabled={creating}
              onClick={() => void createMachine()}
            >
              {creating ? copy.load : copy.admin.addNewMachine}
            </button>
          </div>
          {!loading && machines.length === 0 ? (
            <p className="admin-muted">{pageText.noData}</p>
          ) : null}

          {machines.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{copy.admin.id}</th>
                    <th>{copy.admin.name}</th>
                    <th>{copy.admin.machineType}</th>
                    <th>{copy.admin.machineStatus}</th>
                    <th>{copy.admin.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        {editingMachineId === item.id ? (
                          <input
                            value={machineForm.name}
                            onChange={(event) =>
                              setMachineForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td>
                        {editingMachineId === item.id ? (
                          <input
                            value={machineForm.type}
                            onChange={(event) =>
                              setMachineForm((prev) => ({
                                ...prev,
                                type: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          item.type
                        )}
                      </td>
                      <td>
                        {editingMachineId === item.id ? (
                          <select
                            value={machineForm.status}
                            onChange={(event) =>
                              setMachineForm((prev) => ({
                                ...prev,
                                status: event.target.value,
                              }))
                            }
                          >
                            {machineStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.status
                        )}
                      </td>
                      <td>
                        {editingMachineId === item.id ? (
                          <>
                            <button
                              type="button"
                              className="auth-button"
                              onClick={() => void saveMachineEdit(item.id)}
                            >
                              {copy.save}
                            </button>
                            <button
                              type="button"
                              className="auth-button auth-button--ghost"
                              onClick={cancelEditMachine}
                            >
                              {copy.admin.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="auth-button"
                            onClick={() => startEditMachine(item)}
                          >
                            {copy.admin.edit}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
