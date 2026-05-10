import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { appCopy } from "../../content/appCopy";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { toast } from "../../lib/toast";

/* ─── Material options ─────────────────────────────────────── */
const ALL_MATERIALS = ["HDPE", "LDPE", "PET", "COLOR", "ADHESIVE", "EMPTY_BAGS"] as const;
type Material = (typeof ALL_MATERIALS)[number];

const MATERIAL_LABELS: Record<Material, string> = {
  HDPE: "HDPE",
  LDPE: "LDPE",
  PET: "PET",
  COLOR: "Color (Masterbatch)",
  ADHESIVE: "Adhesive",
  EMPTY_BAGS: "Empty Bags",
};

const MATERIAL_COLORS: Record<Material, string> = {
  HDPE: "#3b82f6",
  LDPE: "#06b6d4",
  PET: "#10b981",
  COLOR: "#f97316",
  ADHESIVE: "#8b5cf6",
  EMPTY_BAGS: "#64748b",
};

/* ─── Encode / decode type field ───────────────────────────── */
// type field format: "CAPS" or "CAPS:HDPE,LDPE,COLOR"
function encodeMachineType(typeName: string, materials: string[]): string {
  const name = typeName.trim();
  if (materials.length === 0) return name;
  return `${name}:${materials.join(",")}`;
}

function decodeMachineType(raw: string): { typeName: string; materials: string[] } {
  const idx = raw.indexOf(":");
  if (idx === -1) return { typeName: raw, materials: [] };
  return {
    typeName: raw.slice(0, idx),
    materials: raw
      .slice(idx + 1)
      .split(",")
      .filter(Boolean),
  };
}

function defaultMaterials(typeName: string): string[] {
  const t = typeName.toUpperCase();
  if (t.includes("PREFORM") || t.includes("PET")) return ["PET", "COLOR"];
  if (t.includes("CAP")) return ["HDPE", "LDPE", "COLOR"];
  return [];
}

/* ─── Types ─────────────────────────────────────────────────── */
type Machine = {
  id: number;
  name: string;
  type: string; // raw encoded value
  status: string;
  createdAt: string;
};

type MachineFormState = {
  name: string;
  typeName: string;
  materials: string[];
  status: string;
};

async function fetchWithAdminAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

export function MachinesPage() {
  const { locale } = useLocale();
  const copy = appCopy[locale];
  const isAr = locale === "ar";

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newForm, setNewForm] = useState<MachineFormState>({
    name: "",
    typeName: "",
    materials: [],
    status: "OPERATIONAL",
  });
  const [editForm, setEditForm] = useState<MachineFormState>({
    name: "",
    typeName: "",
    materials: [],
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
      isAr
        ? { title: "الماكينات", loading: "جارٍ تحميل...", noData: "لا توجد ماكينات" }
        : { title: "Machines", loading: "Loading machines...", noData: "No machines available" },
    [isAr],
  );

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAdminAuth("/machines");
      if (!response.ok) throw new Error(await readApiError(response));
      setMachines((await response.json()) as Machine[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : pageText.loading);
    } finally {
      setLoading(false);
    }
  }, [pageText.loading]);

  useEffect(() => { void loadMachines(); }, [loadMachines]);

  /* ── Toggle material in a list ─────────────────────────── */
  function toggleMaterial(list: string[], mat: string): string[] {
    return list.includes(mat) ? list.filter((m) => m !== mat) : [...list, mat];
  }

  /* ── Edit ────────────────────────────────────────────────── */
  const startEdit = (machine: Machine) => {
    const { typeName, materials } = decodeMachineType(machine.type);
    setEditingMachineId(machine.id);
    setEditForm({
      name: machine.name,
      typeName,
      materials: materials.length ? materials : defaultMaterials(typeName),
      status: machine.status,
    });
  };

  const cancelEdit = () => {
    setEditingMachineId(null);
    setEditForm({ name: "", typeName: "", materials: [], status: "OPERATIONAL" });
  };

  /* ── Create ──────────────────────────────────────────────── */
  const createMachine = async () => {
    const name = newForm.name.trim();
    const typeName = newForm.typeName.trim();
    if (!name || !typeName) {
      toast.warning(isAr ? "الاسم والنوع مطلوبان" : "Name and type are required");
      return;
    }
    const mats = newForm.materials.length ? newForm.materials : defaultMaterials(typeName);
    try {
      setCreating(true);
      const response = await fetchWithAdminAuth("/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: encodeMachineType(typeName, mats) }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await loadMachines();
      setNewForm({ name: "", typeName: "", materials: [], status: "OPERATIONAL" });
      toast.success(isAr ? "تمت إضافة الماكينة" : "Machine added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create machine");
    } finally {
      setCreating(false);
    }
  };

  /* ── Save edit ───────────────────────────────────────────── */
  const saveEdit = async (id: number) => {
    const name = editForm.name.trim();
    const typeName = editForm.typeName.trim();
    if (!name || !typeName) {
      toast.warning(isAr ? "الاسم والنوع مطلوبان" : "Name and type are required");
      return;
    }
    const mats = editForm.materials.length ? editForm.materials : defaultMaterials(typeName);
    try {
      const response = await fetchWithAdminAuth(`/machines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: encodeMachineType(typeName, mats),
          status: editForm.status,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const updated = (await response.json()) as Machine;
      setMachines((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      );
      cancelEdit();
      toast.success(isAr ? "تم تحديث الماكينة" : "Machine updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const deleteMachine = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetchWithAdminAuth(`/machines/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response));
      setMachines((prev) => prev.filter((m) => m.id !== id));
      setConfirmDeleteId(null);
      toast.success(isAr ? "تم حذف الماكينة" : "Machine deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete machine");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Material checkboxes (reusable) ──────────────────────── */
  const MaterialCheckboxes = ({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (next: string[]) => void;
  }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem", marginTop: ".35rem" }}>
      {ALL_MATERIALS.map((mat) => {
        const active = selected.includes(mat);
        return (
          <button
            key={mat}
            type="button"
            onClick={() => onChange(toggleMaterial(selected, mat))}
            style={{
              padding: ".25rem .6rem",
              borderRadius: "999px",
              border: `1.5px solid ${active ? MATERIAL_COLORS[mat] : "var(--border-default)"}`,
              background: active ? `${MATERIAL_COLORS[mat]}18` : "var(--bg-surface)",
              color: active ? MATERIAL_COLORS[mat] : "var(--text-secondary)",
              fontSize: ".75rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {active ? "✓ " : ""}{MATERIAL_LABELS[mat]}
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="admin-shell" dir={isAr ? "rtl" : "ltr"}>
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1>{pageText.title}</h1>
          </div>
          <div className="admin-header__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => void loadMachines()}>
              {copy.refresh}
            </button>
          </div>
        </header>

        <section className="admin-section">
          {loading && <p>{pageText.loading}</p>}
          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          {/* ── Add new machine ────────────────────────────── */}
          <div className="admin-panel" style={{ marginBottom: 16 }}>
            <h3>{copy.admin.addNewMachine}</h3>
            <div className="admin-panel-body" style={{ display: "grid", gap: ".875rem" }}>
              <div className="admin-form-grid">
                <label>
                  {copy.admin.name}
                  <input
                    value={newForm.name}
                    placeholder={isAr ? "مثال: ماكينة A" : "e.g. Machine A"}
                    onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                <label>
                  {copy.admin.machineType}
                  <input
                    value={newForm.typeName}
                    placeholder={isAr ? "مثال: CAPS أو PREFORM" : "e.g. CAPS or PREFORM"}
                    onChange={(e) => {
                      const typeName = e.target.value;
                      setNewForm((p) => ({
                        ...p,
                        typeName,
                        // auto-fill materials when type name is recognised
                        materials: p.materials.length === 0 ? defaultMaterials(typeName) : p.materials,
                      }));
                    }}
                  />
                </label>
              </div>

              {/* Material selector */}
              <div>
                <span style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {isAr ? "المواد الخام المستخدمة (اختر ما ينطبق)" : "Raw Materials Used (select all that apply)"}
                </span>
                <MaterialCheckboxes
                  selected={newForm.materials}
                  onChange={(m) => setNewForm((p) => ({ ...p, materials: m }))}
                />
                {newForm.materials.length === 0 && newForm.typeName && (
                  <p style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginTop: ".3rem" }}>
                    {isAr ? "سيتم استخدام المواد الافتراضية بناءً على نوع الماكينة" : "Default materials will be used based on machine type"}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={creating}
                  onClick={() => void createMachine()}
                >
                  {creating ? copy.load : copy.admin.addNewMachine}
                </button>
              </div>
            </div>
          </div>

          {!loading && machines.length === 0 && (
            <p className="admin-muted">{pageText.noData}</p>
          )}

          {/* ── Machines table ─────────────────────────────── */}
          {machines.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{copy.admin.id}</th>
                    <th>{copy.admin.name}</th>
                    <th>{copy.admin.machineType}</th>
                    <th>{isAr ? "المواد" : "Materials"}</th>
                    <th>{copy.admin.machineStatus}</th>
                    <th>{isAr ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((item) => {
                    const { typeName, materials } = decodeMachineType(item.type);
                    const displayMats = materials.length ? materials : defaultMaterials(typeName);
                    const isEditing = editingMachineId === item.id;

                    return (
                      <tr key={item.id}>
                        <td>{item.id}</td>

                        {/* Name */}
                        <td>
                          {isEditing ? (
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              style={{ minWidth: 120 }}
                            />
                          ) : (
                            item.name
                          )}
                        </td>

                        {/* Type */}
                        <td>
                          {isEditing ? (
                            <input
                              value={editForm.typeName}
                              onChange={(e) => setEditForm((p) => ({ ...p, typeName: e.target.value }))}
                              style={{ minWidth: 100 }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{typeName}</span>
                          )}
                        </td>

                        {/* Materials */}
                        <td>
                          {isEditing ? (
                            <MaterialCheckboxes
                              selected={editForm.materials}
                              onChange={(m) => setEditForm((p) => ({ ...p, materials: m }))}
                            />
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                              {displayMats.map((mat) => (
                                <span
                                  key={mat}
                                  style={{
                                    padding: ".15rem .45rem",
                                    borderRadius: "999px",
                                    fontSize: ".72rem",
                                    fontWeight: 700,
                                    background: `${MATERIAL_COLORS[mat as Material] ?? "#64748b"}18`,
                                    color: MATERIAL_COLORS[mat as Material] ?? "#64748b",
                                    border: `1px solid ${MATERIAL_COLORS[mat as Material] ?? "#64748b"}44`,
                                  }}
                                >
                                  {mat}
                                </span>
                              ))}
                              {displayMats.length === 0 && (
                                <span style={{ color: "var(--text-secondary)", fontSize: ".78rem" }}>—</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          {isEditing ? (
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                            >
                              {machineStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            item.status
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: ".375rem", flexWrap: "wrap" }}>
                              <button type="button" className="btn btn--success btn--sm" onClick={() => void saveEdit(item.id)}>
                                {copy.save}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit}>
                                {copy.admin.cancel}
                              </button>
                            </div>
                          ) : confirmDeleteId === item.id ? (
                            <div style={{ display: "flex", gap: ".375rem", alignItems: "center" }}>
                              <span style={{ fontSize: ".78rem", color: "#ef4444", fontWeight: 600 }}>
                                {isAr ? "تأكيد الحذف؟" : "Delete?"}
                              </span>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: "#ef4444", color: "#fff", border: "none" }}
                                disabled={deletingId === item.id}
                                onClick={() => void deleteMachine(item.id)}
                              >
                                {deletingId === item.id ? "..." : (isAr ? "نعم" : "Yes")}
                              </button>
                              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDeleteId(null)}>
                                {isAr ? "لا" : "No"}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: ".375rem", flexWrap: "wrap" }}>
                              <button type="button" className="btn btn--outline btn--sm" onClick={() => startEdit(item)}>
                                {copy.admin.edit}
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)" }}
                                onClick={() => setConfirmDeleteId(item.id)}
                              >
                                {isAr ? "حذف" : "Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
