import {
  useState,
  useCallback,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from "react";
import {
  Plus,
  Trash2,
  Send,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Eye,
  Image,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

/* ── Types ─────────────────────────────────────────────────── */
type InventoryItem = {
  id: number;
  partName: string;
  quantity: number;
  imagePath: string | null;
  unitPrice: number | null;
  pricedBy: { id: number; fullName: string } | null;
  pricedAt: string | null;
};

type Inventory = {
  id: number;
  month: number;
  year: number;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED";
  notes: string | null;
  submittedAt: string | null;
  items: InventoryItem[];
};

/* ── helpers ─────────────────────────────────────────────── */
async function api<T>(
  method: string,
  path: string,
  body?: object | FormData,
): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((json as any).message ?? "Error");
  return json;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function statusBadge(status: Inventory["status"]) {
  const map = {
    DRAFT: { label: "Draft", cls: "badge badge--gray" },
    SUBMITTED: { label: "Submitted", cls: "badge badge--orange" },
    REVIEWED: { label: "Reviewed", cls: "badge badge--green" },
  };
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}

/* ── Component ─────────────────────────────────────────────── */
export function EngineerInventoryPage() {
  const { user } = useAuth();

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* new report form */
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  /* expanded inventory */
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* add item form */
  const [addingItemToId, setAddingItemToId] = useState<number | null>(null);
  const [newPart, setNewPart] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  const [submitting, setSubmitting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<Inventory[]>("GET", "/engineer-inventory/mine");
      setInventories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Create new inventory */
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api("POST", "/engineer-inventory", {
        month: newMonth,
        year: newYear,
        notes: newNotes.trim() || undefined,
      });
      setShowNewForm(false);
      setNewNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creating report");
    } finally {
      setCreating(false);
    }
  };

  /* Add item */
  const handleAddItem = async (inventoryId: number) => {
    setAddItemError("");
    const qty = Number(newPart && newQty);
    if (!newPart.trim()) {
      setAddItemError("Part name is required");
      return;
    }
    if (!newQty || Number(newQty) < 1) {
      setAddItemError("Quantity must be at least 1");
      return;
    }

    setAddingItem(true);
    try {
      const form = new FormData();
      form.append("partName", newPart.trim());
      form.append("quantity", String(Number(newQty)));
      if (newImage) form.append("image", newImage);

      await api("POST", `/engineer-inventory/${inventoryId}/items`, form);
      setNewPart("");
      setNewQty("");
      setNewImage(null);
      setAddingItemToId(null);
      await load();
    } catch (e) {
      setAddItemError(e instanceof Error ? e.message : "Error adding item");
    } finally {
      setAddingItem(false);
    }
  };

  /* Delete item */
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Delete this part?")) return;
    setDeleting(itemId);
    try {
      await api("DELETE", `/engineer-inventory/items/${itemId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error deleting item");
    } finally {
      setDeleting(null);
    }
  };

  /* Submit inventory */
  const handleSubmit = async (inventoryId: number) => {
    const inv = inventories.find((i) => i.id === inventoryId);
    if (!inv || inv.items.length === 0) {
      setError("Add at least one part before submitting");
      return;
    }
    if (
      !confirm(
        `Submit this inventory for ${MONTHS[inv.month - 1]} ${inv.year}? This cannot be undone.`,
      )
    )
      return;
    setSubmitting(inventoryId);
    try {
      await api("PATCH", `/engineer-inventory/${inventoryId}/submit`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error submitting");
    } finally {
      setSubmitting(null);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Parts Inventory</h1>
          <p className="page-header__sub">
            Submit monthly shortage reports — admin & accountant will be
            notified
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setShowNewForm((v) => !v)}
        >
          <Plus size={16} /> New Report
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="auth-alert auth-alert--error"
          style={{ display: "flex", alignItems: "center", gap: ".5rem" }}
        >
          <AlertCircle size={16} /> {error}
          <button
            type="button"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* New report form */}
      {showNewForm && (
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              New Inventory Report
            </h2>
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => setShowNewForm(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="card-body">
            <form
              onSubmit={handleCreate}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label">Month *</label>
                  <select
                    className="form-input form-select"
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                    required
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year *</label>
                  <select
                    className="form-input form-select"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    required
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Any additional notes about this inventory period..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: ".75rem" }}>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create Report"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <p className="empty-state__desc">Loading your inventory reports…</p>
        </div>
      ) : inventories.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "3rem" }}>
            <div className="empty-state__icon">
              <Package size={28} />
            </div>
            <h3 className="empty-state__title">No inventory reports yet</h3>
            <p className="empty-state__desc">
              Create your first monthly parts shortage report.
            </p>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setShowNewForm(true)}
            >
              <Plus size={14} /> Create Report
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {inventories.map((inv) => {
            const isExpanded = expandedId === inv.id;
            const canEdit = inv.status === "DRAFT";

            return (
              <div key={inv.id} className="card">
                {/* Inventory header row */}
                <div
                  className="card-header"
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".75rem",
                    }}
                  >
                    <Package size={18} style={{ color: "var(--blue-700)" }} />
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: ".95rem",
                        }}
                      >
                        {MONTHS[inv.month - 1]} {inv.year}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: ".75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {inv.items.length} parts listed
                        {inv.notes ? ` · ${inv.notes}` : ""}
                      </p>
                    </div>
                    {statusBadge(inv.status)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                    }}
                  >
                    {canEdit && (
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSubmit(inv.id);
                        }}
                        disabled={submitting === inv.id}
                      >
                        <Send size={13} />
                        {submitting === inv.id ? "Submitting…" : "Submit"}
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp
                        size={18}
                        style={{ color: "var(--text-secondary)" }}
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        style={{ color: "var(--text-secondary)" }}
                      />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="card-body">
                    {inv.submittedAt && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ".5rem",
                          marginBottom: "1rem",
                          fontSize: ".8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <CheckCircle
                          size={14}
                          style={{ color: "var(--green-600)" }}
                        />
                        Submitted on{" "}
                        {new Date(inv.submittedAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Items table */}
                    {inv.items.length > 0 ? (
                      <div
                        className="table-wrapper"
                        style={{ marginBottom: "1rem" }}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Part Name</th>
                              <th>Qty Needed</th>
                              <th>Photo</th>
                              <th>Unit Price</th>
                              <th>Priced By</th>
                              {canEdit && <th>Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items.map((item, idx) => (
                              <tr key={item.id}>
                                <td
                                  style={{
                                    color: "var(--text-secondary)",
                                    fontSize: ".8rem",
                                  }}
                                >
                                  {idx + 1}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {item.partName}
                                </td>
                                <td>
                                  <span className="badge badge--blue">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td>
                                  {item.imagePath ? (
                                    <a
                                      href={`${API_BASE_URL.replace("/api", "")}/${item.imagePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn--ghost btn--icon"
                                      title="View photo"
                                    >
                                      <Image size={15} />
                                    </a>
                                  ) : (
                                    <span
                                      style={{
                                        color: "var(--gray-300)",
                                        fontSize: ".75rem",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {item.unitPrice !== null ? (
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: "var(--green-600)",
                                      }}
                                    >
                                      ${item.unitPrice.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="badge badge--gray">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    fontSize: ".78rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {item.pricedBy?.fullName ?? "—"}
                                </td>
                                {canEdit && (
                                  <td>
                                    <button
                                      className="btn btn--danger btn--icon"
                                      onClick={() =>
                                        void handleDeleteItem(item.id)
                                      }
                                      disabled={deleting === item.id}
                                      title="Delete part"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        className="empty-state"
                        style={{ padding: "1.5rem", marginBottom: "1rem" }}
                      >
                        <Package
                          size={24}
                          style={{ color: "var(--gray-300)" }}
                        />
                        <p className="empty-state__desc">
                          No parts added yet. Add parts below.
                        </p>
                      </div>
                    )}

                    {/* Add item form */}
                    {canEdit && (
                      <>
                        {addingItemToId === inv.id ? (
                          <div
                            style={{
                              padding: "1rem",
                              borderRadius: "var(--radius-lg)",
                              border: "1.5px dashed var(--blue-300)",
                              background: "var(--blue-50)",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 .75rem",
                                fontWeight: 700,
                                fontSize: ".88rem",
                                color: "var(--blue-800)",
                              }}
                            >
                              Add New Part
                            </p>
                            {addItemError && (
                              <div
                                className="auth-alert auth-alert--error"
                                style={{
                                  marginBottom: ".75rem",
                                  padding: ".5rem .75rem",
                                  fontSize: ".8rem",
                                }}
                              >
                                {addItemError}
                              </div>
                            )}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 120px",
                                gap: ".75rem",
                                marginBottom: ".75rem",
                              }}
                            >
                              <div className="form-group">
                                <label className="form-label">
                                  Part Name *
                                </label>
                                <input
                                  type="text"
                                  className={`form-input${!newPart.trim() && addItemError ? " form-input--error" : ""}`}
                                  placeholder="e.g. Conveyor Belt"
                                  value={newPart}
                                  onChange={(e) => setNewPart(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input
                                  type="number"
                                  min={1}
                                  className={`form-input${(!newQty || Number(newQty) < 1) && addItemError ? " form-input--error" : ""}`}
                                  placeholder="1"
                                  value={newQty}
                                  onChange={(e) => setNewQty(e.target.value)}
                                />
                              </div>
                            </div>
                            <div
                              className="form-group"
                              style={{ marginBottom: ".75rem" }}
                            >
                              <label className="form-label">
                                Photo (optional)
                              </label>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: ".5rem",
                                  padding: ".5rem .75rem",
                                  border: "1.5px dashed var(--border-default)",
                                  borderRadius: "var(--radius-md)",
                                  cursor: "pointer",
                                  fontSize: ".82rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <Image size={15} />
                                {newImage ? newImage.name : "Upload part photo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) =>
                                    setNewImage(e.target.files?.[0] ?? null)
                                  }
                                />
                              </label>
                            </div>
                            <div style={{ display: "flex", gap: ".625rem" }}>
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => void handleAddItem(inv.id)}
                                disabled={addingItem}
                              >
                                <Plus size={14} />{" "}
                                {addingItem ? "Adding…" : "Add Part"}
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                  setAddingItemToId(null);
                                  setAddItemError("");
                                  setNewPart("");
                                  setNewQty("");
                                  setNewImage(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => {
                              setAddingItemToId(inv.id);
                              setAddItemError("");
                            }}
                          >
                            <Plus size={14} /> Add Part
                          </button>
                        )}
                      </>
                    )}

                    {inv.status === "REVIEWED" && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: ".75rem",
                          borderRadius: "var(--radius-md)",
                          background: "var(--green-50)",
                          border: "1px solid var(--green-100)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".625rem",
                          fontSize: ".82rem",
                          color: "var(--green-600)",
                        }}
                      >
                        <CheckCircle size={16} />
                        This inventory has been reviewed by the
                        admin/accountant.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
