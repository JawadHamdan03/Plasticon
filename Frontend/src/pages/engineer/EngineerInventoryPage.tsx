import {
  useState,
  useCallback,
  useEffect,
  type FormEvent,
} from "react";
import {
  Plus,
  Trash2,
  Send,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Image,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";

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

  const token = localStorage.getItem("plasticon_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

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
  const map: Record<Inventory["status"], { label: string; bg: string; color: string }> = {
    DRAFT: { label: "Draft", bg: "rgba(107,114,128,.12)", color: "#6b7280" },
    SUBMITTED: { label: "Submitted", bg: "rgba(249,115,22,.12)", color: "#ea580c" },
    REVIEWED: { label: "Reviewed", bg: "rgba(34,197,94,.12)", color: "#16a34a" },
  };
  const { label, bg, color } = map[status];
  return (
    <span style={{ padding: ".2rem .65rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 700, background: bg, color }}>
      {label}
    </span>
  );
}

/* ── Component ─────────────────────────────────────────────── */
export function EngineerInventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

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
    if (!(await confirmDialog("Delete this part?", { danger: true }))) return;
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
    if (!(await confirmDialog(`Submit this inventory for ${MONTHS[inv.month - 1]} ${inv.year}? This cannot be undone.`)))
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

  const totalParts = inventories.reduce((s, i) => s + i.items.length, 0);
  const drafts = inventories.filter((i) => i.status === "DRAFT").length;
  const submitted = inventories.filter((i) => i.status === "SUBMITTED").length;
  const reviewed = inventories.filter((i) => i.status === "REVIEWED").length;

  return (
    <ModulePageShell
      title="Parts Inventory"
      subtitle="Submit monthly shortage reports — admin & accountant will be notified"
      actions={
        !isAdmin ? (
          <button
            className="auth-button"
            style={{ display: "flex", alignItems: "center", gap: ".4rem" }}
            onClick={() => setShowNewForm((v) => !v)}
          >
            <Plus size={16} /> New Report
          </button>
        ) : undefined
      }
    >
      {/* Error banner */}
      {error && (
        <div className="auth-alert auth-alert--error mb-4" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <AlertCircle size={16} /> {error}
          <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }} onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI strip */}
      {!loading && inventories.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Reports", value: inventories.length, gradient: "bg-linear-to-br from-blue-500 to-blue-700" },
            { label: "Total Parts", value: totalParts, gradient: "bg-linear-to-br from-purple-500 to-purple-700" },
            { label: "Drafts", value: drafts, gradient: "bg-linear-to-br from-gray-400 to-gray-600" },
            { label: "Submitted", value: submitted, gradient: "bg-linear-to-br from-orange-500 to-orange-700" },
            { label: "Reviewed", value: reviewed, gradient: "bg-linear-to-br from-green-500 to-emerald-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className={`${kpi.gradient} p-4 text-white`}>
              <p style={{ margin: "0 0 .4rem", fontSize: ".78rem", fontWeight: 600, opacity: .85 }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* New report form */}
      {!isAdmin && showNewForm && (
        <Card className="p-5 mb-5">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>New Inventory Report</h2>
            <button type="button" className="auth-button auth-button--ghost" style={{ padding: ".3rem .5rem" }} onClick={() => setShowNewForm(false)}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                Month *
                <select
                  style={{ padding: ".45rem .65rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  required
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                Year *
                <select
                  style={{ padding: ".45rem .65rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem" }}
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  required
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
              Notes (optional)
              <textarea
                rows={2}
                placeholder="Any additional notes about this inventory period…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ padding: ".45rem .65rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem", resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button type="submit" className="auth-button" disabled={creating}>{creating ? "Creating…" : "Create Report"}</button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowNewForm(false)}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading / empty */}
      {loading ? (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <div style={{ margin: "0 auto 1rem", width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border-default)", borderTopColor: "var(--orange-500)", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading your inventory reports…</p>
        </Card>
      ) : inventories.length === 0 ? (
        <Card className="p-10" style={{ textAlign: "center" }}>
          <Package size={40} style={{ color: "var(--text-muted, #9ca3af)", margin: "0 auto 1rem" }} />
          <h3 style={{ margin: "0 0 .5rem", fontWeight: 700 }}>No inventory reports yet</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>Create your first monthly parts shortage report.</p>
          {!isAdmin && (
            <button className="auth-button" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }} onClick={() => setShowNewForm(true)}>
              <Plus size={15} /> Create Report
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {inventories.map((inv) => {
            const isExpanded = expandedId === inv.id;
            const canEdit = inv.status === "DRAFT";

            return (
              <Card key={inv.id} className="overflow-hidden">
                {/* Inventory header row */}
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", cursor: "pointer", gap: "1rem" }}
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "var(--radius-md)", background: "rgba(59,130,246,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={18} style={{ color: "#3b82f6" }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>
                        {MONTHS[inv.month - 1]} {inv.year}
                      </p>
                      <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-secondary)" }}>
                        {inv.items.length} parts listed{inv.notes ? ` · ${inv.notes}` : ""}
                      </p>
                    </div>
                    {statusBadge(inv.status)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    {canEdit && (
                      <button
                        className="auth-button"
                        style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".35rem .75rem", fontSize: ".8rem" }}
                        onClick={(e) => { e.stopPropagation(); void handleSubmit(inv.id); }}
                        disabled={submitting === inv.id}
                      >
                        <Send size={13} />
                        {submitting === inv.id ? "Submitting…" : "Submit"}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} style={{ color: "var(--text-secondary)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-secondary)" }} />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-default)", padding: "1.25rem" }}>
                    {inv.submittedAt && (
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1rem", fontSize: ".8rem", color: "var(--text-secondary)" }}>
                        <CheckCircle size={14} style={{ color: "#16a34a" }} />
                        Submitted on {new Date(inv.submittedAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Items table */}
                    {inv.items.length > 0 ? (
                      <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                        <table className="admin-table">
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
                                <td style={{ color: "var(--text-secondary)", fontSize: ".8rem" }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600 }}>{item.partName}</td>
                                <td>
                                  <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".78rem", fontWeight: 700, background: "rgba(59,130,246,.12)", color: "#2563eb" }}>
                                    {item.quantity}
                                  </span>
                                </td>
                                <td>
                                  {item.imagePath ? (
                                    <a href={`${API_BASE_URL.replace("/api", "")}/${item.imagePath}`} target="_blank" rel="noopener noreferrer" className="auth-button auth-button--ghost" style={{ padding: ".3rem .5rem" }} title="View photo">
                                      <Image size={15} />
                                    </a>
                                  ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                </td>
                                <td>
                                  {item.unitPrice !== null ? (
                                    <span style={{ fontWeight: 700, color: "#16a34a" }}>${item.unitPrice.toFixed(2)}</span>
                                  ) : (
                                    <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 600, background: "rgba(107,114,128,.1)", color: "#6b7280" }}>Pending</span>
                                  )}
                                </td>
                                <td style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{item.pricedBy?.fullName ?? "—"}</td>
                                {canEdit && (
                                  <td>
                                    <button
                                      type="button"
                                      className="auth-button auth-button--ghost"
                                      style={{ padding: ".3rem .5rem", color: "#ef4444" }}
                                      onClick={() => void handleDeleteItem(item.id)}
                                      disabled={deleting === item.id}
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
                      <div style={{ padding: "1.5rem", textAlign: "center", marginBottom: "1rem", borderRadius: "var(--radius-lg)", background: "var(--bg-subtle)", border: "1px dashed var(--border-default)" }}>
                        <Package size={24} style={{ color: "var(--text-muted)", margin: "0 auto .5rem" }} />
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>No parts added yet. Add parts below.</p>
                      </div>
                    )}

                    {/* Add item form */}
                    {canEdit && (
                      <>
                        {addingItemToId === inv.id ? (
                          <div style={{ padding: "1rem", borderRadius: "var(--radius-lg)", border: "1.5px dashed #93c5fd", background: "#eff6ff" }}>
                            <p style={{ margin: "0 0 .75rem", fontWeight: 700, fontSize: ".88rem", color: "#1d4ed8" }}>Add New Part</p>
                            {addItemError && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", padding: ".5rem .75rem", fontSize: ".8rem" }}>{addItemError}</div>}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: ".75rem", marginBottom: ".75rem" }}>
                              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                                Part Name *
                                <input
                                  type="text"
                                  placeholder="e.g. Conveyor Belt"
                                  value={newPart}
                                  onChange={(e) => setNewPart(e.target.value)}
                                  style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: `1px solid ${!newPart.trim() && addItemError ? "#ef4444" : "var(--border-default)"}`, background: "white", fontSize: ".875rem" }}
                                />
                              </label>
                              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                                Qty *
                                <input
                                  type="number"
                                  min={1}
                                  placeholder="1"
                                  value={newQty}
                                  onChange={(e) => setNewQty(e.target.value)}
                                  style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "white", fontSize: ".875rem" }}
                                />
                              </label>
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".45rem .65rem", border: "1.5px dashed var(--border-default)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: ".82rem", color: "var(--text-secondary)", marginBottom: ".75rem" }}>
                              <Image size={15} />
                              {newImage ? newImage.name : "Upload part photo (optional)"}
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setNewImage(e.target.files?.[0] ?? null)} />
                            </label>
                            <div style={{ display: "flex", gap: ".625rem" }}>
                              <button type="button" className="auth-button" style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".82rem" }} onClick={() => void handleAddItem(inv.id)} disabled={addingItem}>
                                <Plus size={14} /> {addingItem ? "Adding…" : "Add Part"}
                              </button>
                              <button type="button" className="auth-button auth-button--ghost" style={{ fontSize: ".82rem" }} onClick={() => { setAddingItemToId(null); setAddItemError(""); setNewPart(""); setNewQty(""); setNewImage(null); }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="auth-button auth-button--ghost" style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".82rem" }} onClick={() => { setAddingItemToId(inv.id); setAddItemError(""); }}>
                            <Plus size={14} /> Add Part
                          </button>
                        )}
                      </>
                    )}

                    {inv.status === "REVIEWED" && (
                      <div style={{ marginTop: "1rem", padding: ".75rem", borderRadius: "var(--radius-md)", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: ".625rem", fontSize: ".82rem", color: "#16a34a" }}>
                        <CheckCircle size={16} />
                        This inventory has been reviewed by the admin/accountant.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
