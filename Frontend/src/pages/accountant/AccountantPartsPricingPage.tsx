import { useState, useCallback, useEffect, type FormEvent } from "react";
import {
  DollarSign,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Image,
  AlertCircle,
  X,
  Filter,
} from "lucide-react";
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
  reviewedAt: string | null;
  engineer: { id: number; fullName: string; role: string };
  items: InventoryItem[];
};

/* ── helpers ─────────────────────────────────────────────── */
async function api<T>(method: string, path: string, body?: object): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
  if (status === "SUBMITTED")
    return <span className="badge badge--orange">Submitted</span>;
  if (status === "REVIEWED")
    return <span className="badge badge--green">Reviewed</span>;
  return <span className="badge badge--gray">Draft</span>;
}

/* ── Component ─────────────────────────────────────────────── */
export function AccountantPartsPricingPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"ALL" | "SUBMITTED" | "REVIEWED">(
    "SUBMITTED",
  );

  /* pricing state per item */
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [savingItem, setSavingItem] = useState<number | null>(null);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());

  /* review state */
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<Inventory[]>("GET", "/engineer-inventory/all");
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

  const filtered = inventories.filter((inv) =>
    filter === "ALL" ? true : inv.status === filter,
  );

  const handleSetPrice = async (itemId: number, inventoryId: number) => {
    const raw = priceInputs[itemId];
    const price = Number(raw);
    if (!raw || isNaN(price) || price < 0) {
      setError("Please enter a valid price (0 or more)");
      return;
    }
    setSavingItem(itemId);
    try {
      await api("PATCH", `/engineer-inventory/items/${itemId}/price`, {
        unitPrice: price,
      });
      setSavedItems((s) => new Set([...s, itemId]));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save price");
    } finally {
      setSavingItem(null);
    }
  };

  const handleReview = async (inventoryId: number) => {
    const inv = inventories.find((i) => i.id === inventoryId);
    if (!inv) return;
    if (
      !confirm(
        `Mark inventory for ${MONTHS[inv.month - 1]} ${inv.year} as Reviewed?`,
      )
    )
      return;
    setReviewingId(inventoryId);
    try {
      await api("PATCH", `/engineer-inventory/${inventoryId}/review`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark as reviewed");
    } finally {
      setReviewingId(null);
    }
  };

  const totalValue = (items: InventoryItem[]) =>
    items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);

  const allPriced = (items: InventoryItem[]) =>
    items.length > 0 && items.every((i) => i.unitPrice !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Parts Pricing</h1>
          <p className="page-header__sub">
            Review engineer inventory reports and set unit prices for each part
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <Filter size={14} style={{ color: "var(--text-secondary)" }} />
          {(["SUBMITTED", "REVIEWED", "ALL"] as const).map((f) => (
            <button
              key={f}
              className={`btn btn--sm ${filter === f ? "btn--primary" : "btn--ghost"}`}
              style={{ border: "1px solid var(--border-default)" }}
              onClick={() => setFilter(f)}
            >
              {f === "ALL"
                ? "All"
                : f === "SUBMITTED"
                  ? "Awaiting Pricing"
                  : "Reviewed"}
            </button>
          ))}
        </div>
      </div>

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

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <p className="empty-state__desc">Loading inventory reports…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "3rem" }}>
            <div className="empty-state__icon">
              <Package size={28} />
            </div>
            <h3 className="empty-state__title">
              {filter === "SUBMITTED"
                ? "No reports awaiting pricing"
                : "No reports found"}
            </h3>
            <p className="empty-state__desc">
              {filter === "SUBMITTED"
                ? "Engineers haven't submitted any inventory reports yet."
                : "Try changing the filter above."}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((inv) => {
            const isExpanded = expandedId === inv.id;
            const total = totalValue(inv.items);
            const done = allPriced(inv.items);

            return (
              <div key={inv.id} className="card">
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
                        By {inv.engineer.fullName} · {inv.items.length} parts
                        {inv.submittedAt
                          ? ` · Submitted ${new Date(inv.submittedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    {statusBadge(inv.status)}
                    {done && inv.status !== "REVIEWED" && (
                      <span className="badge badge--blue">All Priced</span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".75rem",
                    }}
                  >
                    {total > 0 && (
                      <span
                        style={{
                          fontSize: ".88rem",
                          fontWeight: 700,
                          color: "var(--green-600)",
                        }}
                      >
                        Total: ${total.toFixed(2)}
                      </span>
                    )}
                    {inv.status === "SUBMITTED" && done && (
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleReview(inv.id);
                        }}
                        disabled={reviewingId === inv.id}
                      >
                        <CheckCircle size={13} />
                        {reviewingId === inv.id
                          ? "Reviewing…"
                          : "Mark Reviewed"}
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

                {isExpanded && (
                  <div className="card-body">
                    {inv.notes && (
                      <div
                        style={{
                          marginBottom: "1rem",
                          padding: ".75rem",
                          borderRadius: "var(--radius-md)",
                          background: "var(--blue-50)",
                          fontSize: ".84rem",
                          color: "var(--blue-800)",
                        }}
                      >
                        <strong>Note:</strong> {inv.notes}
                      </div>
                    )}

                    {inv.items.length === 0 ? (
                      <div
                        className="empty-state"
                        style={{ padding: "1.5rem" }}
                      >
                        <p className="empty-state__desc">
                          No parts in this inventory.
                        </p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Part Name</th>
                              <th>Qty Needed</th>
                              <th>Photo</th>
                              <th>Set Unit Price ($)</th>
                              <th>Total</th>
                              <th>Status</th>
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
                                      href={`${API_BASE_URL.replace("/api", "")}/pictures/${item.imagePath.split("/").pop()}`}
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
                                  {inv.status === "SUBMITTED" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: ".5rem",
                                      }}
                                    >
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="form-input"
                                        style={{
                                          width: 90,
                                          padding: ".35rem .5rem",
                                          fontSize: ".82rem",
                                        }}
                                        placeholder={
                                          item.unitPrice !== null
                                            ? String(item.unitPrice)
                                            : "0.00"
                                        }
                                        value={
                                          priceInputs[item.id] ??
                                          (item.unitPrice !== null
                                            ? String(item.unitPrice)
                                            : "")
                                        }
                                        onChange={(e) =>
                                          setPriceInputs((p) => ({
                                            ...p,
                                            [item.id]: e.target.value,
                                          }))
                                        }
                                      />
                                      <button
                                        className="btn btn--primary btn--sm"
                                        onClick={() =>
                                          void handleSetPrice(item.id, inv.id)
                                        }
                                        disabled={savingItem === item.id}
                                      >
                                        {savingItem === item.id
                                          ? "…"
                                          : savedItems.has(item.id)
                                            ? "✓"
                                            : "Set"}
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: "var(--green-600)",
                                      }}
                                    >
                                      {item.unitPrice !== null
                                        ? `$${item.unitPrice.toFixed(2)}`
                                        : "—"}
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 700 }}>
                                  {item.unitPrice !== null ? (
                                    `$${(item.unitPrice * item.quantity).toFixed(2)}`
                                  ) : (
                                    <span style={{ color: "var(--gray-300)" }}>
                                      —
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {item.unitPrice !== null ? (
                                    <span className="badge badge--green">
                                      Priced
                                    </span>
                                  ) : (
                                    <span className="badge badge--gray">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {inv.status === "REVIEWED" && inv.reviewedAt && (
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
                        Reviewed on{" "}
                        {new Date(inv.reviewedAt).toLocaleDateString()} · Total
                        value: <strong>${total.toFixed(2)}</strong>
                      </div>
                    )}

                    {inv.status === "SUBMITTED" && !done && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: ".75rem",
                          borderRadius: "var(--radius-md)",
                          background: "var(--orange-50)",
                          border: "1px solid var(--orange-100)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".625rem",
                          fontSize: ".82rem",
                          color: "var(--orange-700)",
                        }}
                      >
                        <Clock size={16} />
                        Set prices for all{" "}
                        {
                          inv.items.filter((i) => i.unitPrice === null).length
                        }{" "}
                        remaining part(s) to complete pricing.
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
