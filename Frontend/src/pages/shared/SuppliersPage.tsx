import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Search,
  Package,
  TrendingUp,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Card } from "../../components/ui/card";

/* ─── Types ──────────────────────────────────────────────── */
type RawMaterial = { id: number; name: string; unit: string };
type SupplierOption = { id: number; name: string };
type PurchaseItem = {
  id: number;
  materialId: number;
  quantity: number;
  pricePerUnit: number;
  material?: RawMaterial;
};
type FileAttachment = { id: number; fileName: string; filePath: string; publicUrl?: string };
type PurchaseRecord = {
  id: number;
  supplierId: number;
  date: string;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  supplier?: { id: number; name: string; phone?: string | null; email?: string | null; address?: string | null };
  items: PurchaseItem[];
  fileAttachments?: FileAttachment[];
};
type SupplierLedger = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  totalSpent: number;
  purchasesCount: number;
  lastPurchaseDate: string | null;
  purchases: PurchaseRecord[];
};
type FormItem = { materialId: string; quantity: string; pricePerUnit: string };

/* ─── Helpers ────────────────────────────────────────────── */
function authToken(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authToken(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}

const toPublicFileUrl = (pathOrUrl?: string | null) => {
  if (!pathOrUrl?.trim()) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/pictures/")) return `${API_BASE_URL}${pathOrUrl}`;
  const normalized = pathOrUrl
    .replace(/^prisma[\\/]+pictures[\\/]+/i, "")
    .replace(/^pictures[\\/]+/i, "")
    .replace(/^\/+/, "");
  return normalized ? `${API_BASE_URL}/pictures/${normalized}` : "";
};

const getInvoiceUrl = (r: { invoiceUrl?: string; invoiceImage?: string; fileAttachments?: FileAttachment[] }) => {
  if (r.invoiceUrl) return toPublicFileUrl(r.invoiceUrl);
  const att = r.fileAttachments?.[0];
  return toPublicFileUrl(att?.publicUrl ?? att?.filePath ?? r.invoiceImage);
};

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtDate = (v: string) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "numeric" }).format(new Date(v));

const toDateInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

const emptyItem = (): FormItem => ({ materialId: "", quantity: "", pricePerUnit: "" });
const emptyForm = () => ({ supplierName: "", date: "", items: [emptyItem()] });

/* ─── Supplier avatar color ──────────────────────────────── */
const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#0ea5e9", "#ec4899", "#f59e0b"];
const supplierColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

/* ─── Component ──────────────────────────────────────────── */
export function SuppliersPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const nav = (en: string, ar: string) => (isAr ? ar : en);
  const canEdit = user?.role === "ACCOUNTANT";

  /* State */
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<number>>(new Set());

  /* ── Data loading ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [matRes, supRes, purRes] = await Promise.all([
        fetchWithAuth("/inventory/materials"),
        fetchWithAuth("/purchases/suppliers"),
        fetchWithAuth("/purchases/all"),
      ]);
      if (matRes.ok) setMaterials((await matRes.json()) as RawMaterial[]);
      if (supRes.ok) setSupplierOptions((await supRes.json()) as SupplierOption[]);
      if (purRes.ok) setPurchases((await purRes.json()) as PurchaseRecord[]);
      else throw new Error(await readApiError(purRes));
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to load", "فشل التحميل"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  /* ── Computed ── */
  const ledgers = useMemo<SupplierLedger[]>(() => {
    const map = new Map<number, SupplierLedger>();
    for (const p of purchases) {
      const id = p.supplier?.id ?? p.supplierId;
      const name = p.supplier?.name ?? `#${id}`;
      const cur = map.get(id) ?? {
        id, name,
        phone: p.supplier?.phone ?? null,
        email: p.supplier?.email ?? null,
        address: p.supplier?.address ?? null,
        totalSpent: 0, purchasesCount: 0, lastPurchaseDate: null, purchases: [],
      };
      cur.totalSpent += p.totalAmount ?? 0;
      cur.purchasesCount += 1;
      cur.purchases.push(p);
      if (!cur.lastPurchaseDate || new Date(p.date) > new Date(cur.lastPurchaseDate)) {
        cur.lastPurchaseDate = p.date;
      }
      map.set(id, cur);
    }
    return Array.from(map.values())
      .map((l) => ({ ...l, purchases: [...l.purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [purchases]);

  const filteredLedgers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ledgers;
    return ledgers.filter((l) => {
      const hay = [l.name, l.phone ?? "", l.email ?? "",
        ...l.purchases.flatMap((p) => p.items.map((i) => i.material?.name ?? ""))].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [ledgers, query]);

  const totals = useMemo(() => ({
    suppliers: ledgers.length,
    purchases: purchases.length,
    amount: purchases.reduce((s, p) => s + (p.totalAmount ?? 0), 0),
  }), [ledgers.length, purchases]);

  /* ── Computed totals inside form ── */
  const formTotal = useMemo(() =>
    form.items.reduce((s, it) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.pricePerUnit) || 0;
      return s + q * p;
    }, 0),
    [form.items],
  );

  /* ── Form helpers ── */
  const resetForm = () => {
    setForm(emptyForm());
    setInvoiceFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (p: PurchaseRecord) => {
    setEditingId(p.id);
    setForm({
      supplierName: p.supplier?.name ?? "",
      date: toDateInput(p.date),
      items: p.items.length > 0
        ? p.items.map((i) => ({ materialId: String(i.materialId), quantity: String(i.quantity), pricePerUnit: String(i.pricePerUnit) }))
        : [emptyItem()],
    });
    setInvoiceFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const patchItem = (idx: number, patch: Partial<FormItem>) =>
    setForm((prev) => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));

  /* ── Submit ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!editingId && !invoiceFile) {
      setError(nav("Invoice image is required to create a purchase.", "صورة الفاتورة مطلوبة لإضافة الشراء."));
      return;
    }
    setSaving(true);
    setError(""); setSuccess("");
    try {
      const body = new FormData();
      body.append("supplierName", form.supplierName.trim());
      if (form.date) body.append("date", form.date);
      body.append("totalAmount", String(formTotal > 0 ? formTotal : 0));
      const items = form.items
        .filter((it) => it.materialId && it.quantity && it.pricePerUnit)
        .map((it) => ({ materialId: Number(it.materialId), quantity: Number(it.quantity), pricePerUnit: Number(it.pricePerUnit) }));
      body.append("items", JSON.stringify(items));
      if (invoiceFile) body.append("invoiceFile", invoiceFile);

      const res = await fetchWithAuth(editingId ? `/purchases/${editingId}` : "/purchases", {
        method: editingId ? "PUT" : "POST",
        body,
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setSuccess(editingId ? nav("Purchase updated", "تم تعديل الشراء") : nav("Purchase created", "تمت إضافة الشراء"));
      await loadAll();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to save", "فشل الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!canEdit) return;
    if (!(await confirmDialog(nav("Delete this purchase?", "حذف عملية الشراء؟"), { danger: true }))) return;
    try {
      const res = await fetchWithAuth(`/purchases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      setSuccess(nav("Purchase deleted", "تم حذف الشراء"));
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : nav("Failed to delete", "فشل الحذف"));
    }
  };

  const toggleSupplier = (id: number) =>
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <ModulePageShell
      title={nav("Purchases", "المشتريات")}
      subtitle={nav(
        "Track supplier receipts, materials, quantities and costs.",
        "تتبع فواتير الموردين والمواد والكميات والتكاليف.",
      )}
      actions={
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <button type="button" className="auth-button auth-button--ghost" onClick={() => void loadAll()}>
            {nav("Refresh", "تحديث")}
          </button>
          {canEdit && (
            <button type="button" className="auth-button" onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm(emptyForm()); }}>
              <Plus size={15} />
              {nav("New Purchase", "شراء جديد")}
            </button>
          )}
        </div>
      }
    >
      {/* ── Alerts ── */}
      {error ? <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".75rem 1rem", borderRadius: "var(--radius-lg)", background: "#dcfce7", color: "#15803d", marginBottom: "1rem", fontWeight: 600, fontSize: ".9rem" }}>
          ✓ {success}
        </div>
      ) : null}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: nav("Suppliers", "الموردون"), value: totals.suppliers, icon: <Building2 size={20} />, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: nav("Total Purchases", "عمليات الشراء"), value: totals.purchases, icon: <ShoppingCart size={20} />, gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
          { label: nav("Total Spent", "إجمالي الإنفاق"), value: `${fmtMoney(totals.amount)}`, icon: <TrendingUp size={20} />, gradient: "linear-gradient(135deg,#10b981,#059669)" },
        ].map((k) => (
          <Card key={k.label} style={{ background: k.gradient, color: "#fff", border: "none", padding: "1.25rem 1.5rem", boxShadow: "0 4px 14px rgba(0,0,0,.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
              <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".05em" }}>{k.label}</p>
              <span style={{ opacity: .7 }}>{k.icon}</span>
            </div>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* ── Create / Edit Form ── */}
      {showForm && canEdit && (
        <Card style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "2px solid var(--border-default)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: ".5rem" }}>
              {editingId ? <Pencil size={18} style={{ color: "var(--brand-primary)" }} /> : <Plus size={18} style={{ color: "var(--brand-primary)" }} />}
              {editingId ? nav("Edit Purchase", "تعديل الشراء") : nav("New Purchase", "شراء جديد")}
            </h3>
            <button type="button" onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: ".25rem" }}>
              <X size={18} />
            </button>
          </div>

          <form className="module-form" onSubmit={(e) => void handleSubmit(e)}>
            {/* Row 1: Supplier + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {nav("Supplier *", "المورد *")}
                </span>
                <input
                  list="suppliers-datalist"
                  className="module-form__input"
                  value={form.supplierName}
                  onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
                  placeholder={nav("Type or select supplier…", "اكتب أو اختر المورد…")}
                  required
                />
                <datalist id="suppliers-datalist">
                  {supplierOptions.map((s) => <option key={s.id} value={s.name} />)}
                </datalist>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {nav("Received Date", "تاريخ الاستلام")}
                </span>
                <input
                  type="date"
                  className="module-form__input"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </label>
            </div>

            {/* Items */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  <Package size={15} style={{ display: "inline", marginRight: ".3rem" }} />
                  {nav("Items", "الأصناف")}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, items: [...p.items, emptyItem()] }))}
                  style={{ background: "none", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", padding: ".3rem .75rem", fontSize: ".8rem", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  + {nav("Add Item", "إضافة صنف")}
                </button>
              </div>

              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: ".5rem", padding: "0 .25rem", fontSize: ".73rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: ".25rem" }}>
                <span>{nav("Material", "المادة")}</span>
                <span>{nav("Qty", "الكمية")}</span>
                <span>{nav("Unit Price", "سعر الوحدة")}</span>
                <span>{nav("Total", "الإجمالي")}</span>
                <span />
              </div>

              {form.items.map((item, idx) => {
                const mat = materials.find((m) => String(m.id) === item.materialId);
                const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.pricePerUnit) || 0);
                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: ".5rem", alignItems: "center", marginBottom: ".5rem", background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: ".5rem .6rem" }}>
                    <div>
                      <select
                        value={item.materialId}
                        onChange={(e) => patchItem(idx, { materialId: e.target.value })}
                        required
                        style={{ width: "100%", padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", color: "var(--text-primary)" }}
                      >
                        <option value="">{nav("Select…", "اختر…")}</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                        ))}
                      </select>
                      {mat && <span style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: ".15rem", display: "block" }}>{mat.unit}</span>}
                    </div>
                    <input
                      type="number" min={0.01} step="any" required
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => patchItem(idx, { quantity: e.target.value })}
                      style={{ padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", width: "100%" }}
                    />
                    <input
                      type="number" min={0} step="any" required
                      placeholder="0.00"
                      value={item.pricePerUnit}
                      onChange={(e) => patchItem(idx, { pricePerUnit: e.target.value })}
                      style={{ padding: ".4rem .5rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".85rem", width: "100%" }}
                    />
                    <span style={{ fontSize: ".82rem", fontWeight: 700, color: lineTotal > 0 ? "#15803d" : "var(--text-muted)", minWidth: 64, textAlign: "right" }}>
                      {lineTotal > 0 ? fmtMoney(lineTotal) : "—"}
                    </span>
                    {form.items.length > 1 ? (
                      <button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: ".25rem" }}>
                        <X size={15} />
                      </button>
                    ) : <span />}
                  </div>
                );
              })}

              {/* Auto-total */}
              {formTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: ".5rem .6rem", fontSize: ".9rem", fontWeight: 700, color: "#15803d" }}>
                  {nav("Total:", "الإجمالي:")} {fmtMoney(formTotal)}
                </div>
              )}
            </div>

            {/* Invoice file */}
            <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                <FileText size={14} style={{ display: "inline", marginRight: ".25rem" }} />
                {nav("Invoice (PDF / Image)", "الفاتورة (PDF / صورة)")}
                {!editingId && <span style={{ color: "#ef4444", marginLeft: ".25rem" }}>*</span>}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                style={{ padding: ".4rem 0", fontSize: ".85rem", color: "var(--text-primary)" }}
              />
              {!editingId && !invoiceFile && (
                <span style={{ fontSize: ".75rem", color: "#ef4444" }}>
                  {nav("Required for new purchases", "مطلوب للشراء الجديد")}
                </span>
              )}
              {invoiceFile && (
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  📎 {invoiceFile.name}
                </span>
              )}
            </label>

            {/* Buttons */}
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", paddingTop: ".25rem" }}>
              <button type="submit" className="auth-button" disabled={saving}>
                {saving ? nav("Saving…", "جاري الحفظ…") : editingId ? nav("Save Changes", "حفظ التعديل") : nav("Create Purchase", "إضافة الشراء")}
              </button>
              <button type="button" className="auth-button auth-button--ghost" onClick={resetForm}>
                {nav("Cancel", "إلغاء")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Search ── */}
      <Card style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={nav("Search suppliers, materials, invoices…", "ابحث في الموردين والمواد والفواتير…")}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: ".9rem", color: "var(--text-primary)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: ".25rem" }}>
              <X size={15} />
            </button>
          )}
        </div>
      </Card>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 80, borderRadius: "var(--radius-xl)", background: "var(--bg-surface)" }} className="animate-pulse" />)}
        </div>
      )}

      {/* ── Supplier ledger ── */}
      {!loading && filteredLedgers.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <ShoppingCart size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <p style={{ margin: 0, fontWeight: 600, color: "var(--text-secondary)" }}>{nav("No purchases yet", "لا توجد مشتريات بعد")}</p>
          {canEdit && (
            <button type="button" className="auth-button" style={{ marginTop: "1rem" }} onClick={() => setShowForm(true)}>
              <Plus size={15} />
              {nav("Add First Purchase", "أضف أول شراء")}
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredLedgers.map((ledger) => {
            const expanded = expandedSuppliers.has(ledger.id);
            const color = supplierColor(ledger.name);
            return (
              <Card key={ledger.id} style={{ overflow: "hidden" }}>
                {/* Supplier header */}
                <button
                  type="button"
                  onClick={() => toggleSupplier(ledger.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", background: "var(--bg-surface)", border: "none", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border-default)" : "none", textAlign: "left" }}
                >
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>
                    {ledger.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem", color: "var(--text-primary)" }}>{ledger.name}</p>
                    {(ledger.phone ?? ledger.email) && (
                      <p style={{ margin: "2px 0 0", fontSize: ".75rem", color: "var(--text-muted)" }}>
                        {ledger.phone ?? ledger.email}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{nav("Purchases", "عمليات")}</p>
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{ledger.purchasesCount}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{nav("Total Spent", "الإجمالي")}</p>
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#15803d" }}>{fmtMoney(ledger.totalSpent)}</p>
                    </div>
                    {ledger.lastPurchaseDate && (
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{nav("Last", "آخر")}</p>
                        <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)" }}>{fmtDate(ledger.lastPurchaseDate)}</p>
                      </div>
                    )}
                    <span style={{ color: "var(--text-muted)" }}>
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </div>
                </button>

                {/* Purchases list */}
                {expanded && (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>{nav("Date", "التاريخ")}</th>
                          <th>{nav("Items", "الأصناف")}</th>
                          <th>{nav("Total", "الإجمالي")}</th>
                          <th>{nav("Invoice", "الفاتورة")}</th>
                          {canEdit && <th style={{ width: 80 }}>{nav("Actions", "إجراءات")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.purchases.map((p) => {
                          const invUrl = getInvoiceUrl(p);
                          return (
                            <tr key={p.id}>
                              <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                                {fmtDate(p.date)}
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                                  {p.items.map((item) => (
                                    <span key={item.id} style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                                      <strong style={{ color: "var(--text-primary)" }}>{item.material?.name ?? `#${item.materialId}`}</strong>
                                      {item.material?.unit ? ` (${item.material.unit})` : ""}
                                      {" · "}{item.quantity} × {fmtMoney(item.pricePerUnit)}
                                      {" = "}
                                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmtMoney(item.quantity * item.pricePerUnit)}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 800, color: "#15803d", fontSize: ".95rem" }}>
                                  {fmtMoney(p.totalAmount)}
                                </span>
                              </td>
                              <td>
                                {invUrl ? (
                                  <a href={invUrl} target="_blank" rel="noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".8rem", color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>
                                    <ExternalLink size={13} />
                                    {nav("View", "عرض")}
                                  </a>
                                ) : (
                                  <span style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>—</span>
                                )}
                              </td>
                              {canEdit && (
                                <td>
                                  <div style={{ display: "flex", gap: ".35rem" }}>
                                    <button type="button" onClick={() => openEdit(p)}
                                      title={nav("Edit", "تعديل")}
                                      style={{ padding: ".35rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                                      <Pencil size={13} />
                                    </button>
                                    <button type="button" onClick={() => void handleDelete(p.id)}
                                      title={nav("Delete", "حذف")}
                                      style={{ padding: ".35rem", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,.06)", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "var(--bg-surface)", borderTop: "2px solid var(--border-default)" }}>
                          <td colSpan={2} style={{ fontWeight: 700, fontSize: ".85rem", padding: ".6rem 1rem" }}>{nav("Supplier Total", "إجمالي المورد")}</td>
                          <td style={{ fontWeight: 800, color: "#15803d" }}>{fmtMoney(ledger.totalSpent)}</td>
                          <td colSpan={canEdit ? 2 : 1} />
                        </tr>
                      </tfoot>
                    </table>
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
