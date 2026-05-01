import { useEffect, useState, useRef, type FormEvent } from "react";
import { Package, Plus, X, Check, DollarSign, Trash2 } from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Machine { id: number; name: string; type: string }
interface SparePartRequest {
  id: number;
  partName: string;
  quantity: number;
  status: string;
  imagePath?: string | null;
  notes?: string | null;
  unitPrice?: number | null;
  supplierName?: string | null;
  supplierCountry?: string | null;
  machineId: number;
  machine?: { id: number; name: string };
  engineerId: number;
  engineer?: { id: number; fullName: string };
  pricedBy?: { id: number; fullName: string };
  pricedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
}

const emptyForm = () => ({ machineId: "", partName: "", quantity: "1", notes: "", supplierName: "", supplierCountry: "" });

const STATUS_META: Record<string, { color: string; bg: string; label: string; labelAr: string }> = {
  PENDING:  { color: "#d97706", bg: "#fef3c7", label: "Pending",  labelAr: "قيد الانتظار" },
  RECEIVED: { color: "#059669", bg: "#d1fae5", label: "Received", labelAr: "تم الاستلام" },
};

export default function SparePartsManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const role = user?.role ?? "";
  const isEngineer = role === "ENGINEER";
  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const canViewAll = isAdmin || isAccountant;

  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-run when role becomes known (auth loads asynchronously after mount)
  useEffect(() => { void load(); }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = canViewAll ? "/spare-part-requests" : "/spare-part-requests/mine";
      const [rRes, mRes] = await Promise.all([
        fetch(`${API_BASE_URL}${endpoint}`, { headers: authHeaders(), credentials: "include" }),
        isEngineer ? fetch(`${API_BASE_URL}/machines`, { headers: authHeaders(), credentials: "include" }) : Promise.resolve(null),
      ]);
      if (rRes.ok) { const d = await rRes.json(); setRequests(Array.isArray(d) ? d : (d.data ?? [])); }
      if (mRes?.ok) { const d = await mRes.json(); setMachines(Array.isArray(d) ? d : (d.items ?? d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.machineId) { setError(nav("Select a machine", "اختر آلة")); return; }
    if (!form.partName.trim()) { setError(nav("Part name is required", "اسم القطعة مطلوب")); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("machineId", form.machineId);
      fd.append("partName", form.partName.trim());
      fd.append("quantity", form.quantity || "1");
      if (form.notes.trim()) fd.append("notes", form.notes.trim());
      if (form.supplierName.trim()) fd.append("supplierName", form.supplierName.trim());
      if (form.supplierCountry.trim()) fd.append("supplierCountry", form.supplierCountry.trim());
      if (photo) fd.append("photo", photo);

      const res = await fetch(`${API_BASE_URL}/spare-part-requests`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to submit");
      }
      setSuccess(nav("Request submitted successfully", "تم إرسال الطلب بنجاح"));
      setForm(emptyForm());
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally { setSaving(false); }
  };

  const handleSetPrice = async (id: number) => {
    const val = priceInputs[id];
    if (!val || isNaN(Number(val))) return;
    try {
      await fetch(`${API_BASE_URL}/spare-part-requests/${id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ unitPrice: Number(val) }),
      });
      setPriceInputs(p => { const n = { ...p }; delete n[id]; return n; });
      void load();
    } catch { }
  };

  const handleReceived = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/spare-part-requests/${id}/received`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
      });
      void load();
    } catch { }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("Delete this request?", { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/spare-part-requests/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      void load();
    } catch { }
  };

  const pendingCount  = requests.filter(r => r.status === "PENDING").length;
  const receivedCount = requests.filter(r => r.status === "RECEIVED").length;
  const pricedCount   = requests.filter(r => r.unitPrice != null).length;

  return (
    <ModulePageShell
      title={nav("Spare Parts Requests", "طلبات قطع الغيار")}
      subtitle={nav("Request, track and manage spare part procurement", "طلب وتتبع وإدارة مشتريات قطع الغيار")}
      icon={<Package size={22} />}
      actions={isEngineer ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Request Part", "طلب قطعة")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Pending",  "قيد الانتظار"), value: pendingCount,  icon: "⏳", color: "#d97706", bg: "#fef3c7" },
          { label: nav("Received", "تم الاستلام"),  value: receivedCount, icon: "✅", color: "#059669", bg: "#d1fae5" },
          { label: nav("Priced",   "تم التسعير"),   value: pricedCount,   icon: "💰", color: "#7c3aed", bg: "#ede9fe" },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{k.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Request form — engineer only */}
      {isEngineer && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("New Part Request", "طلب قطعة جديدة")}</h3>
          {error   && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          {success && <div className="auth-alert mb-3">{success}</div>}
          <form className="module-form" onSubmit={e => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>{nav("Machine", "الآلة")} *
                <select className="input" value={form.machineId} onChange={e => setForm(p => ({ ...p, machineId: e.target.value }))} required>
                  <option value="">{nav("Select machine...", "اختر الآلة...")}</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>{nav("Part Name", "اسم القطعة")} *
                <input type="text" className="input" value={form.partName} onChange={e => setForm(p => ({ ...p, partName: e.target.value }))} placeholder={nav("e.g. Drive Belt, Seal Kit...", "مثال: حزام التشغيل...")} required />
              </label>
              <label>{nav("Quantity", "الكمية")} *
                <input type="number" min={1} className="input" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required />
              </label>
              <label>{nav("Supplier Company", "الشركة الموردة")}
                <input type="text" className="input" value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} placeholder={nav("e.g. Siemens, Bosch...", "مثال: سيمنز، بوش...")} />
              </label>
              <label>{nav("Supplier Country", "بلد المورد")}
                <input type="text" className="input" value={form.supplierCountry} onChange={e => setForm(p => ({ ...p, supplierCountry: e.target.value }))} placeholder={nav("e.g. China, Germany...", "مثال: الصين، ألمانيا...")} />
              </label>
              <label>{nav("Photo (optional)", "صورة (اختياري)")}
                <input ref={fileRef} type="file" accept="image/*" className="input" style={{ padding: ".4rem .6rem" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>{nav("Notes", "ملاحظات")}
                <textarea rows={2} className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={nav("Any additional details...", "تفاصيل إضافية...")} />
              </label>
            </div>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? nav("Submitting...", "جارٍ الإرسال...") : nav("Submit Request", "إرسال الطلب")}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{nav("Cancel", "إلغاء")}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Requests list */}
      {loading ? (
        <div className="flex justify-center p-10"><div className="spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
          <Package size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
          <p style={{ fontWeight: 600 }}>{nav("No requests yet", "لا توجد طلبات بعد")}</p>
          {isEngineer && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Request Part' to submit a request", "انقر على 'طلب قطعة' لتقديم طلب")}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(req => {
            const meta = STATUS_META[req.status] ?? STATUS_META.PENDING;
            const totalCost = req.unitPrice != null ? req.unitPrice * req.quantity : null;
            const isMyRequest = req.engineerId === user?.id;
            return (
              <Card key={req.id} className="p-0 overflow-hidden flex flex-col">
                {/* Photo or placeholder */}
                {req.imagePath ? (
                  <img
                    src={`${API_BASE_URL.replace("/api", "")}/pictures/${req.imagePath}`}
                    alt={req.partName}
                    style={{ width: "100%", height: 140, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 90, background: "var(--bg-subtle,#f3f4f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={28} style={{ opacity: .18 }} />
                  </div>
                )}

                <div style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {/* Title + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".5rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)", flex: 1 }}>{req.partName}</p>
                    <span style={{ display: "inline-block", padding: ".15rem .5rem", borderRadius: 999, fontSize: ".72rem", fontWeight: 700, background: meta.bg, color: meta.color, flexShrink: 0 }}>
                      {locale === "ar" ? meta.labelAr : meta.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ fontSize: ".8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: ".2rem" }}>
                    <span>🔧 {req.machine?.name ?? `Machine #${req.machineId}`}</span>
                    <span>📦 {nav("Qty", "كمية")}: <strong style={{ color: "var(--text-primary)" }}>{req.quantity}</strong></span>
                    {canViewAll && req.engineer && <span>👤 {req.engineer.fullName}</span>}
                    {req.supplierName && <span>🏭 {req.supplierName}{req.supplierCountry ? ` — ${req.supplierCountry}` : ""}</span>}
                    {req.notes && <span style={{ fontStyle: "italic" }}>{req.notes}</span>}
                    <span style={{ fontSize: ".72rem" }}>📅 {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Price section */}
                  {req.unitPrice != null ? (
                    <div style={{ background: "#ede9fe", borderRadius: 8, padding: ".5rem .75rem" }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "#7c3aed", fontSize: ".82rem" }}>
                        💰 ${req.unitPrice.toFixed(2)} × {req.quantity} = <strong>${totalCost!.toFixed(2)}</strong>
                      </p>
                      {req.pricedBy && (
                        <p style={{ margin: ".2rem 0 0", fontSize: ".72rem", color: "#6d28d9" }}>
                          {nav("Priced by", "سعّره")}: {req.pricedBy.fullName}
                        </p>
                      )}
                    </div>
                  ) : (isAccountant || isAdmin) ? (
                    <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={nav("Unit price...", "سعر الوحدة...")}
                        className="input"
                        style={{ flex: 1, padding: ".3rem .5rem", fontSize: ".82rem" }}
                        value={priceInputs[req.id] ?? ""}
                        onChange={e => setPriceInputs(p => ({ ...p, [req.id]: e.target.value }))}
                      />
                      <Button size="sm" onClick={() => void handleSetPrice(req.id)} disabled={!priceInputs[req.id]}>
                        <DollarSign size={13} />
                        {nav("Set", "تعيين")}
                      </Button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: ".78rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      {nav("Awaiting price from accountant", "بانتظار التسعير من المحاسب")}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: ".4rem", marginTop: ".25rem", flexWrap: "wrap" }}>
                    {isEngineer && isMyRequest && req.status === "PENDING" && (
                      <Button size="sm" onClick={() => void handleReceived(req.id)}>
                        <Check size={12} />
                        {nav("Mark Received", "تأكيد الاستلام")}
                      </Button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(req.id)}
                        style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".3rem .6rem", borderRadius: 6, border: "1px solid #fecaca", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: ".78rem", fontWeight: 600 }}
                      >
                        <Trash2 size={12} />
                        {nav("Delete", "حذف")}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
