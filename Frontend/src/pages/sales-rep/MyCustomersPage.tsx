import { useEffect, useState } from "react";
import { Users, Phone, Mail, MapPin, Search, FileText, Calendar, Plus, X } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  assignedSalesRepId: number | null;
  quotations?: { id: number; status: string; totalAmount: number }[];
  visits?: { id: number; visitDate: string }[];
};

type SalesRep = { id: number; fullName: string };

const AVATAR_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const BLANK = { name: "", phone: "", email: "", address: "", repId: "" };

export function MyCustomersPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";
  const isAdmin    = user?.role === "ADMIN";
  const isSalesRep = user?.role === "SALES_REP";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add customer modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/sales-rep/customers`, { headers: authHeader(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCustomers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!isSalesRep) return;
    fetch(`${API_BASE_URL}/users/all?role=SALES_REP`, { headers: authHeader(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSalesReps(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isAdmin]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMsg(isAr ? "الاسم مطلوب" : "Name is required"); return; }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/sales-rep/customers`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          repId: form.repId ? Number(form.repId) : undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setMsg(isAr ? "تم إضافة العميل" : "Customer added");
      setForm(BLANK);
      setShowAdd(false);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="admin-shell" dir={isAr ? "rtl" : "ltr"}>
      <section className="admin-card">

        {/* ── Header ── */}
        <header className="admin-header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p className="auth-eyebrow">Plasticon</p>
              <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={24} style={{ color: "#8b5cf6" }} />
                {isAr ? (isAdmin ? "كل العملاء" : "عملائي") : (isAdmin ? "All Customers" : "My Customers")}
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                {isAr ? (isAdmin ? "جميع عملاء المندوبين" : "العملاء المخصصون لك") : (isAdmin ? "All sales rep customers" : "Customers assigned to you")}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {isSalesRep && (
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => { setShowAdd(true); setMsg(""); setForm(BLANK); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: ".875rem" }}
                >
                  <Plus size={15} />
                  {isAr ? "إضافة عميل" : "Add Customer"}
                </button>
              )}
              {!loading && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "#8b5cf622",
                    border: "1px solid #8b5cf644",
                    color: "#8b5cf6",
                    borderRadius: "999px",
                    padding: "4px 14px",
                    fontWeight: 700,
                    fontSize: ".9rem",
                  }}
                >
                  <Users size={14} />
                  {customers.length} {isAr ? "عميل" : "customers"}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Search + Grid ── */}
        <div className="admin-section">
        <div style={{ marginBottom: "1.5rem", position: "relative", maxWidth: 400 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              [isAr ? "right" : "left"]: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder={isAr ? "ابحث بالاسم أو الهاتف أو البريد..." : "Search by name, phone or email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input"
            style={{
              width: "100%",
              paddingLeft: isAr ? "0.75rem" : "2.25rem",
              paddingRight: isAr ? "2.25rem" : "0.75rem",
            }}
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
            <p className="admin-muted">{isAr ? "جارٍ التحميل..." : "Loading..."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "4rem 1rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--border-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={34} style={{ color: "var(--text-secondary)" }} />
            </div>
            <p className="admin-muted" style={{ fontSize: "1rem" }}>
              {search
                ? (isAr ? "لا توجد نتائج للبحث" : "No customers match your search")
                : (isAr ? "لا يوجد عملاء بعد" : "No customers yet")}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {filtered.map((c) => {
              const avatarColor = getAvatarColor(c.name);
              const initials = getInitials(c.name);
              const lastQuotation = c.quotations?.[0] ?? null;
              const lastVisit = c.visits?.[0] ?? null;

              return (
                <article
                  key={c.id}
                  style={{
                    border: "1px solid var(--border-default)",
                    borderRadius: "14px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    transition: "border-color .2s, box-shadow .2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = avatarColor + "66";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${avatarColor}18`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Card top strip */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${avatarColor}22 0%, ${avatarColor}11 100%)`,
                      borderBottom: `1px solid ${avatarColor}22`,
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: avatarColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#fff",
                        flexShrink: 0,
                        letterSpacing: ".03em",
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: ".95rem", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </p>
                      {c.address && (
                        <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <MapPin size={11} />
                          {c.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "0.875rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem", flexGrow: 1 }}>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: ".875rem", color: "inherit", textDecoration: "none" }}
                      >
                        <Phone size={14} style={{ color: avatarColor, flexShrink: 0 }} />
                        <span>{c.phone}</span>
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: ".875rem", color: "inherit", textDecoration: "none", overflow: "hidden" }}
                      >
                        <Mail size={14} style={{ color: avatarColor, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</span>
                      </a>
                    )}
                  </div>

                  {/* Card footer pills */}
                  {(lastQuotation !== null || lastVisit !== null) && (
                    <div
                      style={{
                        padding: "0.6rem 1.25rem",
                        borderTop: "1px solid var(--border-default)",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {lastQuotation !== null && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: ".72rem",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "#3b82f611",
                            border: "1px solid #3b82f633",
                            color: "#3b82f6",
                          }}
                        >
                          <FileText size={11} />
                          ₪{lastQuotation.totalAmount.toLocaleString()}
                        </span>
                      )}
                      {lastVisit !== null && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: ".72rem",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "#f59e0b11",
                            border: "1px solid #f59e0b33",
                            color: "#f59e0b",
                          }}
                        >
                          <Calendar size={11} />
                          {new Date(lastVisit.visitDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        </div>
      </section>

      {/* ── Add Customer Modal ── */}
      {showAdd && isSalesRep && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAdd(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card,#fff)", borderRadius: 16, padding: "1.75rem", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "1.1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                {isAr ? "إضافة عميل جديد" : "Add New Customer"}
              </h3>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ width: 32, height: 32, border: "none", background: "var(--bg-subtle)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { void handleAdd(e); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {isAr ? "الاسم *" : "Name *"}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={isAr ? "اسم العميل..." : "Customer name..."}
                  className="admin-input"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {isAr ? "الهاتف" : "Phone"}
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05X-XXXXXXX"
                    className="admin-input"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                  {isAr ? "البريد الإلكتروني" : "Email"}
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="admin-input"
                  />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {isAr ? "العنوان" : "Address"}
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder={isAr ? "المدينة، الشارع..." : "City, Street..."}
                  className="admin-input"
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem", fontWeight: 600 }}>
                {isAr ? "تعيين لمندوب (اختياري)" : "Assign to Rep (optional)"}
                <select value={form.repId} onChange={(e) => setForm((f) => ({ ...f, repId: e.target.value }))} className="admin-input">
                  <option value="">{isAr ? "بدون مندوب..." : "No rep assigned..."}</option>
                  {salesReps.map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName}</option>
                  ))}
                </select>
              </label>

              {msg && (
                <p style={{ margin: 0, fontSize: ".85rem", fontWeight: 600, color: msg.includes("added") || msg.includes("تم") ? "var(--success)" : "var(--danger)" }}>
                  {msg}
                </p>
              )}

              <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowAdd(false)}
                  style={{ padding: ".5rem 1.25rem", borderRadius: 8, border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".5rem 1.5rem", borderRadius: 8, background: "#8b5cf6", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", opacity: saving ? .6 : 1 }}>
                  <Plus size={15} />
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "إضافة" : "Add Customer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
