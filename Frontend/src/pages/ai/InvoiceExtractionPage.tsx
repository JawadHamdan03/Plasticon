import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import {
  Sparkles, Upload, FileText, X, CheckCircle, AlertCircle,
  ArrowRight, AlertTriangle, Plus, Trash2, Edit3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type LineItem = { description: string; quantity: number; unitPrice: number; total: number };

type Party = {
  name: string; phone: string; email: string; address: string; taxId: string;
};

type EditableInvoice = {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  currency: string;
  vendor: Party;
  customer: Party;
  items: LineItem[];
  subtotal: number | null;
  tax: number | null;
  taxRate: number | null;
  totalAmount: number | null;
  notes: string;
  paymentTerms: string;
};

type Confidence = Record<string, "high" | "medium" | "low">;
type SavedInvoice = { id: number; invoiceNumber: string; totalAmount: number; currency?: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function authHdr(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHdr(), ...(init?.headers ?? {}) },
    credentials: "include",
  });
}

const fmtMoney = (n: number | null | undefined, cur = "USD") =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", minimumFractionDigits: 2 }).format(n)
    : "—";

const EMPTY_PARTY: Party = { name: "", phone: "", email: "", address: "", taxId: "" };

function emptyInvoice(): EditableInvoice {
  return {
    invoiceNumber: "", date: "", dueDate: "", currency: "ILS",
    vendor: { ...EMPTY_PARTY }, customer: { ...EMPTY_PARTY },
    items: [], subtotal: null, tax: null, taxRate: null,
    totalAmount: null, notes: "", paymentTerms: "",
  };
}

function confColor(c?: "high" | "medium" | "low") {
  if (c === "high")   return "#10b981";
  if (c === "medium") return "#f59e0b";
  return "#ef4444";
}
function confLabel(c?: "high" | "medium" | "low", isAr = false): string {
  if (c === "high")   return isAr ? "دقيق" : "High";
  if (c === "medium") return isAr ? "متوسط" : "Medium";
  return isAr ? "منخفض" : "Low";
}

// Map raw API response → EditableInvoice
function toEditable(raw: Record<string, unknown>): EditableInvoice {
  const p = (obj: unknown): Party => {
    const o = (obj ?? {}) as Record<string, unknown>;
    return {
      name:    String(o.name    ?? ""),
      phone:   String(o.phone   ?? ""),
      email:   String(o.email   ?? ""),
      address: String(o.address ?? ""),
      taxId:   String(o.taxId   ?? ""),
    };
  };
  const items: LineItem[] = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[]).map((i) => ({
        description: String(i.description ?? ""),
        quantity:    Number(i.quantity  ?? 1),
        unitPrice:   Number(i.unitPrice ?? 0),
        total:       Number(i.total     ?? 0),
      }))
    : [];
  return {
    invoiceNumber: String(raw.invoiceNumber ?? ""),
    date:          String(raw.date          ?? ""),
    dueDate:       String(raw.dueDate       ?? ""),
    currency:      String(raw.currency      ?? "ILS"),
    vendor:        p(raw.vendor),
    customer:      p(raw.customer),
    items,
    subtotal:      typeof raw.subtotal    === "number" ? raw.subtotal    : null,
    tax:           typeof raw.tax         === "number" ? raw.tax         : null,
    taxRate:       typeof raw.taxRate     === "number" ? raw.taxRate     : null,
    totalAmount:   typeof raw.totalAmount === "number" ? raw.totalAmount : null,
    notes:         String(raw.notes        ?? ""),
    paymentTerms:  String(raw.paymentTerms ?? ""),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, conf, isAr, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  conf?: "high" | "medium" | "low"; isAr?: boolean;
  type?: "text" | "date" | "number"; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
        <label style={{ fontSize: ".69rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".03em" }}>
          {label}
        </label>
        {conf && (
          <span style={{
            fontSize: ".6rem", fontWeight: 700, padding: ".05rem .35rem",
            borderRadius: 99, background: confColor(conf) + "20", color: confColor(conf),
          }}>
            {confLabel(conf, isAr)}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: ".5rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8,
          background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem",
          outline: "none", width: "100%", boxSizing: "border-box",
          borderColor: conf === "low" ? "#fca5a5" : conf === "medium" ? "#fde68a" : "var(--border-default)",
        }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function InvoiceExtractionPage() {
  const { user }    = useAuth();
  const { locale }  = useLocale();
  const navigate    = useNavigate();
  const isAr        = locale === "ar";
  const canUse      = user?.role === "ACCOUNTANT" || user?.role === "ADMIN";

  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [extracting, setExtracting]   = useState(false);
  const [extractError, setExtractError] = useState("");
  const [invoice, setInvoice]         = useState<EditableInvoice | null>(null);
  const [conf, setConf]               = useState<Confidence>({});
  const [mismatch, setMismatch]       = useState<{ flag: boolean; computed: number | null }>({ flag: false, computed: null });
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [saved, setSaved]             = useState<SavedInvoice | null>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────
  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setExtractError(isAr ? "الملف أكبر من 10 MB" : "File exceeds 10 MB");
      return;
    }
    setFile(f);
    setExtractError("");
    setInvoice(null);
    setSaved(null);
    setSendError("");
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => setPreview(e.target?.result as string);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function clearAll() {
    setFile(null); setPreview(null); setInvoice(null); setConf({});
    setExtractError(""); setSaved(null); setSendError("");
    setMismatch({ flag: false, computed: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Extraction ─────────────────────────────────────────────────────────────
  async function extract() {
    if (!file) return;
    setExtracting(true);
    setExtractError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await apiFetch("/ai/invoice-extract", { method: "POST", body: fd });
      const json = await res.json() as { data?: Record<string, unknown>; confidence?: Confidence; error?: string };

      if (!res.ok) {
        const msg = (json.error ?? "Extraction failed").toLowerCase();
        const isQuota = msg.includes("quota") || msg.includes("billing") || res.status === 429;
        throw new Error(isQuota
          ? (isAr
              ? "تجاوزت الحصة — أضف رصيداً من platform.openai.com/account/billing"
              : "OpenAI quota exceeded — add credits at platform.openai.com/account/billing")
          : (json.error ?? "Extraction failed"));
      }

      if (json.data) {
        setInvoice(toEditable(json.data));
        setConf(json.confidence ?? {});
        setMismatch({
          flag:     !!(json.data._totalMismatch),
          computed: typeof json.data._computedTotal === "number" ? json.data._computedTotal : null,
        });
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  // ── Invoice field helpers ──────────────────────────────────────────────────
  function setField<K extends keyof EditableInvoice>(key: K, val: EditableInvoice[K]) {
    setInvoice((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  function setPartyField(party: "vendor" | "customer", key: keyof Party, val: string) {
    setInvoice((prev) =>
      prev ? { ...prev, [party]: { ...prev[party], [key]: val } } : prev
    );
  }

  function setItem(idx: number, key: keyof LineItem, rawVal: string) {
    setInvoice((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [key]: key === "description" ? rawVal : Number(rawVal) || 0 };
        if (key === "quantity" || key === "unitPrice") {
          updated.total = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
        }
        return updated;
      });
      // Recompute subtotal & total
      const subtotal    = Math.round(items.reduce((s, it) => s + it.total, 0) * 100) / 100;
      const tax         = prev.tax ?? 0;
      const totalAmount = Math.round((subtotal + tax) * 100) / 100;
      return { ...prev, items, subtotal, totalAmount };
    });
  }

  function addItem() {
    setInvoice((prev) =>
      prev ? { ...prev, items: [...prev.items, { description: "", quantity: 1, unitPrice: 0, total: 0 }] } : prev
    );
  }

  function removeItem(idx: number) {
    setInvoice((prev) => {
      if (!prev) return prev;
      const items       = prev.items.filter((_, i) => i !== idx);
      const subtotal    = Math.round(items.reduce((s, it) => s + it.total, 0) * 100) / 100;
      const tax         = prev.tax ?? 0;
      const totalAmount = Math.round((subtotal + tax) * 100) / 100;
      return { ...prev, items, subtotal, totalAmount };
    });
  }

  function recalcTotals() {
    setInvoice((prev) => {
      if (!prev) return prev;
      const subtotal    = Math.round(prev.items.reduce((s, it) => s + it.total, 0) * 100) / 100;
      const tax         = prev.tax ?? 0;
      const totalAmount = Math.round((subtotal + tax) * 100) / 100;
      return { ...prev, subtotal, totalAmount };
    });
  }

  // ── Save to invoices ───────────────────────────────────────────────────────
  async function sendToInvoices() {
    if (!invoice) return;
    setSending(true);
    setSendError("");
    try {
      const total = invoice.totalAmount ?? invoice.subtotal ?? 0;
      if (!invoice.invoiceNumber.trim()) throw new Error(isAr ? "رقم الفاتورة مطلوب" : "Invoice number is required");
      if (total <= 0) throw new Error(isAr ? "المبلغ الإجمالي يجب أن يكون أكبر من صفر" : "Total amount must be greater than 0");

      const fallbackDue = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const body = {
        invoiceNumber:   invoice.invoiceNumber.trim(),
        customerName:    invoice.customer.name.trim() || "Unknown",
        totalAmount:     total,
        subtotal:        invoice.subtotal   ?? undefined,
        taxAmount:       invoice.tax        ?? undefined,
        dueDate:         invoice.dueDate    || fallbackDue,
        issueDate:       invoice.date       || undefined,
        currency:        invoice.currency   || "ILS",
        notes:           invoice.notes      || undefined,
        lineItems:       invoice.items.length ? JSON.stringify(invoice.items) : undefined,
        aiExtracted:     true,
        vendorName:      invoice.vendor.name    || undefined,
        vendorPhone:     invoice.vendor.phone   || undefined,
        vendorEmail:     invoice.vendor.email   || undefined,
        vendorAddress:   invoice.vendor.address || undefined,
        customerPhone:   invoice.customer.phone   || undefined,
        customerEmail:   invoice.customer.email   || undefined,
        customerAddress: invoice.customer.address || undefined,
      };

      const res  = await apiFetch("/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as SavedInvoice & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      setSaved(json);
      setFile(null); setPreview(null); setInvoice(null); setConf({});
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSending(false);
    }
  }

  // ── Access guard ───────────────────────────────────────────────────────────
  if (!canUse) {
    return (
      <ModulePageShell title={isAr ? "استخراج الفواتير بالذكاء الاصطناعي" : "AI Invoice Extraction"} subtitle="">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "1rem", textAlign: "center" }}>
          <Sparkles size={40} style={{ color: "#6366f1", opacity: .5 }} />
          <h2 style={{ margin: 0 }}>{isAr ? "هذه الميزة للمحاسبين والمديرين فقط" : "Accountants & Admins only"}</h2>
        </div>
      </ModulePageShell>
    );
  }

  const cur = invoice?.currency || "ILS";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ModulePageShell
      title={isAr ? "استخراج الفواتير بالذكاء الاصطناعي" : "AI Invoice Extraction"}
      subtitle={isAr
        ? "ارفع الفاتورة، راجع البيانات المستخرجة وعدّلها إن لزم، ثم أرسلها"
        : "Upload an invoice, review & correct the extracted data, then save"}
    >
      {/* ── Success banner ── */}
      {saved && (
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".875rem 1.25rem", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 12, marginBottom: "1.5rem" }}>
          <CheckCircle size={20} style={{ color: "#10b981", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".92rem", color: "#059669" }}>
              {isAr ? "تم الإرسال بنجاح!" : "Sent to Invoices successfully!"}
            </p>
            <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
              {saved.invoiceNumber} — {fmtMoney(saved.totalAmount, saved.currency ?? "ILS")}
            </p>
          </div>
          <button type="button" onClick={() => navigate("/accountant/invoices")}
            style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".45rem .9rem", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>
            {isAr ? "عرض الفواتير" : "View Invoices"} <ArrowRight size={13} />
          </button>
          <button type="button" onClick={() => setSaved(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Upload block ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".6rem" }}>
          <Sparkles size={17} style={{ color: "#6366f1" }} />
          <span style={{ fontWeight: 700, fontSize: ".92rem" }}>{isAr ? "رفع الفاتورة" : "Upload Invoice"}</span>
        </div>
        <div style={{ padding: "1.25rem" }}>
          {!file ? (
            <div
              onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? "#6366f1" : "var(--border-default)"}`, borderRadius: 12, padding: "2.5rem", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(99,102,241,.06)" : "var(--bg-surface)", display: "flex", flexDirection: "column", alignItems: "center", gap: ".75rem" }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={24} style={{ color: "#6366f1" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{isAr ? "اسحب وأفلت الفاتورة هنا" : "Drag & drop invoice here"}</p>
                <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>JPEG · PNG · WebP · PDF — {isAr ? "حد أقصى 10 MB" : "max 10 MB"}</p>
              </div>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: ".75rem 1rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <FileText size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: ".85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                  <button type="button" onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
                </div>
                {preview && <img src={preview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "contain", padding: ".5rem" }} />}
                <div style={{ padding: ".75rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {extractError && (
                    <div style={{ display: "flex", gap: ".4rem", padding: ".6rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, fontSize: ".8rem", color: "#dc2626", fontWeight: 600 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{extractError}</span>
                    </div>
                  )}
                  <button type="button" disabled={extracting} onClick={() => void extract()}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".6rem 1rem", background: extracting ? "var(--bg-surface)" : "#6366f1", color: extracting ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: ".875rem", cursor: extracting ? "default" : "pointer" }}>
                    {extracting
                      ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{isAr ? "جاري الاستخراج..." : "Extracting…"}</>
                      : <><Sparkles size={14} />{isAr ? "استخراج بالذكاء الاصطناعي" : "Extract with AI"}</>}
                  </button>
                  {invoice && (
                    <button type="button" onClick={() => void extract()} disabled={extracting}
                      style={{ width: "100%", padding: ".5rem", background: "transparent", border: "1px solid var(--border-default)", borderRadius: 8, cursor: "pointer", fontSize: ".82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: ".35rem" }}>
                      <Sparkles size={12} />{isAr ? "إعادة الاستخراج" : "Re-extract"}
                    </button>
                  )}
                </div>
              </div>

              {/* Confidence legend */}
              <div style={{ background: "rgba(99,102,241,.04)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 12, padding: "1.25rem" }}>
                <p style={{ margin: "0 0 .75rem", fontWeight: 700, fontSize: ".88rem", color: "#6366f1", display: "flex", alignItems: "center", gap: ".4rem" }}>
                  <Edit3 size={14} /> {isAr ? "تعليمات التحرير" : "How to edit"}
                </p>
                {[
                  { color: "#10b981", label: isAr ? "دقة عالية — تم التعرف بوضوح" : "High — clearly identified" },
                  { color: "#f59e0b", label: isAr ? "دقة متوسطة — راجع الحقل" : "Medium — verify this field" },
                  { color: "#ef4444", label: isAr ? "دقة منخفضة — يحتاج تصحيح" : "Low — needs correction" },
                ].map(({ color, label }) => (
                  <div key={color} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".4rem", fontSize: ".82rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                  </div>
                ))}
                <p style={{ margin: ".75rem 0 0", fontSize: ".8rem", color: "var(--text-muted)" }}>
                  {isAr
                    ? "يمكنك تعديل أي حقل قبل الإرسال. التعديلات محفوظة تلقائياً."
                    : "Every field is editable. Corrections are applied immediately."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Editable extracted form ── */}
      {invoice && (
        <div style={{ background: "var(--bg-card)", border: "2px solid #6366f1", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "rgba(99,102,241,.04)", display: "flex", alignItems: "center", gap: ".6rem" }}>
            <CheckCircle size={17} style={{ color: "#6366f1" }} />
            <span style={{ fontWeight: 700, fontSize: ".92rem" }}>
              {isAr ? "بيانات الفاتورة — راجع وعدّل ثم أرسل" : "Invoice Data — Review, edit, then save"}
            </span>
            <span style={{ marginInlineStart: "auto", padding: ".2rem .6rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: "rgba(99,102,241,.12)", color: "#6366f1" }}>
              <Sparkles size={10} style={{ verticalAlign: "middle", marginBottom: 1 }} /> AI
            </span>
          </div>

          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Mismatch warning */}
            {mismatch.flag && (
              <div style={{ display: "flex", gap: ".5rem", padding: ".75rem 1rem", background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 8, fontSize: ".84rem", color: "#92400e" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, color: "#f59e0b", marginTop: 1 }} />
                <span>
                  {isAr
                    ? `تحذير: الإجمالي المطبوع (${fmtMoney(invoice.totalAmount, cur)}) لا يتطابق مع مجموع البنود (${fmtMoney(mismatch.computed, cur)}). يرجى المراجعة.`
                    : `Warning: Printed total (${fmtMoney(invoice.totalAmount, cur)}) doesn't match items sum (${fmtMoney(mismatch.computed, cur)}). Please verify.`}
                </span>
              </div>
            )}

            {/* ── Header fields ── */}
            <section>
              <p style={{ margin: "0 0 .65rem", fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {isAr ? "معلومات الفاتورة" : "Invoice Information"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: ".75rem" }}>
                <Field label={isAr ? "رقم الفاتورة" : "Invoice #"} value={invoice.invoiceNumber}
                  onChange={(v) => setField("invoiceNumber", v)} conf={conf.invoiceNumber} isAr={isAr}
                  placeholder="e.g. INV-2025-001" />
                <Field label={isAr ? "تاريخ الإصدار" : "Issue Date"} value={invoice.date}
                  onChange={(v) => setField("date", v)} conf={conf.date} isAr={isAr} type="date" />
                <Field label={isAr ? "تاريخ الاستحقاق" : "Due Date"} value={invoice.dueDate}
                  onChange={(v) => setField("dueDate", v)} conf={conf.dueDate} isAr={isAr} type="date" />
                <div style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  <label style={{ fontSize: ".69rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".03em" }}>
                    {isAr ? "العملة" : "Currency"}
                  </label>
                  <select value={invoice.currency} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField("currency", e.target.value)}
                    style={{ padding: ".5rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem" }}>
                    {["ILS","USD","EUR","SAR","AED","EGP","JOD"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Vendor & Customer ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {(["vendor", "customer"] as const).map((party) => (
                <section key={party} style={{ background: "var(--bg-surface)", borderRadius: 10, padding: "1rem", border: "1px solid var(--border-default)" }}>
                  <p style={{ margin: "0 0 .65rem", fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {party === "vendor" ? (isAr ? "المورّد" : "Vendor") : (isAr ? "العميل" : "Customer")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
                    {(["name","phone","email","address","taxId"] as (keyof Party)[]).map((k) => (
                      <Field key={k}
                        label={isAr
                          ? ({ name:"الاسم", phone:"الهاتف", email:"البريد الإلكتروني", address:"العنوان", taxId:"الرقم الضريبي" }[k])
                          : ({ name:"Name", phone:"Phone", email:"Email", address:"Address", taxId:"Tax ID" }[k])}
                        value={invoice[party][k]}
                        onChange={(v) => setPartyField(party, k, v)}
                        isAr={isAr}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* ── Line items ── */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".65rem" }}>
                <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {isAr ? "بنود الفاتورة" : "Line Items"} ({invoice.items.length})
                </p>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <button type="button" onClick={recalcTotals}
                    style={{ padding: ".3rem .7rem", border: "1px solid var(--border-default)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    {isAr ? "إعادة حساب الإجماليات" : "Recalc totals"}
                  </button>
                  <button type="button" onClick={addItem}
                    style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".3rem .7rem", border: "none", borderRadius: 6, background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 700 }}>
                    <Plus size={12} /> {isAr ? "إضافة بند" : "Add item"}
                  </button>
                </div>
              </div>

              <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                      <th style={{ padding: ".5rem .875rem", textAlign: "start", fontWeight: 700 }}>{isAr ? "الوصف" : "Description"}</th>
                      <th style={{ padding: ".5rem .6rem", textAlign: "end", fontWeight: 700, width: 70 }}>{isAr ? "الكمية" : "Qty"}</th>
                      <th style={{ padding: ".5rem .6rem", textAlign: "end", fontWeight: 700, width: 110 }}>{isAr ? "سعر الوحدة" : "Unit Price"}</th>
                      <th style={{ padding: ".5rem .6rem", textAlign: "end", fontWeight: 700, width: 110 }}>{isAr ? "الإجمالي" : "Total"}</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)", fontSize: ".82rem" }}>
                          {isAr ? "لا توجد بنود — أضف يدوياً أو أعد الاستخراج" : "No items — add manually or re-extract"}
                        </td>
                      </tr>
                    )}
                    {invoice.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-default)" }}>
                        <td style={{ padding: ".35rem .875rem" }}>
                          <input value={item.description} onChange={(e) => setItem(i, "description", e.target.value)}
                            style={{ width: "100%", border: "1px solid transparent", borderRadius: 4, padding: ".25rem .4rem", background: "transparent", color: "var(--text-primary)", fontSize: ".84rem" }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")} />
                        </td>
                        <td style={{ padding: ".35rem .6rem", textAlign: "end" }}>
                          <input type="number" min="0" step="1" value={item.quantity}
                            onChange={(e) => setItem(i, "quantity", e.target.value)}
                            style={{ width: 60, border: "1px solid transparent", borderRadius: 4, padding: ".25rem .4rem", background: "transparent", color: "var(--text-primary)", fontSize: ".84rem", textAlign: "end" }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")} />
                        </td>
                        <td style={{ padding: ".35rem .6rem", textAlign: "end" }}>
                          <input type="number" min="0" step="0.01" value={item.unitPrice}
                            onChange={(e) => setItem(i, "unitPrice", e.target.value)}
                            style={{ width: 90, border: "1px solid transparent", borderRadius: 4, padding: ".25rem .4rem", background: "transparent", color: "var(--text-primary)", fontSize: ".84rem", textAlign: "end" }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")} />
                        </td>
                        <td style={{ padding: ".35rem .6rem", textAlign: "end" }}>
                          <input type="number" min="0" step="0.01" value={item.total}
                            onChange={(e) => setItem(i, "total", e.target.value)}
                            style={{ width: 90, border: "1px solid transparent", borderRadius: 4, padding: ".25rem .4rem", background: "transparent", color: "var(--text-primary)", fontSize: ".84rem", fontWeight: 700, textAlign: "end" }}
                            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")} />
                        </td>
                        <td style={{ padding: ".35rem .4rem", textAlign: "center" }}>
                          <button type="button" onClick={() => removeItem(i)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: ".2rem" }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals footer */}
                <div style={{ padding: ".75rem 1rem", background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: ".4rem", alignItems: "flex-end" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: ".5rem 1.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: ".83rem", color: "var(--text-secondary)" }}>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                    <input type="number" min="0" step="0.01" value={invoice.subtotal ?? ""}
                      onChange={(e) => setField("subtotal", e.target.value ? Number(e.target.value) : null)}
                      placeholder="0.00"
                      style={{ width: 110, textAlign: "end", border: "1px solid var(--border-default)", borderRadius: 6, padding: ".3rem .5rem", background: "var(--bg-default)", color: "var(--text-primary)", fontSize: ".84rem" }} />

                    <span style={{ fontSize: ".83rem", color: "var(--text-secondary)" }}>
                      {isAr ? "الضريبة" : "Tax"}{invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}
                    </span>
                    <input type="number" min="0" step="0.01" value={invoice.tax ?? ""}
                      onChange={(e) => {
                        const tax = e.target.value ? Number(e.target.value) : null;
                        setInvoice((p) => p ? { ...p, tax, totalAmount: Math.round(((p.subtotal ?? 0) + (tax ?? 0)) * 100) / 100 } : p);
                      }}
                      placeholder="0.00"
                      style={{ width: 110, textAlign: "end", border: "1px solid var(--border-default)", borderRadius: 6, padding: ".3rem .5rem", background: "var(--bg-default)", color: "var(--text-primary)", fontSize: ".84rem" }} />

                    <span style={{ fontSize: ".9rem", fontWeight: 800 }}>{isAr ? "الإجمالي" : "Total"}</span>
                    <input type="number" min="0" step="0.01" value={invoice.totalAmount ?? ""}
                      onChange={(e) => setField("totalAmount", e.target.value ? Number(e.target.value) : null)}
                      placeholder="0.00"
                      style={{ width: 110, textAlign: "end", border: "2px solid #6366f1", borderRadius: 6, padding: ".3rem .5rem", background: "var(--bg-default)", color: "#6366f1", fontSize: ".9rem", fontWeight: 800 }} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Notes & Payment terms ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { key: "notes" as const, label: isAr ? "ملاحظات" : "Notes" },
                { key: "paymentTerms" as const, label: isAr ? "شروط الدفع" : "Payment Terms" },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  <label style={{ fontSize: ".69rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>
                  <textarea rows={2} value={invoice[key]} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField(key, e.target.value)}
                    style={{ padding: ".5rem .75rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem", resize: "vertical", fontFamily: "inherit" }} />
                </div>
              ))}
            </div>

            {/* ── Send action ── */}
            <div style={{ paddingTop: ".75rem", borderTop: "1px solid var(--border-default)" }}>
              {sendError && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".6rem .75rem", marginBottom: ".75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{sendError}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <button type="button" disabled={sending} onClick={() => void sendToInvoices()}
                  style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".7rem 1.5rem", background: sending ? "var(--bg-surface)" : "#6366f1", color: sending ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: ".9rem", cursor: sending ? "default" : "pointer" }}>
                  {sending
                    ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />{isAr ? "جاري الإرسال..." : "Saving…"}</>
                    : <>{isAr ? "إرسال إلى الفواتير" : "Save to Invoices"} <ArrowRight size={15} /></>}
                </button>
                <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)" }}>
                  {isAr
                    ? "ستظهر بعلامة AI للمراجعة النهائية في إدارة الفواتير"
                    : "Will appear with an AI badge for final review in Invoice Management"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
