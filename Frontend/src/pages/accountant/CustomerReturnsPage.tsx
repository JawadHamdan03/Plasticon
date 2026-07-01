import { useEffect, useRef, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Plus, Trash2, RotateCcw, Search, AlertCircle, X, Save, Edit3, Paperclip, ExternalLink } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, pictureUrl as globalPictureUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include" });
}
function pdfUrl(filename: string) {
  return globalPictureUrl(filename);
}

const PRODUCT_TYPES = ["CAPS", "PREFORM", "OTHER"] as const;
type ProductType = typeof PRODUCT_TYPES[number];

interface CustomerReturn {
  id: number;
  customerName: string;
  customerId?: number | null;
  productType: ProductType;
  quantity: number;
  returnDate: string;
  notes?: string | null;
  invoicePdf?: string | null;
  recordedById?: number | null;
  customer?: { id: number; name: string } | null;
  recordedBy?: { id: number; fullName: string } | null;
  createdAt: string;
}

type ReturnForm = {
  customerName: string;
  productType: ProductType;
  quantity: string;
  returnDate: string;
  notes: string;
};

const emptyForm = (): ReturnForm => ({
  customerName: "",
  productType: "CAPS",
  quantity: "",
  returnDate: new Date().toISOString().split("T")[0],
  notes: "",
});

const inputCls: React.CSSProperties = {
  padding: ".42rem .65rem",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-card)",
  fontSize: ".875rem",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: ".3rem",
  fontSize: ".82rem", fontWeight: 600, color: "var(--text-secondary)",
};

const PT_META: Record<ProductType, { color: string; bg: string; en: string; ar: string }> = {
  CAPS:    { color: "#0ea5e9", bg: "#e0f2fe", en: "Caps",    ar: "أغطية" },
  PREFORM: { color: "#8b5cf6", bg: "rgba(139,92,246,.1)", en: "Preform", ar: "براعم" },
  OTHER:   { color: "#6b7280", bg: "#f3f4f6", en: "Other",   ar: "أخرى"  },
};

export default function CustomerReturnsPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const t = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [returns, setReturns]     = useState<CustomerReturn[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");
  const [filterType, setFilterType] = useState<ProductType | "ALL">("ALL");

  /* Create */
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<ReturnForm>(emptyForm());
  const [createFile, setCreateFile] = useState<File | null>(null);
  const createFileRef               = useRef<HTMLInputElement>(null);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState("");

  /* Edit */
  const [editTarget, setEditTarget] = useState<CustomerReturn | null>(null);
  const [editForm,   setEditForm]   = useState<ReturnForm>(emptyForm());
  const [editFile,   setEditFile]   = useState<File | null>(null);
  const editFileRef                 = useRef<HTMLInputElement>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr,    setEditErr]    = useState("");

  useEffect(() => { void fetchReturns(); }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/customer-returns");
      if (res.ok) {
        const d = await res.json() as CustomerReturn[];
        setReturns(Array.isArray(d) ? d : []);
      }
    } catch { } finally { setLoading(false); }
  };

  /* Create */
  async function handleCreate() {
    setSaving(true); setSaveErr("");
    try {
      if (!form.customerName.trim()) throw new Error(t("Customer name is required", "اسم العميل مطلوب"));
      if (!form.quantity || Number(form.quantity) <= 0) throw new Error(t("Quantity must be > 0", "الكمية يجب أن تكون > 0"));
      if (!form.returnDate) throw new Error(t("Return date is required", "تاريخ الإرجاع مطلوب"));

      const fd = new FormData();
      fd.append("customerName", form.customerName.trim());
      fd.append("productType", form.productType);
      fd.append("quantity", String(Number(form.quantity)));
      fd.append("returnDate", form.returnDate);
      if (form.notes.trim()) fd.append("notes", form.notes.trim());
      if (createFile) fd.append("invoicePdf", createFile);

      const res = await apiFetch("/customer-returns", { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "فشل"); }
      setShowCreate(false);
      setForm(emptyForm());
      setCreateFile(null);
      void fetchReturns();
    } catch (e) { setSaveErr(e instanceof Error ? e.message : "فشل"); }
    finally { setSaving(false); }
  }

  /* Edit */
  function openEdit(r: CustomerReturn) {
    setEditTarget(r);
    setEditForm({
      customerName: r.customerName,
      productType: r.productType,
      quantity: String(r.quantity),
      returnDate: new Date(r.returnDate).toISOString().split("T")[0],
      notes: r.notes ?? "",
    });
    setEditErr("");
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setEditSaving(true); setEditErr("");
    try {
      if (!editForm.customerName.trim()) throw new Error(t("Customer name is required", "اسم العميل مطلوب"));
      if (!editForm.quantity || Number(editForm.quantity) <= 0) throw new Error(t("Quantity must be > 0", "الكمية يجب أن تكون > 0"));

      const fd = new FormData();
      fd.append("customerName", editForm.customerName.trim());
      fd.append("productType", editForm.productType);
      fd.append("quantity", String(Number(editForm.quantity)));
      fd.append("returnDate", editForm.returnDate);
      fd.append("notes", editForm.notes.trim());
      if (editFile) fd.append("invoicePdf", editFile);

      const res = await apiFetch(`/customer-returns/${editTarget.id}`, { method: "PUT", body: fd });
      if (!res.ok) { const j = await res.json() as { message?: string }; throw new Error(j.message ?? "فشل"); }
      setEditTarget(null);
      setEditFile(null);
      void fetchReturns();
    } catch (e) { setEditErr(e instanceof Error ? e.message : "فشل"); }
    finally { setEditSaving(false); }
  }

  /* Delete */
  async function handleDelete(id: number) {
    if (!(await confirmDialog(t("Delete this return record?", "حذف سجل الإرجاع هذا؟"), { danger: true }))) return;
    await apiFetch(`/customer-returns/${id}`, { method: "DELETE" });
    void fetchReturns();
  }

  /* Filters */
  const filtered = returns.filter(r => {
    if (filterType !== "ALL" && r.productType !== filterType) return false;
    if (search && !r.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* KPIs */
  const totalCaps    = returns.filter(r => r.productType === "CAPS").reduce((s, r) => s + r.quantity, 0);
  const totalPreform = returns.filter(r => r.productType === "PREFORM").reduce((s, r) => s + r.quantity, 0);
  const totalCount   = returns.length;

  const ReturnForm = ({
    f, setF, fileRef, file, onFileChange,
  }: {
    f: ReturnForm;
    setF: (patch: Partial<ReturnForm>) => void;
    fileRef?: { current: HTMLInputElement | null };
    file?: File | null;
    onFileChange?: (f: File | null) => void;
  }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
      <label style={{ ...labelStyle, gridColumn: "1/-1" }}>
        {t("Customer Name *", "اسم العميل *")}
        <input style={inputCls} placeholder={t("Customer name", "اسم العميل")} value={f.customerName} onChange={e => setF({ customerName: e.target.value })} />
      </label>
      <label style={labelStyle}>
        {t("Product Type *", "نوع المنتج *")}
        <select style={inputCls} value={f.productType} onChange={e => setF({ productType: e.target.value as ProductType })}>
          {PRODUCT_TYPES.map(pt => (
            <option key={pt} value={pt}>{PT_META[pt].ar}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        {t("Quantity *", "الكمية *")}
        <input type="number" min={1} step={1} style={inputCls} placeholder="0" value={f.quantity} onChange={e => setF({ quantity: e.target.value })} />
      </label>
      <label style={{ ...labelStyle, gridColumn: "1/-1" }}>
        {t("Return Date *", "تاريخ الإرجاع *")}
        <input type="date" style={inputCls} value={f.returnDate} onChange={e => setF({ returnDate: e.target.value })} />
      </label>
      <label style={{ ...labelStyle, gridColumn: "1/-1" }}>
        {t("Notes", "ملاحظات")}
        <textarea rows={2} style={{ ...inputCls, resize: "vertical" }} placeholder={t("Optional notes…", "ملاحظات اختيارية…")} value={f.notes} onChange={e => setF({ notes: e.target.value })} />
      </label>
      {onFileChange && (
        <label style={{ ...labelStyle, gridColumn: "1/-1" }}>
          {t("Invoice PDF (optional)", "ملف PDF للفاتورة (اختياري)")}
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <button type="button" onClick={() => fileRef?.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".42rem .8rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--text-secondary)", fontSize: ".82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
              <Paperclip size={13} />{t("Attach PDF", "إرفاق PDF")}
            </button>
            <span style={{ fontSize: ".78rem", color: file ? "#16a34a" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file ? file.name : t("No file chosen", "لم يتم اختيار ملف")}
            </span>
            {file && (
              <button type="button" onClick={() => onFileChange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "flex" }}><X size={14} /></button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
            onChange={e => onFileChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );

  return (
    <ModulePageShell
      title={t("Customer Returns", "مرتجعات العملاء")}
      subtitle={t("Track caps and preforms returned by customers", "تتبع الأغطية والبراعم المرجعة من العملاء")}
      icon={<RotateCcw size={22} />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: t("Total Records", "إجمالي السجلات"), value: totalCount, color: "#6366f1", bg: "rgba(99,102,241,.1)", icon: "📋" },
          { label: t("Total Caps",    "إجمالي الأغطية"),  value: totalCaps.toLocaleString(),    color: "#0ea5e9", bg: "#e0f2fe", icon: "🔵" },
          { label: t("Total Preform", "إجمالي البراعم"),  value: totalPreform.toLocaleString(), color: "#8b5cf6", bg: "rgba(139,92,246,.1)", icon: "🟣" },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{k.icon}</div>
            <div>
              <p className="text-xs font-medium leading-tight" style={{ color: "var(--text-secondary)" }}>{k.label}</p>
              <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={13} style={{ position: "absolute", top: "50%", insetInlineStart: 9, transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="input h-8 text-sm" style={{ paddingInlineStart: "1.7rem", width: 180 }}
            placeholder={t("Search customer…", "بحث عن عميل…")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: ".3rem" }}>
          {(["ALL", ...PRODUCT_TYPES] as const).map(pt => {
            const active = filterType === pt;
            const lbl = pt === "ALL" ? t("All", "الكل") : PT_META[pt].ar;
            return (
              <button key={pt} type="button" onClick={() => setFilterType(pt)}
                style={{ padding: ".3rem .75rem", borderRadius: "var(--radius-lg)", border: active ? `1.5px solid ${pt === "ALL" ? "#6366f1" : PT_META[pt].color}` : "1px solid var(--border-default)", background: active ? (pt === "ALL" ? "rgba(99,102,241,.08)" : PT_META[pt].bg) : "var(--bg-surface)", color: active ? (pt === "ALL" ? "#6366f1" : PT_META[pt].color) : "var(--text-secondary)", fontWeight: active ? 700 : 500, fontSize: ".8rem", cursor: "pointer" }}>
                {lbl}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        {!isAdmin && (
          <Button size="sm" onClick={() => { setForm(emptyForm()); setSaveErr(""); setShowCreate(true); }}>
            <Plus size={13} className="me-1" />{t("+ Return", "+ إرجاع جديد")}
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center" style={{ color: "var(--text-secondary)" }}>
          <RotateCcw size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("No return records found", "لا توجد سجلات إرجاع")}</p>
        </Card>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "2px solid var(--border-default)" }}>
                {[
                  t("Customer", "العميل"),
                  t("Product Type", "نوع المنتج"),
                  t("Quantity", "الكمية"),
                  t("Return Date", "تاريخ الإرجاع"),
                  t("Recorded By", "سجّله"),
                  t("Notes", "ملاحظات"),
                  t("PDF", "PDF"),
                  "",
                ].map((h, i) => (
                  <th key={i} style={{ padding: ".55rem .75rem", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)", fontSize: ".76rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const meta = PT_META[r.productType] ?? PT_META.OTHER;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)", background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-surface)" }}>
                    <td style={{ padding: ".5rem .75rem", fontWeight: 600 }}>{r.customerName}</td>
                    <td style={{ padding: ".5rem .75rem" }}>
                      <span style={{ padding: ".2rem .55rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: meta.bg, color: meta.color }}>
                        {meta.ar}
                      </span>
                    </td>
                    <td style={{ padding: ".5rem .75rem", fontWeight: 700, color: meta.color }}>{r.quantity.toLocaleString()}</td>
                    <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)" }}>{new Date(r.returnDate).toLocaleDateString()}</td>
                    <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)", fontSize: ".78rem" }}>{r.recordedBy?.fullName ?? "—"}</td>
                    <td style={{ padding: ".5rem .75rem", color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes ?? "—"}</td>
                    <td style={{ padding: ".5rem .75rem" }}>
                      {r.invoicePdf ? (
                        <a href={pdfUrl(r.invoicePdf)} target="_blank" rel="noreferrer"
                          title={t("View PDF", "عرض PDF")}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".25rem", color: "#6366f1", fontSize: ".76rem", fontWeight: 600, textDecoration: "none" }}>
                          <ExternalLink size={13} />PDF
                        </a>
                      ) : <span style={{ color: "var(--text-secondary)", fontSize: ".76rem" }}>—</span>}
                    </td>
                    <td style={{ padding: ".5rem .75rem" }}>
                      {!isAdmin && (
                        <div style={{ display: "flex", gap: ".3rem", justifyContent: "flex-end" }}>
                          <button title={t("Edit", "تعديل")} onClick={() => openEdit(r)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid var(--border-default)", cursor: "pointer", color: "var(--text-secondary)", borderRadius: 6 }}><Edit3 size={13} /></button>
                          <button title={t("Delete", "حذف")} onClick={() => void handleDelete(r.id)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid rgba(239,68,68,.3)", cursor: "pointer", color: "#ef4444", borderRadius: 6 }}><Trash2 size={13} /></button>
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

      {/* ══ Create Modal ══ */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => { setShowCreate(false); setCreateFile(null); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".75rem" }}>
              <RotateCcw size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{t("Record Customer Return", "تسجيل مرتجع عميل")}</p>
              <button type="button" onClick={() => { setShowCreate(false); setCreateFile(null); }} style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <ReturnForm f={form} setF={patch => setForm(p => ({ ...p, ...patch }))} fileRef={createFileRef} file={createFile} onFileChange={setCreateFile} />
              {saveErr && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".55rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{saveErr}
                </div>
              )}
              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".5rem", borderTop: "1px solid var(--border-default)" }}>
                <button type="button" disabled={saving} onClick={() => void handleCreate()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".65rem 1rem", background: saving ? "var(--bg-surface)" : "#6366f1", color: saving ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".9rem", cursor: saving ? "default" : "pointer" }}>
                  {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t("Saving…", "جارٍ…")}</> : <><Save size={14} />{t("Save Return", "حفظ المرتجع")}</>}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setCreateFile(null); }} style={{ padding: ".65rem 1rem", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", fontWeight: 600, fontSize: ".875rem", cursor: "pointer" }}>{t("Cancel", "إلغاء")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Modal ══ */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => { setEditTarget(null); setEditFile(null); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: ".75rem" }}>
              <Edit3 size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: ".95rem" }}>{t("Edit Return Record", "تعديل سجل المرتجع")}</p>
              <button type="button" onClick={() => { setEditTarget(null); setEditFile(null); }} style={{ marginInlineStart: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <ReturnForm f={editForm} setF={patch => setEditForm(p => ({ ...p, ...patch }))} fileRef={editFileRef} file={editFile} onFileChange={setEditFile} />
              {editErr && (
                <div style={{ display: "flex", gap: ".4rem", padding: ".55rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", fontSize: ".82rem", color: "#dc2626", fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{editErr}
                </div>
              )}
              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".5rem", borderTop: "1px solid var(--border-default)" }}>
                <button type="button" disabled={editSaving} onClick={() => void handleSaveEdit()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".65rem 1rem", background: editSaving ? "var(--bg-surface)" : "#6366f1", color: editSaving ? "var(--text-secondary)" : "#fff", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: ".9rem", cursor: editSaving ? "default" : "pointer" }}>
                  {editSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t("Saving…", "جارٍ…")}</> : <><Save size={14} />{t("Save Changes", "حفظ التعديلات")}</>}
                </button>
                <button type="button" onClick={() => { setEditTarget(null); setEditFile(null); }} style={{ padding: ".65rem 1rem", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", fontWeight: 600, fontSize: ".875rem", cursor: "pointer" }}>{t("Cancel", "إلغاء")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
