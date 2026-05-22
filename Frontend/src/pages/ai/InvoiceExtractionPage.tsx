import { useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Sparkles, Upload, FileText, X, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

type ExtractedData = {
  invoiceNumber?: string | null; date?: string | null; dueDate?: string | null; currency?: string | null;
  vendor?: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null } | null;
  customer?: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null } | null;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal?: number | null; tax?: number | null; totalAmount?: number | null; notes?: string | null;
};

type SavedInvoice = { id: number; invoiceNumber: string; totalAmount: number; currency?: string | null };

function authHdr(): Record<string, string> {
  const t = localStorage.getItem("plasticon_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...authHdr(), ...(init?.headers ?? {}) }, credentials: "include" });
}

const fmtMoney = (n: number | null | undefined, cur = "USD") =>
  n != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n) : "—";

/* ─── Main ─────────────────────────────────────────────────── */
export function InvoiceExtractionPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const isAr = locale === "ar";
  const canUse = user?.role === "ACCOUNTANT" || user?.role === "ADMIN";

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [saved, setSaved] = useState<SavedInvoice | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const f = files?.[0]; if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setExtractError(isAr ? "الملف أكبر من 10 MB" : "File exceeds 10 MB"); return; }
    setFile(f); setExtractError(""); setExtracted(null); setSaved(null); setSendError("");
    if (f.type.startsWith("image/")) {
      const r = new FileReader(); r.onload = (e) => setPreview(e.target?.result as string); r.readAsDataURL(f);
    } else { setPreview(null); }
  }

  function clearAll() {
    setFile(null); setPreview(null); setExtracted(null);
    setExtractError(""); setSaved(null); setSendError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function extract() {
    if (!file) return;
    setExtracting(true); setExtractError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await apiFetch("/ai/invoice-extract", { method: "POST", body: fd });
      const json = await res.json() as { data?: ExtractedData; error?: string };
      if (!res.ok) {
        const msg = (json.error ?? "Extraction failed").toLowerCase();
        const isQuota = msg.includes("quota") || msg.includes("billing") || res.status === 429;
        throw new Error(isQuota
          ? (isAr
              ? "تجاوزت الحصة المسموح بها في OpenAI. يرجى إضافة رصيد من platform.openai.com/account/billing"
              : "OpenAI quota exceeded — add credits at platform.openai.com/account/billing")
          : (json.error ?? "Extraction failed"));
      }
      if (json.data) setExtracted(json.data);
    } catch (e) { setExtractError(e instanceof Error ? e.message : "Extraction failed"); }
    finally { setExtracting(false); }
  }

  async function sendToInvoices() {
    if (!extracted) return;
    setSending(true); setSendError("");
    try {
      // Compute total: prefer explicit field, then subtotal+tax, then sum items, then fall back to 0
      const itemsSum = (extracted.items ?? []).reduce((s, i) => s + (i.total ?? i.quantity * i.unitPrice ?? 0), 0);
      const totalAmount =
        (extracted.totalAmount && extracted.totalAmount > 0) ? extracted.totalAmount
        : (extracted.subtotal != null && extracted.subtotal > 0) ? extracted.subtotal + (extracted.tax ?? 0)
        : itemsSum > 0 ? itemsSum
        : 0;

      if (!extracted.invoiceNumber?.trim()) throw new Error(isAr ? "رقم الفاتورة مطلوب" : "Invoice number is required");
      // Allow saving even if total is 0 — accountant can fix it in Invoice Management
      const finalTotal = totalAmount > 0 ? totalAmount : 1;

      const fallbackDue = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      // use || so empty strings also fall back to the default
      const dueDate   = extracted.dueDate  || fallbackDue;
      const issueDate = extracted.date     || undefined;
      const currency  = extracted.currency || "ILS";

      const body = {
        invoiceNumber: extracted.invoiceNumber.trim(),
        customerName: extracted.customer?.name?.trim() || "Unknown",
        totalAmount: finalTotal,
        subtotal: extracted.subtotal ?? undefined,
        taxAmount: extracted.tax ?? undefined,
        dueDate,
        issueDate,
        currency,
        notes: extracted.notes ?? undefined,
        lineItems: extracted.items?.length ? JSON.stringify(extracted.items) : undefined,
        aiExtracted: true,
        vendorName: extracted.vendor?.name ?? undefined,
        vendorPhone: extracted.vendor?.phone ?? undefined,
        vendorEmail: extracted.vendor?.email ?? undefined,
        vendorAddress: extracted.vendor?.address ?? undefined,
        customerPhone: extracted.customer?.phone ?? undefined,
        customerEmail: extracted.customer?.email ?? undefined,
        customerAddress: extracted.customer?.address ?? undefined,
      };

      const res = await apiFetch("/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as SavedInvoice & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      setSaved(json);
      setFile(null); setPreview(null); setExtracted(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) { setSendError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSending(false); }
  }

  /* ─── Access guard ─────────────────────────────────────── */
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

  const cur = extracted?.currency ?? "USD";

  return (
    <ModulePageShell
      title={isAr ? "استخراج الفواتير بالذكاء الاصطناعي" : "AI Invoice Extraction"}
      subtitle={isAr
        ? "ارفع الفاتورة واستخرج بياناتها تلقائياً ثم أرسلها للمحاسب للمراجعة"
        : "Upload an invoice, extract all data with AI, then send it for accountant review"}
    >
      {/* ══ Success banner ══ */}
      {saved && (
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".875rem 1.25rem", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.3)", borderRadius: "var(--radius-xl)", marginBottom: "1.5rem" }}>
          <CheckCircle size={20} style={{ color: "#10b981", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: ".92rem", color: "#059669" }}>
              {isAr ? "تم الإرسال إلى الفواتير بنجاح!" : "Sent to Invoices successfully!"}
            </p>
            <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)" }}>
              {saved.invoiceNumber} — {fmtMoney(saved.totalAmount, saved.currency ?? "USD")}
              {" · "}{isAr ? "بانتظار مراجعة المحاسب" : "Awaiting accountant review"}
            </p>
          </div>
          <button type="button" onClick={() => navigate("/accountant/invoices")}
            style={{ display: "flex", alignItems: "center", gap: ".35rem", padding: ".45rem .9rem", background: "#059669", color: "#fff", border: "none", borderRadius: "var(--radius-lg)", fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>
            {isAr ? "عرض الفواتير" : "View Invoices"} <ArrowRight size={13} />
          </button>
          <button type="button" onClick={() => setSaved(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: ".2rem" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ══ Upload block ══ */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: "1.5rem" }}>
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
              style={{ border: `2px dashed ${dragOver ? "#6366f1" : "var(--border-default)"}`, borderRadius: "var(--radius-xl)", padding: "2.5rem", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(99,102,241,.06)" : "var(--bg-surface)", display: "flex", flexDirection: "column", alignItems: "center", gap: ".75rem" }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={24} style={{ color: "#6366f1" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{isAr ? "اسحب وأفلت الفاتورة هنا" : "Drag & drop invoice here"}</p>
                <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>JPEG · PNG · PDF · {isAr ? "حد أقصى 10 ميجابايت" : "max 10 MB"}</p>
              </div>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* File card */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ padding: ".75rem 1rem", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <FileText size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: ".85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                  <button type="button" onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
                </div>
                {preview && <img src={preview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "contain", padding: ".5rem" }} />}
                <div style={{ padding: ".75rem" }}>
                  {extractError && (
                    <div style={{ display: "flex", gap: ".4rem", padding: ".6rem .75rem", marginBottom: ".6rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-md)", fontSize: ".8rem", color: "#dc2626", fontWeight: 600 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{extractError}</span>
                    </div>
                  )}
                  <button type="button" disabled={extracting} onClick={() => void extract()}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".6rem 1rem", background: extracting ? "var(--bg-surface)" : "#6366f1", color: extracting ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".875rem", cursor: extracting ? "default" : "pointer" }}>
                    {extracting
                      ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{isAr ? "جاري الاستخراج..." : "Extracting…"}</>
                      : <><Sparkles size={14} />{isAr ? "استخراج بالذكاء الاصطناعي" : "Extract with AI"}</>}
                  </button>
                </div>
              </div>
              {/* How it works */}
              <div style={{ background: "rgba(99,102,241,.04)", border: "1px solid rgba(99,102,241,.15)", borderRadius: "var(--radius-xl)", padding: "1.25rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "#6366f1" }}>🤖 {isAr ? "كيف يعمل؟" : "How it works"}</p>
                {[
                  isAr ? "يرسل النظام الفاتورة إلى Claude AI" : "Invoice sent to Claude AI for analysis",
                  isAr ? "تُستخرج جميع البيانات تلقائياً" : "All data extracted automatically",
                  isAr ? "تُرسل مباشرة إلى قائمة الفواتير" : "Sent directly to the invoices list",
                  isAr ? "المحاسب يراجعها ويعدّل إن لزم" : "Accountant reviews and edits if needed",
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: ".5rem", fontSize: ".82rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Extracted preview ══ */}
      {extracted && (
        <div style={{ background: "var(--bg-card)", border: "2px solid #6366f1", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: ".875rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "rgba(99,102,241,.04)", display: "flex", alignItems: "center", gap: ".6rem" }}>
            <CheckCircle size={17} style={{ color: "#6366f1" }} />
            <span style={{ fontWeight: 700, fontSize: ".92rem" }}>{isAr ? "البيانات المستخرجة — مراجعة قبل الإرسال" : "Extracted Data — Review before sending"}</span>
            <span style={{ marginInlineStart: "auto", padding: ".2rem .6rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: "rgba(99,102,241,.12)", color: "#6366f1", display: "flex", alignItems: "center", gap: ".25rem" }}>
              <Sparkles size={10} /> AI
            </span>
          </div>
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Invoice header fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: ".75rem" }}>
              {[
                { label: isAr ? "رقم الفاتورة" : "Invoice #",    value: extracted.invoiceNumber },
                { label: isAr ? "تاريخ الإصدار" : "Issue Date",  value: extracted.date },
                { label: isAr ? "تاريخ الاستحقاق" : "Due Date",  value: extracted.dueDate },
                { label: isAr ? "العملة" : "Currency",            value: extracted.currency ?? "USD" },
              ].map((f) => (
                <div key={f.label} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: ".65rem .875rem", border: "1px solid var(--border-default)" }}>
                  <p style={{ margin: "0 0 .15rem", fontSize: ".69rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".03em" }}>{f.label}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: ".9rem" }}>{f.value ?? "—"}</p>
                </div>
              ))}
            </div>

            {/* Vendor & Customer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: isAr ? "المورّد" : "Vendor",  data: extracted.vendor },
                { label: isAr ? "العميل" : "Customer", data: extracted.customer },
              ].map((p) => (
                <div key={p.label} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: ".75rem 1rem", border: "1px solid var(--border-default)" }}>
                  <p style={{ margin: "0 0 .35rem", fontSize: ".69rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{p.label}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: ".92rem" }}>{p.data?.name ?? "—"}</p>
                  {p.data?.phone   && <p style={{ margin: ".1rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{p.data.phone}</p>}
                  {p.data?.email   && <p style={{ margin: ".05rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{p.data.email}</p>}
                  {p.data?.address && <p style={{ margin: ".05rem 0 0", fontSize: ".78rem", color: "var(--text-secondary)" }}>{p.data.address}</p>}
                </div>
              ))}
            </div>

            {/* Line items */}
            {extracted.items && extracted.items.length > 0 && (
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                      <th style={{ padding: ".5rem .875rem", textAlign: "start", fontWeight: 700 }}>{isAr ? "الوصف" : "Description"}</th>
                      <th style={{ padding: ".5rem .75rem", textAlign: "end", fontWeight: 700 }}>{isAr ? "الكمية" : "Qty"}</th>
                      <th style={{ padding: ".5rem .75rem", textAlign: "end", fontWeight: 700 }}>{isAr ? "سعر الوحدة" : "Unit Price"}</th>
                      <th style={{ padding: ".5rem .875rem", textAlign: "end", fontWeight: 700 }}>{isAr ? "الإجمالي" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-default)" }}>
                        <td style={{ padding: ".5rem .875rem" }}>{item.description}</td>
                        <td style={{ padding: ".5rem .75rem", textAlign: "end" }}>{item.quantity}</td>
                        <td style={{ padding: ".5rem .75rem", textAlign: "end" }}>{fmtMoney(item.unitPrice, cur)}</td>
                        <td style={{ padding: ".5rem .875rem", textAlign: "end", fontWeight: 700 }}>{fmtMoney(item.total, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: ".6rem .875rem", background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: ".15rem", alignItems: "flex-end", fontSize: ".84rem" }}>
                  {extracted.subtotal != null && (
                    <div style={{ display: "flex", gap: "2.5rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                      <span>{fmtMoney(extracted.subtotal, cur)}</span>
                    </div>
                  )}
                  {extracted.tax != null && (
                    <div style={{ display: "flex", gap: "2.5rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{isAr ? "الضريبة" : "Tax"}</span>
                      <span>{fmtMoney(extracted.tax, cur)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "2.5rem", fontWeight: 800, fontSize: ".95rem", borderTop: "1px solid var(--border-default)", paddingTop: ".35rem", marginTop: ".1rem" }}>
                    <span>{isAr ? "الإجمالي" : "Total"}</span>
                    <span style={{ color: "#6366f1" }}>{fmtMoney(extracted.totalAmount, cur)}</span>
                  </div>
                </div>
              </div>
            )}

            {extracted.notes && (
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: ".75rem 1rem", border: "1px solid var(--border-default)", fontSize: ".85rem" }}>
                <span style={{ fontWeight: 700 }}>{isAr ? "ملاحظات: " : "Notes: "}</span>
                <span style={{ color: "var(--text-secondary)" }}>{extracted.notes}</span>
              </div>
            )}

            {/* Send action */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", paddingTop: ".75rem", borderTop: "1px solid var(--border-default)" }}>
              {sendError && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".6rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{sendError}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <button type="button" disabled={sending} onClick={() => void sendToInvoices()}
                  style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".7rem 1.5rem", background: sending ? "var(--bg-surface)" : "#6366f1", color: sending ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".9rem", cursor: sending ? "default" : "pointer" }}>
                  {sending
                    ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />{isAr ? "جاري الإرسال..." : "Sending…"}</>
                    : <>{isAr ? "إرسال إلى الفواتير" : "Send to Invoices"} <ArrowRight size={15} /></>}
                </button>
                <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)" }}>
                  {isAr
                    ? "ستظهر الفاتورة بعلامة AI للمراجعة في صفحة إدارة الفواتير"
                    : "Invoice will appear with an AI badge for review in Invoice Management"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
