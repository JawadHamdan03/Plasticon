import { useEffect, useRef, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import {
  Plus, CheckCircle, Clock, Trash2, FileText, Search,
  AlertCircle, User, DollarSign, Calendar, X, Save,
  Sparkles, Edit3, Truck, PackageCheck, Paperclip, ExternalLink,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

/* ─── Helpers ─────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) }, credentials: "include" });
}
const uid = () => Math.random().toString(36).slice(2);
const isoDate = (d: string | null | undefined) => d ? new Date(d).toISOString().split("T")[0] : "";
const fmtDateTime = (d: string | null | undefined) => d ? new Date(d).toLocaleString() : "—";

/* ─── Types ───────────────────────────────────────────────── */
interface Invoice {
  id: number; customerId: number; invoiceNumber: string;
  totalAmount: number; dueDate: string; issueDate?: string | null;
  paymentStatus: string; createdAt: string; paymentRecordedAt?: string | null;
  aiExtracted?: boolean; currency?: string | null;
  subtotal?: number | null; taxAmount?: number | null;
  notes?: string | null; lineItems?: string | null;
  vendorName?: string | null; invoicePath?: string | null;
  customer?: { id: number; name: string } | null;
  createdBy?: { id: number; fullName: string } | null;
  // Shipment/Receipt
  invoiceType: string; driverName?: string | null;
  departureTime?: string | null; confirmedAt?: string | null; confirmedByName?: string | null;
}

type ItemType = "PREFORM" | "CAP" | "OTHER";
type SRItem = { id: string; itemType: ItemType; description: string; color: string; quantity: string; unitPrice: string };
type CreateType = "REGULAR" | "SHIPMENT" | "RECEIPT";
type Tab = "ALL" | "SHIPMENT" | "RECEIPT" | "REGULAR";

type RegularForm  = { customerName: string; invoiceNumber: string; totalAmount: string; dueDate: string };
type SRForm = {
  invoiceNumber: string; customerName: string; currency: string;
  driverName: string; departureDate: string; departureTime: string;
  notes: string; items: SRItem[];
};
type EditForm = {
  invoiceNumber: string; customerName: string; vendorName: string;
  dueDate: string; issueDate: string; totalAmount: string;
  currency: string; notes: string; driverName: string; departureTime: string;
};

/* ─── Constants ───────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  PAID:    { label: "Paid",    labelAr: "مدفوع", color: "#059669", bg: "#d1fae5", icon: CheckCircle },
  PENDING: { label: "Pending", labelAr: "معلق",  color: "#d97706", bg: "#fef3c7", icon: Clock },
  OVERDUE: { label: "Overdue", labelAr: "متأخر", color: "#dc2626", bg: "#fee2e2", icon: AlertCircle },
};
const ITEM_TYPES: { value: ItemType; en: string; ar: string }[] = [
  { value: "PREFORM", en: "Preform", ar: "براعم" },
  { value: "CAP",     en: "Cap",     ar: "غطاء" },
  { value: "OTHER",   en: "Other",   ar: "أخرى" },
];
const CURRENCIES = ["ILS", "USD", "EUR", "GBP", "SAR", "AED", "JOD", "EGP"];
const emptyRegular = (): RegularForm  => ({ customerName: "", invoiceNumber: "", totalAmount: "", dueDate: "" });
const emptySR = (): SRForm => ({ invoiceNumber: "", customerName: "", currency: "ILS", driverName: "", departureDate: "", departureTime: "", notes: "", items: [{ id: uid(), itemType: "PREFORM", description: "", color: "", quantity: "0", unitPrice: "0" }] });
const inputCls: React.CSSProperties = { padding: ".42rem .65rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", fontSize: ".875rem", color: "var(--text-primary)", width: "100%", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)" };

/* ─── Component ───────────────────────────────────────────── */
export default function InvoiceManagement() {
  const { locale } = useLocale();
  const { user }   = useAuth();
  const isAdmin    = user?.role === "ADMIN";
  const t = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [tab,      setTab]      = useState<Tab>("ALL");

  /* Create modal */
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [regForm,    setRegForm]    = useState<RegularForm>(emptyRegular());
  const [srForm,     setSrForm]     = useState<SRForm>(emptySR());
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState("");

  /* Edit modal */
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [editForm,   setEditForm]   = useState<EditForm>({ invoiceNumber: "", customerName: "", vendorName: "", dueDate: "", issueDate: "", totalAmount: "", currency: "ILS", notes: "", driverName: "", departureTime: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  /* Confirm */
  const [confirming, setConfirming] = useState<number | null>(null);

  /* File upload */
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  /* Sales reconciliation */
  const [salesTotal, setSalesTotal] = useState<number | null>(null);

  useEffect(() => {
    void fetchInvoices();
    void fetch(`${API_BASE_URL}/sales/all`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: Array<{ totalAmount?: number }>) => {
        setSalesTotal(Array.isArray(d) ? d.reduce((s, x) => s + (x.totalAmount ?? 0), 0) : 0);
      })
      .catch(() => {});
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/invoices");
      if (res.ok) { const d = await res.json(); setInvoices(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  /* ── Line item helpers ── */
  const addSRItem  = () => setSrForm(f => ({ ...f, items: [...f.items, { id: uid(), itemType: "PREFORM", description: "", color: "", quantity: "0", unitPrice: "0" }] }));
  const removeSRItem = (id: string) => setSrForm(f => ({ ...f, items: f.items.filter(i => i.id !== id) }));
  const patchSRItem = (id: string, patch: Partial<SRItem>) => setSrForm(f => ({ ...f, items: f.items.map(i => i.id === id ? { ...i, ...patch } : i) }));

  const srTotal = srForm.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  /* ── Create invoice ── */
  async function handleCreate() {
    setCreating(true); setCreateErr("");
    try {
      if (createType === "REGULAR") {
        if (!regForm.customerName.trim() || !regForm.invoiceNumber.trim() || !regForm.totalAmount || !regForm.dueDate)
          throw new Error(t("All fields are required", "جميع الحقول مطلوبة"));
        const res = await apiFetch("/invoices", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerName: regForm.customerName.trim(), invoiceNumber: regForm.invoiceNumber.trim(), totalAmount: parseFloat(regForm.totalAmount), dueDate: regForm.dueDate, invoiceType: "REGULAR", currency: "ILS" }),
        });
        if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "Failed"); }
      } else {
        if (!srForm.invoiceNumber.trim() || !srForm.customerName.trim() || !srForm.driverName.trim() || !srForm.departureDate)
          throw new Error(t("Invoice #, customer, driver and departure date are required", "رقم الفاتورة والعميل والسائق وتاريخ المغادرة مطلوبة"));
        if (srTotal <= 0) throw new Error(t("Add at least one item with a price > 0", "أضف بنداً واحداً على الأقل بسعر > 0"));

        const departureISO = srForm.departureDate
          ? `${srForm.departureDate}T${srForm.departureTime || "00:00"}:00`
          : undefined;
        const lineItemsJson = JSON.stringify(
          srForm.items.filter(i => parseFloat(i.quantity) > 0).map(i => ({
            itemType: i.itemType,
            description: i.description || (i.itemType === "PREFORM" ? "Preform" : i.itemType === "CAP" ? "Cap" : "Item"),
            color: i.color,
            quantity: parseFloat(i.quantity) || 0,
            unitPrice: parseFloat(i.unitPrice) || 0,
            total: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
          }))
        );
        const res = await apiFetch("/invoices", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: srForm.customerName.trim(),
            invoiceNumber: srForm.invoiceNumber.trim(),
            totalAmount: srTotal,
            dueDate: srForm.departureDate,
            invoiceType: createType,
            currency: srForm.currency,
            driverName: srForm.driverName.trim(),
            departureTime: departureISO,
            lineItems: lineItemsJson,
            notes: srForm.notes.trim() || undefined,
          }),
        });
        if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "Failed"); }
      }

      setCreateType(null);
      setRegForm(emptyRegular());
      setSrForm(emptySR());
      void fetchInvoices();
    } catch (e) { setCreateErr(e instanceof Error ? e.message : "Failed"); }
    finally { setCreating(false); }
  }

  /* ── Edit invoice ── */
  function openEdit(inv: Invoice) {
    setEditTarget(inv);
    const depTime = inv.departureTime ? new Date(inv.departureTime).toISOString().slice(0, 16) : "";
    setEditForm({
      invoiceNumber: inv.invoiceNumber, customerName: inv.customer?.name ?? "",
      vendorName: inv.vendorName ?? "", dueDate: isoDate(inv.dueDate),
      issueDate: isoDate(inv.issueDate), totalAmount: String(inv.totalAmount),
      currency: inv.currency ?? "ILS", notes: inv.notes ?? "",
      driverName: inv.driverName ?? "", departureTime: depTime,
    });
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editForm.invoiceNumber.trim() || !editForm.dueDate || !editForm.totalAmount) {
      setEditError(t("Invoice #, due date and amount are required", "رقم الفاتورة والتاريخ والمبلغ مطلوبة")); return;
    }
    setEditSaving(true); setEditError("");
    try {
      const res = await apiFetch(`/invoices/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: editForm.invoiceNumber.trim(),
          customerName: editForm.customerName.trim() || undefined,
          vendorName: editForm.vendorName.trim() || undefined,
          dueDate: editForm.dueDate, issueDate: editForm.issueDate || undefined,
          totalAmount: parseFloat(editForm.totalAmount),
          currency: editForm.currency, notes: editForm.notes.trim() || undefined,
          driverName: editForm.driverName.trim() || undefined,
          departureTime: editForm.departureTime || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "Failed"); }
      setEditTarget(null); void fetchInvoices();
    } catch (e) { setEditError(e instanceof Error ? e.message : "Failed to update"); }
    finally { setEditSaving(false); }
  }

  /* ── Confirm receipt ── */
  async function confirmReceipt(id: number) {
    setConfirming(id);
    try {
      await apiFetch(`/invoices/${id}/confirm`, { method: "PATCH" });
      void fetchInvoices();
    } catch { } finally { setConfirming(null); }
  }

  /* ── Payment ── */
  const handleRecordPayment = async (id: number) => {
    await apiFetch(`/invoices/${id}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus: "PAID" }) });
    void fetchInvoices();
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(t("Delete this invoice?", "حذف هذه الفاتورة؟"), { danger: true }))) return;
    await apiFetch(`/invoices/${id}`, { method: "DELETE" });
    void fetchInvoices();
  };

  /* ── Upload invoice file ── */
  const triggerUpload = (id: number) => {
    uploadTargetId.current = id;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = uploadTargetId.current;
    if (!file || !id) return;
    e.target.value = "";
    setUploading(id);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(`/invoices/${id}/upload`, { method: "PATCH", body });
      if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "Upload failed"); }
      void fetchInvoices();
    } catch { }
    finally { setUploading(null); }
  };

  const normalizeFilePath = (value: string | null | undefined) => {
    if (!value) return null;
    if (value.startsWith("http")) return value;
    const filename = value.replace(/^(?:prisma\/?)?pictures\//, "");
    return `${API_BASE_URL}/pictures/${filename}`;
  };

  /* ── Filtered list ── */
  const isOverdue = (dueDate: string, status: string) => new Date(dueDate) < new Date() && status !== "PAID";
  const filtered = invoices
    .filter(i => tab === "ALL" || i.invoiceType === tab)
    .filter(i => !search || i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || (i.customer?.name ?? "").toLowerCase().includes(search.toLowerCase()) || (i.driverName ?? "").toLowerCase().includes(search.toLowerCase()));

  /* ── KPIs ── */
  const total    = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const shipCount = invoices.filter(i => i.invoiceType === "SHIPMENT").length;
  const unconfirmed = invoices.filter(i => i.invoiceType === "RECEIPT" && !i.confirmedAt).length;
  const confirmed   = invoices.filter(i => i.invoiceType === "RECEIPT" && !!i.confirmedAt).length;
  const aiPending   = invoices.filter(i => i.aiExtracted).length;

  const fmtMoney = (n: number, cur?: string | null) => {
    const c = cur ?? "ILS";
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n); }
    catch { return `${c} ${n.toLocaleString()}`; }
  };

  const StatusBadge = ({ status, dueDate }: { status: string; dueDate: string }) => {
    const overdue = isOverdue(dueDate, status);
    const key = overdue && status !== "PAID" ? "OVERDUE" : status;
    const meta = STATUS_META[key] ?? STATUS_META.PENDING;
    const Icon = meta.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
        <Icon size={10} />{locale === "ar" ? meta.labelAr : meta.label}
      </span>
    );
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const cfg: Record<string, { label: string; labelAr: string; color: string; icon: React.ReactNode }> = {
      SHIPMENT: { label: "Shipment", labelAr: "شحن",     color: "#0ea5e9", icon: <Truck size={9} /> },
      RECEIPT:  { label: "Receipt",  labelAr: "استلام",   color: "#8b5cf6", icon: <PackageCheck size={9} /> },
      REGULAR:  { label: "Invoice",  labelAr: "فاتورة",   color: "#6b7280", icon: <FileText size={9} /> },
    };
    const c = cfg[type] ?? cfg.REGULAR;
    return (
      <span style={{ padding: ".15rem .45rem", borderRadius: 999, fontSize: ".65rem", fontWeight: 700, background: `${c.color}18`, color: c.color, display: "inline-flex", alignItems: "center", gap: ".2rem" }}>
        {c.icon}{locale === "ar" ? c.labelAr : c.label}
      </span>
    );
  };

  /* ──────────────────── RENDER ──────────────────── */
  return (
    <ModulePageShell
      title={t("Invoice Management", "إدارة الفواتير")}
      subtitle={t("Shipment invoices, receipt confirmations, and billing", "فواتير الشحن والاستلام والفوترة")}
      icon={<FileText size={22} />}
    >
      {/* Hidden file input for invoice attachment */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => void handleFileSelected(e)} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: t("Total Value",  "إجمالي القيمة"),         value: fmtMoney(total, "ILS"), color: "#3b82f6", bg: "#dbeafe", icon: "💰" },
          { label: t("Shipments",    "فواتير الشحن"),           value: shipCount,              color: "#0ea5e9", bg: "#e0f2fe", icon: "🚚" },
          { label: t("Pending Receipts", "استلامات بانتظار"),   value: unconfirmed,            color: "#d97706", bg: "#fef3c7", icon: "📥" },
          { label: t("Confirmed",    "مؤكد"),                   value: confirmed,              color: "#059669", bg: "#d1fae5", icon: "✅" },
          { label: t("AI — Review",  "AI — مراجعة"),            value: aiPending,              color: "#6366f1", bg: "rgba(99,102,241,.1)", icon: "🤖" },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{k.icon}</div>
            <div><p className="text-xs font-medium leading-tight" style={{ color: "var(--text-secondary)" }}>{k.label}</p><p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p></div>
          </Card>
        ))}
      </div>

      {/* Sales vs Invoices reconciliation */}
      {salesTotal !== null && (() => {
        const invoicedTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const diff = salesTotal - invoicedTotal;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-secondary)" }}>{t("Total Sales", "إجمالي المبيعات")}</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#3b82f6" }}>{fmtMoney(salesTotal, "ILS")}</span>
              <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>{t("from sales records", "من سجلات المبيعات")}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-secondary)" }}>{t("Total Invoiced", "إجمالي الفواتير")}</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#8b5cf6" }}>{fmtMoney(invoicedTotal, "ILS")}</span>
              <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>{t("from invoices", "من الفواتير")}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-secondary)" }}>{t("Difference", "الفارق")}</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 900, color: diff >= 0 ? "#ef4444" : "#10b981" }}>{diff >= 0 ? "+" : ""}{fmtMoney(diff, "ILS")}</span>
              <span style={{ fontSize: ".72rem", color: "var(--text-secondary)" }}>
                {diff > 0 ? t("uninvoiced sales", "مبيعات غير مفوترة") : diff < 0 ? t("over-invoiced", "فواتير تفوق المبيعات") : t("balanced", "متوازن")}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div style={{ display: "flex", gap: ".35rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-default)", paddingBottom: ".6rem" }}>
        {(["ALL", "SHIPMENT", "RECEIPT", "REGULAR"] as Tab[]).map(tb => {
          const lbl = { ALL: t("All","الكل"), SHIPMENT: t("Shipment","شحن"), RECEIPT: t("Receipt","استلام"), REGULAR: t("Regular","عادي") }[tb];
          const active = tab === tb;
          return (
            <button key={tb} type="button" onClick={() => setTab(tb)}
              style={{ padding: ".3rem .85rem", borderRadius: "var(--radius-lg)", border: active ? "1.5px solid #6366f1" : "1px solid var(--border-default)", background: active ? "rgba(99,102,241,.08)" : "var(--bg-surface)", color: active ? "#6366f1" : "var(--text-secondary)", fontWeight: active ? 700 : 500, fontSize: ".82rem", cursor: "pointer" }}>
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={13} style={{ position: "absolute", top: "50%", insetInlineStart: 9, transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="input h-8 text-sm" style={{ paddingInlineStart: "1.7rem", width: 180 }}
            placeholder={t("Search…", "بحث…")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <Button size="sm" style={{ background: "#0ea5e9" }} onClick={() => { setSrForm(emptySR()); setCreateErr(""); setCreateType("SHIPMENT"); }}>
          <Truck size={13} className="me-1" />{t("+ Shipment", "+ فاتورة شحن")}
        </Button>
        <Button size="sm" style={{ background: "#8b5cf6" }} onClick={() => { setSrForm(emptySR()); setCreateErr(""); setCreateType("RECEIPT"); }}>
          <PackageCheck size={13} className="me-1" />{t("+ Receipt", "+ استلام")}
        </Button>
      </div>

      {/* Invoice grid */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center" style={{ color: "var(--text-secondary)" }}>
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("No invoices found", "لا توجد فواتير")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inv => {
            const overdue = isOverdue(inv.dueDate, inv.paymentStatus);
            const statusKey = overdue && inv.paymentStatus !== "PAID" ? "OVERDUE" : inv.paymentStatus;
            const meta = STATUS_META[statusKey] ?? STATUS_META.PENDING;
            const isReceipt = inv.invoiceType === "RECEIPT";
            const isConfirmed = !!inv.confirmedAt;
            let items: { itemType?: string; color?: string; quantity: number; description?: string }[] = [];
            try { if (inv.lineItems) items = JSON.parse(inv.lineItems) as typeof items; } catch { /**/ }

            return (
              <Card key={inv.id} className="p-0 overflow-hidden flex flex-col"
                style={{ border: isReceipt && !isConfirmed ? "2px solid rgba(139,92,246,.4)" : inv.aiExtracted ? "2px solid rgba(99,102,241,.3)" : undefined }}>

                {/* Card header */}
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "10px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".5rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap", marginBottom: ".25rem" }}>
                      <p style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{inv.invoiceNumber}</p>
                      <TypeBadge type={inv.invoiceType} />
                      {inv.aiExtracted && <span style={{ padding: ".1rem .4rem", borderRadius: 999, fontSize: ".62rem", fontWeight: 700, background: "rgba(99,102,241,.12)", color: "#6366f1", display: "inline-flex", alignItems: "center", gap: ".15rem" }}><Sparkles size={8} />AI</span>}
                    </div>
                    <StatusBadge status={inv.paymentStatus} dueDate={inv.dueDate} />
                  </div>
                  {!isAdmin && (
                    <div style={{ display: "flex", alignItems: "center", gap: ".2rem", flexShrink: 0 }}>
                      <button title={t("Edit","تعديل")} onClick={() => openEdit(inv)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", borderRadius: 6 }}><Edit3 size={13} /></button>
                      <button title={t("Delete","حذف")} onClick={() => handleDelete(inv.id)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#ef4444", borderRadius: 6 }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  {inv.customer?.name && (
                    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".83rem" }}>
                      <User size={11} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{inv.customer.name}</span>
                    </div>
                  )}
                  {inv.driverName && (
                    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".8rem", color: "var(--text-secondary)" }}>
                      <Truck size={11} style={{ flexShrink: 0 }} />
                      {t("Driver:", "السائق:")} <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.driverName}</span>
                    </div>
                  )}
                  {inv.departureTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                      <Clock size={10} style={{ flexShrink: 0 }} />
                      {fmtDateTime(inv.departureTime)}
                    </div>
                  )}
                  {items.length > 0 && (
                    <div style={{ fontSize: ".78rem", color: "var(--text-secondary)", background: "var(--bg-surface)", borderRadius: 8, padding: ".4rem .6rem", border: "1px solid var(--border-default)" }}>
                      {items.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}>
                          <span>{item.description || item.itemType}{item.color ? ` · ${item.color}` : ""}</span>
                          <span style={{ fontWeight: 700, flexShrink: 0 }}>{item.quantity.toLocaleString()} {t("pcs", "قطعة")}</span>
                        </div>
                      ))}
                      {items.length > 3 && <p style={{ margin: ".2rem 0 0", color: "var(--text-secondary)" }}>+{items.length - 3} {t("more", "أخرى")}</p>}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".9rem" }}>
                    <DollarSign size={12} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 800, color: meta.color }}>{fmtMoney(inv.totalAmount, inv.currency)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".78rem", color: "var(--text-secondary)" }}>
                    <Calendar size={10} style={{ flexShrink: 0 }} />
                    {t("Due:", "الاستحقاق:")} {new Date(inv.dueDate).toLocaleDateString()}
                  </div>
                  {isConfirmed && (
                    <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".75rem", color: "#059669", fontWeight: 700, background: "#d1fae5", borderRadius: 8, padding: ".3rem .55rem" }}>
                      <CheckCircle size={11} />
                      {t("Confirmed by", "أكّده")} {inv.confirmedByName} · {new Date(inv.confirmedAt!).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div style={{ borderTop: "1px solid var(--border-default)", padding: ".5rem .75rem", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  {isReceipt && !isConfirmed ? (
                    <button disabled={confirming === inv.id} onClick={() => void confirmReceipt(inv.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".3rem", padding: ".4rem", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, fontSize: ".78rem", fontWeight: 700, cursor: confirming === inv.id ? "default" : "pointer" }}>
                      {confirming === inv.id ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: "#fff", borderTopColor: "transparent" }} /></> : <><PackageCheck size={12} />{t("Confirm Receipt", "تأكيد الاستلام")}</>}
                    </button>
                  ) : !isAdmin && inv.paymentStatus !== "PAID" ? (
                    <button onClick={() => handleRecordPayment(inv.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".3rem", padding: ".4rem", background: "#d1fae5", color: "#059669", border: "none", borderRadius: 8, fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>
                      <CheckCircle size={12} />{t("Mark Paid", "تسجيل الدفع")}
                    </button>
                  ) : null}
                  {/* Attach / View invoice file */}
                  {inv.invoicePath ? (
                    <a href={normalizeFilePath(inv.invoicePath) ?? "#"} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: ".25rem", padding: ".4rem .65rem", background: "rgba(99,102,241,.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,.25)", borderRadius: 8, fontSize: ".76rem", fontWeight: 700, textDecoration: "none" }}>
                      <ExternalLink size={11} />{t("View File", "عرض الملف")}
                    </a>
                  ) : null}
                  <button disabled={uploading === inv.id} onClick={() => triggerUpload(inv.id)}
                    title={t("Attach invoice document", "إرفاق مستند الفاتورة")}
                    style={{ display: "flex", alignItems: "center", gap: ".25rem", padding: ".4rem .65rem", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: ".76rem", fontWeight: 600, cursor: uploading === inv.id ? "default" : "pointer" }}>
                    {uploading === inv.id ? <div className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> : <Paperclip size={11} />}
                    {inv.invoicePath ? t("Replace", "تغيير") : t("Attach", "إرفاق")}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══ Create Modal ══ */}
      {createType && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setCreateType(null)}>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: createType === "REGULAR" ? 480 : 760, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".75rem" }}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-lg)", background: createType === "SHIPMENT" ? "#e0f2fe" : createType === "RECEIPT" ? "rgba(139,92,246,.1)" : "rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {createType === "SHIPMENT" ? <Truck size={16} style={{ color: "#0ea5e9" }} /> : createType === "RECEIPT" ? <PackageCheck size={16} style={{ color: "#8b5cf6" }} /> : <FileText size={16} style={{ color: "#6366f1" }} />}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>
                  {createType === "SHIPMENT" ? t("New Shipment Invoice", "فاتورة شحن جديدة") : createType === "RECEIPT" ? t("New Receipt Invoice", "فاتورة استلام جديدة") : t("New Invoice", "فاتورة جديدة")}
                </p>
                <p style={{ margin: 0, fontSize: ".74rem", color: "var(--text-secondary)" }}>
                  {createType === "SHIPMENT" ? t("Goods out — preforms, caps, color, qty, driver", "بضاعة صادرة — براعم، أغطية، لون، كمية، سائق") : createType === "RECEIPT" ? t("Goods in — confirm when received", "بضاعة واردة — يتم التأكيد عند الاستلام") : t("Standard invoice", "فاتورة عادية")}
                </p>
              </div>
              <button type="button" onClick={() => setCreateType(null)} style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

              {createType === "REGULAR" ? (
                /* Regular form */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                  {[
                    { label: t("Customer *","العميل *"), key: "customerName" as const, type: "text", placeholder: t("Customer name","اسم العميل") },
                    { label: t("Invoice # *","رقم الفاتورة *"), key: "invoiceNumber" as const, type: "text", placeholder: "INV-001" },
                    { label: t("Amount (ILS) *","المبلغ (شيقل) *"), key: "totalAmount" as const, type: "number", placeholder: "0.00" },
                    { label: t("Due Date *","تاريخ الاستحقاق *"), key: "dueDate" as const, type: "date", placeholder: "" },
                  ].map(f => (
                    <label key={f.key} style={labelStyle}>
                      {f.label}
                      <input type={f.type} placeholder={f.placeholder} style={inputCls} value={regForm[f.key]}
                        onChange={e => setRegForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    </label>
                  ))}
                </div>
              ) : (
                /* Shipment / Receipt form */
                <>
                  {/* Header row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" }}>
                    <label style={labelStyle}>{t("Invoice # *","رقم الفاتورة *")}<input style={inputCls} placeholder="SHP-001" value={srForm.invoiceNumber} onChange={e => setSrForm(f => ({ ...f, invoiceNumber: e.target.value }))} /></label>
                    <label style={labelStyle}>{t("Customer *","العميل *")}<input style={inputCls} placeholder={t("Customer name","اسم العميل")} value={srForm.customerName} onChange={e => setSrForm(f => ({ ...f, customerName: e.target.value }))} /></label>
                    <label style={labelStyle}>{t("Currency","العملة")}
                      <select style={inputCls} value={srForm.currency} onChange={e => setSrForm(f => ({ ...f, currency: e.target.value }))}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" }}>
                    <label style={labelStyle}>{t("Driver Name *","اسم السائق *")}<input style={inputCls} placeholder={t("Driver","السائق")} value={srForm.driverName} onChange={e => setSrForm(f => ({ ...f, driverName: e.target.value }))} /></label>
                    <label style={labelStyle}>{t("Departure Date *","تاريخ المغادرة *")}<input type="date" style={inputCls} value={srForm.departureDate} onChange={e => setSrForm(f => ({ ...f, departureDate: e.target.value }))} /></label>
                    <label style={labelStyle}>{t("Departure Time","وقت المغادرة")}<input type="time" style={inputCls} value={srForm.departureTime} onChange={e => setSrForm(f => ({ ...f, departureTime: e.target.value }))} /></label>
                  </div>

                  {/* Line items */}
                  <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                    <div style={{ padding: ".6rem 1rem", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, fontSize: ".85rem" }}>{t("Items (Preforms / Caps)","البنود (براعم / أغطية)")}</span>
                      <button type="button" onClick={addSRItem} style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".25rem .65rem", background: "rgba(99,102,241,.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,.25)", borderRadius: 8, fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>
                        <Plus size={12} />{t("Add","إضافة")}
                      </button>
                    </div>
                    <div style={{ padding: ".6rem" }}>
                      {/* Column headers */}
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 90px 110px 30px", gap: ".4rem", padding: "0 .2rem .3rem", marginBottom: ".2rem" }}>
                        {[t("Type","النوع"), t("Color","اللون"), t("Qty (pcs)","الكمية"), t("Unit Price","سعر الوحدة"), t("Total","الإجمالي"), ""].map((h, i) => (
                          <span key={i} style={{ fontSize: ".68rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</span>
                        ))}
                      </div>
                      {srForm.items.map(item => {
                        const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                        return (
                          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 110px 100px 30px", gap: ".4rem", marginBottom: ".4rem", alignItems: "center" }}>
                            <select style={{ ...inputCls, padding: ".38rem .5rem" }} value={item.itemType} onChange={e => patchSRItem(item.id, { itemType: e.target.value as ItemType })}>
                              {ITEM_TYPES.map(it => <option key={it.value} value={it.value}>{locale === "ar" ? it.ar : it.en}</option>)}
                            </select>
                            <input style={inputCls} placeholder={t("Color, e.g. Natural","اللون مثلاً طبيعي")} value={item.color} onChange={e => patchSRItem(item.id, { color: e.target.value })} />
                            <input type="number" min={0} style={{ ...inputCls, textAlign: "center" }} value={item.quantity} onChange={e => patchSRItem(item.id, { quantity: e.target.value })} />
                            <input type="number" min={0} step="0.01" style={{ ...inputCls, textAlign: "end" }} value={item.unitPrice} onChange={e => patchSRItem(item.id, { unitPrice: e.target.value })} />
                            <div style={{ padding: ".38rem .6rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontSize: ".85rem", fontWeight: 700, textAlign: "end" }}>
                              {lineTotal.toFixed(2)}
                            </div>
                            <button type="button" disabled={srForm.items.length === 1} onClick={() => removeSRItem(item.id)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: srForm.items.length === 1 ? "default" : "pointer", color: srForm.items.length === 1 ? "var(--border-default)" : "#ef4444", borderRadius: 6 }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: ".5rem", padding: ".5rem .2rem 0", borderTop: "1px solid var(--border-default)", marginTop: ".3rem" }}>
                        <span style={{ fontSize: ".85rem", fontWeight: 700 }}>{t("Total","الإجمالي")}</span>
                        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#6366f1" }}>{srForm.currency} {srTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <label style={labelStyle}>{t("Notes","ملاحظات")}<textarea rows={2} style={{ ...inputCls, resize: "vertical" }} value={srForm.notes} onChange={e => setSrForm(f => ({ ...f, notes: e.target.value }))} /></label>
                </>
              )}

              {createErr && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".55rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{createErr}
                </div>
              )}

              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".5rem", borderTop: "1px solid var(--border-default)" }}>
                <button type="button" disabled={creating} onClick={() => void handleCreate()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".65rem 1rem", background: creating ? "var(--bg-surface)" : createType === "SHIPMENT" ? "#0ea5e9" : createType === "RECEIPT" ? "#8b5cf6" : "#6366f1", color: creating ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".9rem", cursor: creating ? "default" : "pointer" }}>
                  {creating ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t("Saving…","جارٍ الحفظ…")}</> : <><Save size={14} />{t("Save Invoice","حفظ الفاتورة")}</>}
                </button>
                <button type="button" onClick={() => setCreateType(null)} style={{ padding: ".65rem 1rem", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", fontWeight: 600, fontSize: ".875rem", cursor: "pointer" }}>{t("Cancel","إلغاء")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Modal ══ */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setEditTarget(null)}>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".75rem" }}>
              <Edit3 size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{t("Edit Invoice","تعديل الفاتورة")}</p>
                {editTarget.aiExtracted && <p style={{ margin: 0, fontSize: ".73rem", color: "#6366f1", display: "flex", alignItems: "center", gap: ".2rem" }}><Sparkles size={10} />{t("AI-extracted — verify all fields","مستخرج بالذكاء الاصطناعي — يرجى التحقق")}</p>}
              </div>
              <button type="button" onClick={() => setEditTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: ".875rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <label style={labelStyle}>{t("Invoice # *","رقم الفاتورة *")}<input style={inputCls} value={editForm.invoiceNumber} onChange={e => setEditForm(f => ({ ...f, invoiceNumber: e.target.value }))} /></label>
                <label style={labelStyle}>{t("Currency","العملة")}
                  <select style={inputCls} value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>{t("Issue Date","تاريخ الإصدار")}<input type="date" style={inputCls} value={editForm.issueDate} onChange={e => setEditForm(f => ({ ...f, issueDate: e.target.value }))} /></label>
                <label style={labelStyle}>{t("Due Date *","الاستحقاق *")}<input type="date" style={inputCls} value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} /></label>
                <label style={labelStyle}>{t("Customer","العميل")}<input style={inputCls} value={editForm.customerName} onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))} /></label>
                <label style={labelStyle}>{t("Vendor","المورّد")}<input style={inputCls} value={editForm.vendorName} onChange={e => setEditForm(f => ({ ...f, vendorName: e.target.value }))} /></label>
                {(editTarget.invoiceType === "SHIPMENT" || editTarget.invoiceType === "RECEIPT") && (
                  <>
                    <label style={labelStyle}>{t("Driver Name","السائق")}<input style={inputCls} value={editForm.driverName} onChange={e => setEditForm(f => ({ ...f, driverName: e.target.value }))} /></label>
                    <label style={labelStyle}>{t("Departure Time","وقت المغادرة")}<input type="datetime-local" style={inputCls} value={editForm.departureTime} onChange={e => setEditForm(f => ({ ...f, departureTime: e.target.value }))} /></label>
                  </>
                )}
                <label style={{ ...labelStyle, gridColumn: "1/-1" }}>{t("Total Amount *","المبلغ الإجمالي *")}<input type="number" min="0" step="0.01" style={inputCls} value={editForm.totalAmount} onChange={e => setEditForm(f => ({ ...f, totalAmount: e.target.value }))} /></label>
                <label style={{ ...labelStyle, gridColumn: "1/-1" }}>{t("Notes","ملاحظات")}<textarea rows={2} style={{ ...inputCls, resize: "vertical" }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></label>
              </div>
              {editError && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".55rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{editError}
                </div>
              )}
              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".5rem", borderTop: "1px solid var(--border-default)" }}>
                <button type="button" disabled={editSaving} onClick={() => void saveEdit()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".6rem 1rem", background: editSaving ? "var(--bg-surface)" : "#6366f1", color: editSaving ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".875rem", cursor: editSaving ? "default" : "pointer" }}>
                  {editSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t("Saving…","جارٍ…")}</> : <><Save size={14} />{t("Save","حفظ التعديلات")}</>}
                </button>
                <button type="button" onClick={() => setEditTarget(null)} style={{ padding: ".6rem 1rem", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", fontWeight: 600, fontSize: ".875rem", cursor: "pointer" }}>{t("Cancel","إلغاء")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
