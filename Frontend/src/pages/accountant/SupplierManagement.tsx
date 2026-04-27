import { useEffect, useState } from "react";
import { confirmDialog } from "../../lib/dialog";
import { Truck, Plus, Pencil, Trash2, X, Save, Star } from "lucide-react";
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

const CATEGORIES = ["Raw Materials", "Spare Parts", "Utilities", "Packaging", "Services", "Other"];

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
  const isAdmin = user?.role === "ADMIN";
  const isReadOnly = isAdmin;
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/suppliers`, {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (res.ok) setSuppliers(await res.json());
    } catch { } finally { setLoading(false); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

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
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); fetchSuppliers(); }
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(nav("Delete this supplier?", "حذف هذا المورد؟"), { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/suppliers/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      fetchSuppliers();
    } catch { }
  };

  const filtered = filterCat ? suppliers.filter((s) => s.category === filterCat) : suppliers;
  const totalSuppliers = suppliers.length;
  const avgRating = suppliers.filter((s) => s.rating != null).length
    ? (suppliers.filter((s) => s.rating != null).reduce((a, b) => a + (b.rating ?? 0), 0) / suppliers.filter((s) => s.rating != null).length).toFixed(1)
    : "—";
  const totalPurchases = suppliers.reduce((a, b) => a + (b._count?.purchases ?? 0), 0);

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-[var(--text-secondary)]">—</span>;
    return (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={12} className={i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
        ))}
      </span>
    );
  };

  return (
    <ModulePageShell
      title={nav("Supplier Management", "إدارة الموردين")}
      subtitle={nav("Manage supplier contacts, ratings, and purchase history", "إدارة جهات اتصال الموردين والتقييمات وتاريخ الشراء")}
      icon={<Truck size={22} />}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{nav("Total Suppliers", "إجمالي الموردين")}</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalSuppliers}</p>
        </Card>
        <Card className="p-4 bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{nav("Avg Rating", "متوسط التقييم")}</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{avgRating}</p>
        </Card>
        <Card className="p-4 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">{nav("Total Purchases", "إجمالي المشتريات")}</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{totalPurchases}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isReadOnly && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="me-1" />
            {nav("Add Supplier", "إضافة مورد")}
          </Button>
        )}
        <select
          className="input text-sm h-9"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">{nav("All Categories", "جميع الفئات")}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {editingId ? nav("Edit Supplier", "تعديل المورد") : nav("New Supplier", "مورد جديد")}
            </h3>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{nav("Name *", "الاسم *")}</label>
              <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Contact Person", "جهة الاتصال")}</label>
              <input className="input" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Phone", "الهاتف")}</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Email", "البريد الإلكتروني")}</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Address", "العنوان")}</label>
              <input className="input" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Website", "الموقع")}</label>
              <input className="input" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Category", "الفئة")}</label>
              <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="">{nav("Select...", "اختر...")}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{nav("Lead Time (days)", "وقت التوريد (أيام)")}</label>
              <input className="input" type="number" min="0" value={form.leadTimeDays} onChange={(e) => setForm((p) => ({ ...p, leadTimeDays: e.target.value }))} />
            </div>
            <div>
              <label className="label">{nav("Rating (1-5)", "التقييم (1-5)")}</label>
              <input className="input" type="number" min="1" max="5" step="0.1" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{nav("Notes", "ملاحظات")}</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="me-1" />
              {saving ? nav("Saving...", "جارٍ الحفظ...") : nav("Save", "حفظ")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{nav("Cancel", "إلغاء")}</Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">{nav("No suppliers found", "لا يوجد موردون")}</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>{nav("Name", "الاسم")}</th>
                  <th>{nav("Contact", "التواصل")}</th>
                  <th>{nav("Category", "الفئة")}</th>
                  <th>{nav("Lead Time", "وقت التوريد")}</th>
                  <th>{nav("Rating", "التقييم")}</th>
                  <th>{nav("Purchases", "مشتريات")}</th>
                  {!isReadOnly && <th>{nav("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-medium">{s.name}</div>
                      {s.website && <div className="text-xs text-[var(--text-secondary)]">{s.website}</div>}
                    </td>
                    <td>
                      <div>{s.contactPerson ?? "—"}</div>
                      {s.phone && <div className="text-xs text-[var(--text-secondary)]">{s.phone}</div>}
                      {s.email && <div className="text-xs text-[var(--text-secondary)]">{s.email}</div>}
                    </td>
                    <td>{s.category ?? "—"}</td>
                    <td>{s.leadTimeDays != null ? `${s.leadTimeDays}d` : "—"}</td>
                    <td>{renderStars(s.rating)}</td>
                    <td>{s._count?.purchases ?? 0}</td>
                    {!isReadOnly && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            <Pencil size={13} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </ModulePageShell>
  );
}
