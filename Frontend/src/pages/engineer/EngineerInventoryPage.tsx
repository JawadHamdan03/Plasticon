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
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function statusBadge(status: Inventory["status"]) {
  const map: Record<Inventory["status"], { label: string; bg: string; color: string }> = {
    DRAFT: { label: "مسودة", bg: "rgba(107,114,128,.12)", color: "#6b7280" },
    SUBMITTED: { label: "مقدم", bg: "rgba(249,115,22,.12)", color: "#ea580c" },
    REVIEWED: { label: "مراجع", bg: "rgba(34,197,94,.12)", color: "#16a34a" },
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
      setError(e instanceof Error ? e.message : "فشل تحميل التقارير");
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
      setError(e instanceof Error ? e.message : "خطأ في إنشاء التقرير");
    } finally {
      setCreating(false);
    }
  };

  /* Add item */
  const handleAddItem = async (inventoryId: number) => {
    setAddItemError("");
    const qty = Number(newPart && newQty);
    if (!newPart.trim()) {
      setAddItemError("اسم القطعة مطلوب");
      return;
    }
    if (!newQty || Number(newQty) < 1) {
      setAddItemError("الكمية يجب أن تكون 1 على الأقل");
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
      setAddItemError(e instanceof Error ? e.message : "خطأ في إضافة القطعة");
    } finally {
      setAddingItem(false);
    }
  };

  /* Delete item */
  const handleDeleteItem = async (itemId: number) => {
    if (!(await confirmDialog("حذف هذه القطعة؟", { danger: true }))) return;
    setDeleting(itemId);
    try {
      await api("DELETE", `/engineer-inventory/items/${itemId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في حذف القطعة");
    } finally {
      setDeleting(null);
    }
  };

  /* Submit inventory */
  const handleSubmit = async (inventoryId: number) => {
    const inv = inventories.find((i) => i.id === inventoryId);
    if (!inv || inv.items.length === 0) {
      setError("أضف قطعة واحدة على الأقل قبل التقديم");
      return;
    }
    if (!(await confirmDialog(`تقديم مخزون ${MONTHS[inv.month - 1]} ${inv.year}؟ لا يمكن التراجع عن هذا.`)))
      return;
    setSubmitting(inventoryId);
    try {
      await api("PATCH", `/engineer-inventory/${inventoryId}/submit`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التقديم");
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
      title="مخزون القطع"
      subtitle="تقديم تقارير النقص الشهرية — سيتم إخطار الإدارة والمحاسبة"
      actions={
        !isAdmin ? (
          <button
            className="auth-button"
            style={{ display: "flex", alignItems: "center", gap: ".4rem" }}
            onClick={() => setShowNewForm((v) => !v)}
          >
            <Plus size={16} /> تقرير جديد
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
            { label: "إجمالي التقارير", value: inventories.length, gradient: "bg-linear-to-br from-blue-500 to-blue-700" },
            { label: "إجمالي القطع", value: totalParts, gradient: "bg-linear-to-br from-purple-500 to-purple-700" },
            { label: "مسودات", value: drafts, gradient: "bg-linear-to-br from-gray-400 to-gray-600" },
            { label: "مقدم", value: submitted, gradient: "bg-linear-to-br from-orange-500 to-orange-700" },
            { label: "مراجع", value: reviewed, gradient: "bg-linear-to-br from-green-500 to-emerald-700" },
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
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>تقرير مخزون جديد</h2>
            <button type="button" className="auth-button auth-button--ghost" style={{ padding: ".3rem .5rem" }} onClick={() => setShowNewForm(false)}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                الشهر *
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
                السنة *
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
              ملاحظات (اختياري)
              <textarea
                rows={2}
                placeholder="أي ملاحظات إضافية حول هذه الفترة..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ padding: ".45rem .65rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: ".875rem", resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button type="submit" className="auth-button" disabled={creating}>{creating ? "جارٍ الإنشاء..." : "إنشاء التقرير"}</button>
              <button type="button" className="auth-button auth-button--ghost" onClick={() => setShowNewForm(false)}>إلغاء</button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading / empty */}
      {loading ? (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <div style={{ margin: "0 auto 1rem", width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border-default)", borderTopColor: "var(--orange-500)", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--text-secondary)" }}>جارٍ تحميل التقارير...</p>
        </Card>
      ) : inventories.length === 0 ? (
        <Card className="p-10" style={{ textAlign: "center" }}>
          <Package size={40} style={{ color: "var(--text-muted, #9ca3af)", margin: "0 auto 1rem" }} />
          <h3 style={{ margin: "0 0 .5rem", fontWeight: 700 }}>لا توجد تقارير مخزون بعد</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>أنشئ أول تقرير شهري لنقص القطع.</p>
          {!isAdmin && (
            <button className="auth-button" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }} onClick={() => setShowNewForm(true)}>
              <Plus size={15} /> إنشاء التقرير
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
                        {inv.items.length} قطعة مدرجة{inv.notes ? ` · ${inv.notes}` : ""}
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
                        {submitting === inv.id ? "جارٍ التقديم..." : "تقديم"}
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
                        تم التقديم بتاريخ {new Date(inv.submittedAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Items table */}
                    {inv.items.length > 0 ? (
                      <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>اسم القطعة</th>
                              <th>الكمية المطلوبة</th>
                              <th>صورة</th>
                              <th>سعر الوحدة</th>
                              <th>بواسطة</th>
                              {canEdit && <th>إجراء</th>}
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
                                    <a href={`${API_BASE_URL.replace("/api", "")}/${item.imagePath}`} target="_blank" rel="noopener noreferrer" className="auth-button auth-button--ghost" style={{ padding: ".3rem .5rem" }} title="عرض الصورة">
                                      <Image size={15} />
                                    </a>
                                  ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                </td>
                                <td>
                                  {item.unitPrice !== null ? (
                                    <span style={{ fontWeight: 700, color: "#16a34a" }}>${item.unitPrice.toFixed(2)}</span>
                                  ) : (
                                    <span style={{ padding: ".2rem .6rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 600, background: "rgba(107,114,128,.1)", color: "#6b7280" }}>معلق</span>
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
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>لا توجد قطع مضافة بعد. أضف قطعاً أدناه.</p>
                      </div>
                    )}

                    {/* Add item form */}
                    {canEdit && (
                      <>
                        {addingItemToId === inv.id ? (
                          <div style={{ padding: "1rem", borderRadius: "var(--radius-lg)", border: "1.5px dashed #93c5fd", background: "#eff6ff" }}>
                            <p style={{ margin: "0 0 .75rem", fontWeight: 700, fontSize: ".88rem", color: "#1d4ed8" }}>إضافة قطعة جديدة</p>
                            {addItemError && <div className="auth-alert auth-alert--error" style={{ marginBottom: ".75rem", padding: ".5rem .75rem", fontSize: ".8rem" }}>{addItemError}</div>}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: ".75rem", marginBottom: ".75rem" }}>
                              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                                اسم القطعة *
                                <input
                                  type="text"
                                  placeholder="مثال: حزام ناقل"
                                  value={newPart}
                                  onChange={(e) => setNewPart(e.target.value)}
                                  style={{ padding: ".4rem .6rem", borderRadius: "var(--radius-md)", border: `1px solid ${!newPart.trim() && addItemError ? "#ef4444" : "var(--border-default)"}`, background: "white", fontSize: ".875rem" }}
                                />
                              </label>
                              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600 }}>
                                الكمية *
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
                              {newImage ? newImage.name : "رفع صورة القطعة (اختياري)"}
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setNewImage(e.target.files?.[0] ?? null)} />
                            </label>
                            <div style={{ display: "flex", gap: ".625rem" }}>
                              <button type="button" className="auth-button" style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".82rem" }} onClick={() => void handleAddItem(inv.id)} disabled={addingItem}>
                                <Plus size={14} /> {addingItem ? "جارٍ الإضافة..." : "إضافة قطعة"}
                              </button>
                              <button type="button" className="auth-button auth-button--ghost" style={{ fontSize: ".82rem" }} onClick={() => { setAddingItemToId(null); setAddItemError(""); setNewPart(""); setNewQty(""); setNewImage(null); }}>
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="auth-button auth-button--ghost" style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".82rem" }} onClick={() => { setAddingItemToId(inv.id); setAddItemError(""); }}>
                            <Plus size={14} /> إضافة قطعة
                          </button>
                        )}
                      </>
                    )}

                    {inv.status === "REVIEWED" && (
                      <div style={{ marginTop: "1rem", padding: ".75rem", borderRadius: "var(--radius-md)", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: ".625rem", fontSize: ".82rem", color: "#16a34a" }}>
                        <CheckCircle size={16} />
                        تمت مراجعة هذا المخزون من قبل الإدارة/المحاسبة.
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
