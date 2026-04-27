import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import {
  Truck, Plus, Pencil, Trash2, X, Save, Star,
  Phone, Mail, MapPin, Globe, Clock, Search, Package,
} from "lucide-react";
import { ModulePageShell } from "../../components/ModulePageShell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  category: string | null;
  leadTimeDays: number | null;
  rating: number | null;
  notes: string | null;
  _count?: { purchases: number };
}

const CATEGORIES = [
  "Raw Materials - HDPE",
  "Raw Materials - LDPE",
  "Raw Materials - PET",
  "Raw Materials - Color/Masterbatch",
  "Spare Parts - Machines",
  "Spare Parts - Electrical",
  "Utilities",
  "Packaging",
  "Services",
  "Other",
];

const CATEGORY_META: Record<string, { color: string; bg: string; icon: string }> = {
  "Raw Materials - HDPE":            { color: "#1d4ed8", bg: "#dbeafe", icon: "🔵" },
  "Raw Materials - LDPE":            { color: "#0e7490", bg: "#cffafe", icon: "🩵" },
  "Raw Materials - PET":             { color: "#047857", bg: "#d1fae5", icon: "🟢" },
  "Raw Materials - Color/Masterbatch": { color: "#6d28d9", bg: "#ede9fe", icon: "🎨" },
  "Spare Parts - Machines":          { color: "#b45309", bg: "#fef3c7", icon: "⚙️" },
  "Spare Parts - Electrical":        { color: "#c2410c", bg: "#ffedd5", icon: "⚡" },
  "Utilities":                       { color: "#0f766e", bg: "#ccfbf1", icon: "💡" },
  "Packaging":                       { color: "#7c3aed", bg: "#ede9fe", icon: "📦" },
  "Services":                        { color: "#475569", bg: "#f1f5f9", icon: "🔧" },
  "Other":                           { color: "#6b7280", bg: "#f3f4f6", icon: "📋" },
};

const getCategoryMeta = (cat: string | null) =>
  CATEGORY_META[cat ?? ""] ?? { color: "#6b7280", bg: "#f3f4f6", icon: "📋" };

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  category: "",
  leadTimeDays: "",
  rating: "",
  notes: "",
};

export default function SupplierManagement() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isReadOnly = user?.role === "ADMIN";
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { void fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/suppliers`, {
        headers: authHeaders(), credentials: "include",
      });
      if (res.ok) setSuppliers(await res.json());
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      website: s.website ?? "",
      category: s.category ?? "",
      leadTimeDays: s.leadTimeDays != null ? String(s.leadTimeDays) : "",
      rating: s.rating != null ? String(s.rating) : "",
      notes: s.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        category: form.category || null,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
        rating: form.rating ? parseFloat(form.rating) : null,
        notes: form.notes.trim() || null,
      };
      const url = editingId ? `${API_BASE_URL}/suppliers/${editingId}` : `${API_BASE_URL}/suppliers`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); void fetchSuppliers(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this supplier?", "حذف هذا المورد؟"), { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/suppliers/${id}`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
      });
      void fetchSuppliers();
    } catch { }
  };

  const filtered = suppliers
    .filter((s) => !filterCat || s.category === filterCat)
    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()));

  // KPIs
  const rawMatSuppliers = suppliers.filter((s) => s.category?.startsWith("Raw Materials")).length;
  const avgRating = suppliers.filter((s) => s.rating != null).length
    ? (suppliers.reduce((a, b) => a + (b.rating ?? 0), 0) / suppliers.filter((s) => s.rating != null).length).toFixed(1)
    : "—";
  const avgLead = suppliers.filter((s) => s.leadTimeDays != null).length
    ? Math.round(suppliers.reduce((a, b) => a + (b.leadTimeDays ?? 0), 0) / suppliers.filter((s) => s.leadTimeDays != null).length)
    : null;

  const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={onChange ? 18 : 13}
          className={`${i <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} ${onChange ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );

  return (
    <ModulePageShell
      title={nav("Supplier Management", "إدارة الموردين")}
      subtitle={nav("Raw materials, spare parts and service providers", "الموردون: مواد خام، قطع غيار، خدمات")}
      icon={<Truck size={22} />}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: nav("Total Suppliers", "إجمالي الموردين"), value: suppliers.length, icon: "🏢", color: "#3b82f6", bg: "#dbeafe" },
          { label: nav("Raw Material Suppliers", "موردو المواد"), value: rawMatSuppliers, icon: "🏭", color: "#10b981", bg: "#d1fae5" },
          { label: nav("Avg Rating", "متوسط التقييم"), value: avgRating, icon: "⭐", color: "#f59e0b", bg: "#fef3c7" },
          { label: nav("Avg Lead Time", "متوسط التوريد"), value: avgLead != null ? `${avgLead}d` : "—", icon: "⏱️", color: "#8b5cf6", bg: "#ede9fe" },
        ].map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!isReadOnly && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Supplier", "إضافة مورد")}
          </Button>
        )}
        <div className="relative">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="input ps-8 h-8 text-sm w-48"
            placeholder={nav("Search...", "بحث...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm h-8 min-w-[160px]" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">{nav("All Categories", "جميع الفئات")}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterCat || search) && (
          <button className="text-xs text-[var(--text-secondary)] underline" onClick={() => { setFilterCat(""); setSearch(""); }}>
            {nav("Clear filters", "مسح الفلتر")}
          </button>
        )}
      </div>

      {/* Supplier Form */}
      {showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] text-base">
                {editingId ? nav("Edit Supplier", "تعديل المورد") : nav("New Supplier", "إضافة مورد جديد")}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nav("Fill in the supplier details below", "أدخل بيانات المورد أدناه")}</p>
            </div>
            <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Section: Identity */}
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{nav("Identity", "بيانات المورد")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{nav("Company Name *", "اسم الشركة *")}</label>
              <input className="input" placeholder={nav("e.g. Plastisource Ltd.", "مثال: شركة بلاستي سورس")} value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Category *", "الفئة *")}</label>
              <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="">{nav("Select category...", "اختر الفئة...")}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{nav("Contact Person", "مسؤول التواصل")}</label>
              <input className="input" placeholder={nav("Full name", "الاسم الكامل")} value={form.contactPerson}
                onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Phone", "الهاتف")}</label>
              <input className="input" type="tel" placeholder="+972 5X-XXX-XXXX" value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Email", "البريد الإلكتروني")}</label>
              <input className="input" type="email" placeholder="supplier@company.com" value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>

          {/* Section: Logistics */}
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 mt-1">{nav("Logistics & Terms", "الخدمات والشروط")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="label">{nav("Address / Region", "العنوان / المنطقة")}</label>
              <input className="input" placeholder={nav("e.g. Ramallah, West Bank", "مثال: رام الله، الضفة الغربية")} value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Lead Time (days)", "وقت التوريد (أيام)")}</label>
              <input className="input" type="number" min="0" placeholder="e.g. 7" value={form.leadTimeDays}
                onChange={(e) => setForm((p) => ({ ...p, leadTimeDays: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Website", "الموقع الإلكتروني")}</label>
              <input className="input" placeholder="https://..." value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Rating (1–5)", "التقييم (1–5)")}</label>
              <div className="flex items-center gap-3 mt-1">
                <StarRating value={parseInt(form.rating) || 0} onChange={(v) => setForm((p) => ({ ...p, rating: String(v) }))} />
                {form.rating && <span className="text-sm font-bold text-yellow-500">{form.rating}/5</span>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="label">{nav("Notes / Special Terms", "ملاحظات / شروط خاصة")}</label>
            <textarea className="input resize-none" rows={2}
              placeholder={nav("Payment terms, minimum order, preferred delivery day, etc.", "شروط الدفع، الحد الأدنى للطلب، يوم التسليم المفضل...")}
              value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save Supplier", "حفظ المورد")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Suppliers Grid / Table */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Truck size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{nav("No suppliers found", "لا يوجد موردون")}</p>
          <p className="text-sm mt-1">{nav("Add your first supplier to get started", "أضف أول مورد للبدء")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const meta = getCategoryMeta(s.category);
            return (
              <Card key={s.id} className="p-0 overflow-hidden flex flex-col">
                {/* Card header with category color */}
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}20`, padding: "12px 16px" }}
                  className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{s.name}</p>
                      <span style={{
                        background: meta.color + "20", color: meta.color,
                        borderRadius: "20px", padding: "1px 8px", fontSize: ".68rem", fontWeight: 700,
                      }}>
                        {s.category ?? nav("Uncategorized", "غير مصنف")}
                      </span>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-[var(--text-secondary)] hover:text-blue-600 p-1" onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </button>
                      <button className="text-[var(--text-secondary)] hover:text-red-500 p-1" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  {s.contactPerson && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--text-secondary)] text-xs w-5 shrink-0">👤</span>
                      <span className="font-medium truncate">{s.contactPerson}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Phone size={12} className="shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                  {s.website && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Globe size={12} className="shrink-0" />
                      <a href={s.website} target="_blank" rel="noopener noreferrer"
                        className="truncate text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {s.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-2,#f8fafc)] rounded px-2.5 py-1.5 italic leading-relaxed">
                      {s.notes}
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div className="border-t border-[var(--border-default)] px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.rating ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={11} className={i <= (s.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                        ))}
                        <span className="text-xs text-[var(--text-secondary)] ms-0.5">{s.rating}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)]">{nav("Not rated", "غير مقيّم")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    {s.leadTimeDays != null && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {s.leadTimeDays}d
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package size={11} />
                      {s._count?.purchases ?? 0} PO
                    </span>
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
