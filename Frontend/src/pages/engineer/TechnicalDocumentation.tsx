import { useEffect, useState, useRef, type FormEvent } from "react";
import { FileText, Download, Clock, Plus, X, Trash2, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface TechDoc {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  downloadCount: number;
  uploadedBy?: { id: number; fullName: string };
  createdAt: string;
}

const CATEGORIES = ["All", "Manual", "Maintenance", "Safety", "Reference", "Support", "Other"];
const CAT_META: Record<string, { color: string; bg: string }> = {
  Manual:      { color: "#1d4ed8", bg: "#dbeafe" },
  Maintenance: { color: "#d97706", bg: "#fef3c7" },
  Safety:      { color: "#dc2626", bg: "#fee2e2" },
  Reference:   { color: "#7c3aed", bg: "#ede9fe" },
  Support:     { color: "#059669", bg: "#d1fae5" },
  Other:       { color: "#6b7280", bg: "#f3f4f6" },
};

const emptyForm = () => ({ title: "", category: "Manual", description: "" });

export default function TechnicalDocumentation() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const nav = (en: string, ar: string) => locale === "ar" ? ar : en;
  const isEngineer = user?.role === "ENGINEER";
  const isAdmin = user?.role === "ADMIN";
  const canAdd = isEngineer || isAdmin;

  const [docs, setDocs] = useState<TechDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tech-documents`, {
        headers: authHeaders(), credentials: "include",
      });
      if (res.ok) { const d = await res.json(); setDocs(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.title.trim()) { setError(nav("Title is required", "العنوان مطلوب")); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (file) fd.append("file", file);

      const res = await fetch(`${API_BASE_URL}/tech-documents`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to upload");
      }
      setSuccess(nav("Document uploaded successfully", "تم رفع الوثيقة بنجاح"));
      setForm(emptyForm());
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally { setSaving(false); }
  };

  const handleDownload = async (doc: TechDoc) => {
    // Increment count
    await fetch(`${API_BASE_URL}/tech-documents/${doc.id}/download`, {
      method: "PATCH", headers: authHeaders(), credentials: "include",
    }).catch(() => {});
    // Open file if it exists
    if (doc.filePath) {
      window.open(`${API_BASE_URL.replace("/api", "")}/pictures/${doc.filePath}`, "_blank");
    }
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d));
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog("Delete this document?", { danger: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/tech-documents/${id}`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
      });
      void load();
    } catch { }
  };

  const filtered = activeCat === "All" ? docs : docs.filter(d => d.category === activeCat);
  const recentCount = docs.filter(d => new Date(d.createdAt) > new Date(Date.now() - 30 * 86400000)).length;
  const totalDownloads = docs.reduce((s, d) => s + d.downloadCount, 0);

  return (
    <ModulePageShell
      title={nav("Technical Documentation", "التوثيق التقني")}
      subtitle={nav("Access and manage technical resources and manuals", "الوصول وإدارة الموارد التقنية والكتيبات")}
      icon={<FileText size={22} />}
      actions={canAdd ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? nav("Cancel", "إلغاء") : nav("Upload Doc", "رفع وثيقة")}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: nav("Total Documents", "إجمالي الوثائق"), value: docs.length, icon: "📄", color: "#1d4ed8", bg: "#dbeafe" },
          { label: nav("Recently Added", "مضاف مؤخراً"), value: recentCount, icon: "🕐", color: "#059669", bg: "#d1fae5" },
          { label: nav("Total Downloads", "إجمالي التنزيلات"), value: totalDownloads, icon: "⬇️", color: "#d97706", bg: "#fef3c7" },
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

      {/* Upload form */}
      {canAdd && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>{nav("Upload New Document", "رفع وثيقة جديدة")}</h3>
          {error && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          {success && <div className="auth-alert mb-3">{success}</div>}
          <form className="module-form" onSubmit={e => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
              <label style={{ gridColumn: "1 / -1" }}>{nav("Title", "العنوان")} *
                <input type="text" className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={nav("e.g. Machine A - User Manual", "مثال: دليل الآلة أ")} required />
              </label>
              <label>{nav("Category", "الفئة")}
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>{nav("File (PDF/Image/Word)", "ملف (PDF/صورة/Word)")}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="input" style={{ padding: ".4rem .6rem" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>{nav("Description", "الوصف")}
                <textarea rows={2} className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={nav("Brief description of the document...", "وصف مختصر للوثيقة...")} />
              </label>
            </div>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? nav("Uploading...", "جارٍ الرفع...") : nav("Upload", "رفع")}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{nav("Cancel", "إلغاء")}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className="px-3 py-1 text-xs font-semibold rounded-full transition-all"
            style={{ background: activeCat === cat ? "var(--brand-primary,#f97316)" : "var(--bg-surface)", color: activeCat === cat ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Document cards */}
      {loading ? (
        <div className="flex justify-center p-10"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
          <FileText size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
          <p style={{ fontWeight: 600 }}>{nav("No documents found", "لا توجد وثائق")}</p>
          {canAdd && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{nav("Click 'Upload Doc' to add a document", "انقر على 'رفع وثيقة' لإضافة وثيقة")}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const meta = CAT_META[doc.category] ?? CAT_META.Other;
            return (
              <Card key={doc.id} className="p-0 overflow-hidden flex flex-col">
                <div style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}30`, padding: "12px 16px", display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <FileText size={18} style={{ color: meta.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</p>
                    <span style={{ display: "inline-block", fontSize: ".72rem", padding: ".1rem .45rem", borderRadius: 999, fontWeight: 700, background: meta.color + "20", color: meta.color }}>{doc.category}</span>
                  </div>
                  {isAdmin && (
                    <button type="button" onClick={() => void handleDelete(doc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: ".2rem", flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: ".5rem", flex: 1 }}>
                  {doc.description && <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{doc.description}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    <Clock size={11} />
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    {doc.uploadedBy && <span>· {doc.uploadedBy.fullName}</span>}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", marginTop: ".25rem" }}>
                    <button type="button" onClick={() => void handleDownload(doc)}
                      style={{ display: "flex", alignItems: "center", gap: ".3rem", padding: ".3rem .65rem", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)", cursor: "pointer", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {doc.filePath ? <ExternalLink size={12} /> : <Download size={12} />}
                      {doc.filePath ? nav("Open", "فتح") : nav("View", "عرض")}
                      <span style={{ fontSize: ".7rem", color: meta.color }}>({doc.downloadCount})</span>
                    </button>
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
