import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, ChevronRight } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Customer = { id: number; name: string };
type QuotationItem = { productType: string; size: string; quantity: number; pricePerUnit: number };
type Quotation = {
  id: number;
  status: string;
  totalAmount: number;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  items: QuotationItem[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    "#6b7280",
  SENT:     "#3b82f6",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  EXPIRED:  "#f59e0b",
};

const STATUS_NEXT: Record<string, string[]> = {
  DRAFT:    ["SENT", "ACCEPTED", "REJECTED"],
  SENT:     ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["EXPIRED"],
  REJECTED: ["DRAFT"],
  EXPIRED:  ["DRAFT"],
};

export function QuotationBuilderPage() {
  const { locale } = useLocale();
  const { user }   = useAuth();
  const isAr       = locale === "ar";
  const isSalesRep = user?.role === "SALES_REP";

  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes]           = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems]           = useState<QuotationItem[]>([
    { productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 },
  ]);

  const loadAll = async () => {
    setLoading(true);
    const [cRes, qRes] = await Promise.all([
      fetch(`${API_BASE_URL}/sales-rep/customers`,  { headers: authHeader(), credentials: "include" }),
      fetch(`${API_BASE_URL}/sales-rep/quotations`, { headers: authHeader(), credentials: "include" }),
    ]);
    if (cRes.ok) { const d = await cRes.json(); setCustomers(Array.isArray(d) ? d : []); }
    if (qRes.ok) { const d = await qRes.json(); setQuotations(Array.isArray(d) ? d : []); }
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  const addItem = () =>
    setItems((prev) => [...prev, { productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = <K extends keyof QuotationItem>(idx: number, key: K, value: QuotationItem[K]) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));

  const total = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setMsg(isAr ? "اختر عميلاً" : "Select a customer"); return; }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/quotations`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId: Number(customerId), notes, validUntil: validUntil || undefined, items }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg(isAr ? "تم إنشاء العرض" : "Quotation created");
      setCustomerId(""); setNotes(""); setValidUntil("");
      setItems([{ productType: "CAPS", size: "", quantity: 1, pricePerUnit: 0 }]);
      void loadAll();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: number, status: string) => {
    await fetch(`${API_BASE_URL}/sales-rep/quotations/${id}/status`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    void loadAll();
  };

  const deleteQ = async (id: number) => {
    if (!confirm(isAr ? "حذف العرض؟" : "Delete quotation?")) return;
    await fetch(`${API_BASE_URL}/sales-rep/quotations/${id}`, {
      method: "DELETE", headers: authHeader(), credentials: "include",
    });
    void loadAll();
  };

  return (
    <main className="admin-shell" dir={isAr ? "rtl" : "ltr"}>
      <section className="admin-card">

        {/* ── Page Header ── */}
        <header className="admin-header">
          <div>
            <p className="auth-eyebrow">Plasticon</p>
            <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={24} style={{ color: "var(--accent)" }} />
              {isAr ? "بناء العروض" : "Quotation Builder"}
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
              {isAr ? "أنشئ وأدر عروض أسعار العملاء" : "Create and manage customer quotations"}
            </p>
          </div>
        </header>

        {/* ── Form + List wrapper ── */}
        <div className="admin-section">

        {/* ── New Quotation Form (SALES_REP only) ── */}
        {isSalesRep && <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "2rem",
          }}
        >
          {/* Form header */}
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderBottom: "1px solid var(--border-default)",
              background: "linear-gradient(135deg, rgba(var(--accent-rgb,99,102,241),.08) 0%, transparent 100%)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Plus size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 700, fontSize: ".95rem" }}>
              {isAr ? "عرض جديد" : "New Quotation"}
            </span>
          </div>

          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Customer + Valid Until row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {isAr ? "العميل" : "Customer"}
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="admin-input"
                >
                  <option value="">{isAr ? "اختر عميلاً..." : "Select customer..."}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
                {isAr ? "صالح حتى" : "Valid Until"}
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="admin-input"
                />
              </label>
            </div>

            {/* Items */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 600, fontSize: ".9rem" }}>
                  {isAr ? "البنود" : "Items"}
                </span>
                <button type="button" className="auth-button auth-button--ghost" onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: ".8rem" }}>
                  <Plus size={13} />
                  {isAr ? "إضافة بند" : "Add Item"}
                </button>
              </div>

              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 80px 110px 36px",
                  gap: "6px",
                  marginBottom: "4px",
                  padding: "0 2px",
                }}
              >
                {[
                  isAr ? "نوع المنتج" : "Product",
                  isAr ? "الحجم" : "Size",
                  isAr ? "الكمية" : "Qty",
                  isAr ? "السعر" : "Price / unit",
                  "",
                ].map((h, i) => (
                  <span key={i} style={{ fontSize: ".72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-secondary)" }}>
                    {h}
                  </span>
                ))}
              </div>

              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 80px 110px 36px",
                    gap: "6px",
                    marginBottom: "6px",
                    alignItems: "center",
                  }}
                >
                  <select
                    value={item.productType}
                    onChange={(e) => updateItem(idx, "productType", e.target.value)}
                    className="admin-input"
                    style={{ fontSize: ".875rem" }}
                  >
                    <option value="CAPS">CAPS</option>
                    <option value="PREFORM">PREFORM</option>
                  </select>
                  <input
                    placeholder={isAr ? "الحجم" : "Size"}
                    value={item.size}
                    onChange={(e) => updateItem(idx, "size", e.target.value)}
                    className="admin-input"
                    style={{ fontSize: ".875rem" }}
                  />
                  <input
                    type="number"
                    placeholder={isAr ? "الكمية" : "Qty"}
                    value={item.quantity}
                    min={0}
                    onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                    className="admin-input"
                    style={{ fontSize: ".875rem" }}
                  />
                  <input
                    type="number"
                    placeholder={isAr ? "السعر" : "Price"}
                    value={item.pricePerUnit}
                    min={0}
                    step="0.01"
                    onChange={(e) => updateItem(idx, "pricePerUnit", Number(e.target.value))}
                    className="admin-input"
                    style={{ fontSize: ".875rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "1px solid var(--border-default)",
                      borderRadius: "8px",
                      cursor: items.length === 1 ? "not-allowed" : "pointer",
                      color: items.length === 1 ? "var(--text-secondary)" : "var(--danger)",
                      transition: "background .15s, border-color .15s",
                    }}
                    onMouseEnter={(e) => {
                      if (items.length > 1) (e.currentTarget as HTMLButtonElement).style.background = "var(--danger)11";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "none";
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {/* Running total */}
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem 1rem",
                  background: "linear-gradient(135deg, var(--accent)11 0%, var(--accent)08 100%)",
                  border: "1px solid var(--accent)33",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: ".875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {isAr ? "الإجمالي" : "Running Total"}
                </span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>
                  ₪{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: ".875rem", fontWeight: 500 }}>
              {isAr ? "ملاحظات" : "Notes"}
              <textarea
                placeholder={isAr ? "أضف ملاحظات اختيارية..." : "Optional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="admin-input"
                rows={3}
                style={{ resize: "vertical" }}
              />
            </label>

            {/* Submit */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="auth-button" disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                {saving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                    {isAr ? "جارٍ الحفظ..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    {isAr ? "إنشاء العرض" : "Create Quotation"}
                  </>
                )}
              </button>
              {msg && (
                <span
                  style={{
                    fontSize: ".875rem",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: msg.includes("رض") || msg.includes("created") ? "#10b98122" : "#ef444422",
                    color: msg.includes("رض") || msg.includes("created") ? "#10b981" : "#ef4444",
                    border: `1px solid ${msg.includes("رض") || msg.includes("created") ? "#10b98144" : "#ef444444"}`,
                  }}
                >
                  {msg}
                </span>
              )}
            </div>
          </form>
        </div>}

        {/* ── Quotations List ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 className="admin-section__title" style={{ margin: 0 }}>
              {isAr ? "قائمة العروض" : "Quotations List"}
            </h2>
            {!loading && (
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>
                {quotations.length} {isAr ? "عرض" : "total"}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "3rem 0", textAlign: "center" }}>
              <p className="admin-muted">{isAr ? "جارٍ التحميل..." : "Loading..."}</p>
            </div>
          ) : quotations.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", border: "1px dashed var(--border-default)", borderRadius: "14px" }}>
              <FileText size={36} style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }} />
              <p className="admin-muted">{isAr ? "لا توجد عروض بعد" : "No quotations yet"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {quotations.map((q) => {
                const sc = STATUS_COLORS[q.status] ?? "#6b7280";
                const nextStatuses = STATUS_NEXT[q.status] ?? [];

                return (
                  <article
                    key={q.id}
                    style={{
                      border: "1px solid var(--border-default)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      transition: "border-color .2s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = sc + "55"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; }}
                  >
                    {/* Card top row */}
                    <div
                      style={{
                        padding: "0.875rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        borderBottom: "1px solid var(--border-default)",
                        background: `linear-gradient(135deg, ${sc}0d 0%, transparent 100%)`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            background: sc + "22",
                            border: `1px solid ${sc}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FileText size={16} style={{ color: sc }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: ".95rem", marginBottom: "1px" }}>{q.customer.name}</p>
                          <p className="admin-muted" style={{ fontSize: ".78rem" }}>
                            {new Date(q.createdAt).toLocaleDateString()}
                            {q.validUntil && (
                              <span> · {isAr ? "صالح حتى" : "valid until"} {new Date(q.validUntil).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span
                          style={{
                            fontSize: ".75rem",
                            fontWeight: 700,
                            padding: "3px 12px",
                            borderRadius: "999px",
                            background: sc + "22",
                            color: sc,
                            border: `1px solid ${sc}44`,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          {q.status}
                        </span>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>
                          ₪{q.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {q.notes && (
                      <div style={{ padding: "0.625rem 1.25rem", borderBottom: "1px solid var(--border-default)" }}>
                        <p className="admin-muted" style={{ fontSize: ".85rem", fontStyle: "italic" }}>{q.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div
                      style={{
                        padding: "0.625rem 1.25rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em", marginRight: "0.25rem" }}>
                        {isAr ? "تغيير إلى:" : "Move to:"}
                      </span>
                      {nextStatuses.map((s) => {
                        const btnColor = STATUS_COLORS[s] ?? "#6b7280";
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => patchStatus(q.id, s)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: ".75rem",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "8px",
                              border: `1px solid ${btnColor}44`,
                              background: btnColor + "11",
                              color: btnColor,
                              cursor: "pointer",
                              transition: "background .15s",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = btnColor + "22"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = btnColor + "11"; }}
                          >
                            <ChevronRight size={11} />
                            {s}
                          </button>
                        );
                      })}
                      {isSalesRep && (
                        <button
                          type="button"
                          onClick={() => deleteQ(q.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: ".75rem",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "8px",
                            border: "1px solid var(--danger)44",
                            background: "var(--danger)11",
                            color: "var(--danger)",
                            cursor: "pointer",
                            marginLeft: "auto",
                            transition: "background .15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--danger)22"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--danger)11"; }}
                        >
                          <Trash2 size={11} />
                          {isAr ? "حذف" : "Delete"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        </div>{/* end admin-section */}
      </section>
    </main>
  );
}
