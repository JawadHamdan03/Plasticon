import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  FileText, Clock, Plus, X, Trash2, ImageIcon, Eye,
  Search, Maximize2, Minimize2, Download, Pencil, Check,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ModulePageShell } from "../../components/ModulePageShell";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, pictureUrl as globalPictureUrl } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function picUrl(filename: string) {
  return globalPictureUrl(filename);
}

function isImageMime(mime?: string | null, fp?: string | null): boolean {
  if (mime?.startsWith("image/")) return true;
  if (fp) return /\.(png|jpe?g|gif|webp)$/i.test(fp);
  return false;
}

function isPdfMime(mime?: string | null, fp?: string | null): boolean {
  if (mime === "application/pdf") return true;
  if (fp) return /\.pdf$/i.test(fp);
  return false;
}

interface TechDoc {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  images?: string[];
  downloadCount: number;
  uploadedBy?: { id: number; fullName: string };
  createdAt: string;
}

type ImagePreview = { src: string; alt: string };
type DocViewer   = { src: string; title: string; isPdf: boolean };

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
  const isAdmin = user?.role === "ADMIN";
  const canAdd  = user?.role === "ENGINEER" || isAdmin;

  const [docs,       setDocs]      = useState<TechDoc[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [activeCat,  setActiveCat] = useState("All");
  const [search,     setSearch]    = useState("");
  const [showForm,   setShowForm]  = useState(false);
  const [form,       setForm]      = useState(emptyForm());
  const [file,       setFile]      = useState<File | null>(null);
  const [photoFiles, setPhotoFiles]= useState<File[]>([]);
  const [saving,     setSaving]    = useState(false);
  const [error,      setError]     = useState("");
  const [success,    setSuccess]   = useState("");
  const fileRef   = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editDoc,  setEditDoc]  = useState<TechDoc | null>(null);
  const [editForm, setEditForm] = useState({ title: "", category: "Manual", description: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Image lightbox
  const [preview,  setPreview] = useState<ImagePreview | null>(null);
  const [zoom,     setZoom]    = useState(1);
  const openPreview  = (src: string, alt: string) => { setPreview({ src, alt }); setZoom(1); };
  const closePreview = () => { setPreview(null); setZoom(1); };
  const zoomIn  = () => setZoom(z => Math.min(5, parseFloat((z + 0.5).toFixed(1))));
  const zoomOut = () => setZoom(z => Math.max(0.5, parseFloat((z - 0.5).toFixed(1))));
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.5, parseFloat((z - e.deltaY / 800).toFixed(2)))));
  };

  // PDF / doc viewer
  const [docViewer,     setDocViewer]     = useState<DocViewer | null>(null);
  const [docFullscreen, setDocFullscreen] = useState(true);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tech-documents`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) { const d = await res.json(); setDocs(Array.isArray(d) ? d : (d.data ?? [])); }
    } catch { } finally { setLoading(false); }
  };

  const addPhotoFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter(f => f.type.startsWith("image/"));
    setPhotoFiles(prev => [...prev, ...arr].slice(0, 10));
  };

  const removePhotoFile = (idx: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    if (photosRef.current) photosRef.current.value = "";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.title.trim()) { setError("العنوان مطلوب"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (file) fd.append("file", file);
      photoFiles.forEach(f => fd.append("images", f));

      const res = await fetch(`${API_BASE_URL}/tech-documents`, {
        method: "POST", headers: authHeaders(), credentials: "include", body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to upload");
      }
      setSuccess("تم رفع الوثيقة بنجاح");
      setForm(emptyForm()); setFile(null); setPhotoFiles([]);
      if (fileRef.current)   fileRef.current.value   = "";
      if (photosRef.current) photosRef.current.value = "";
      setShowForm(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally { setSaving(false); }
  };

  const openEdit = (doc: TechDoc) => {
    setEditDoc(doc);
    setEditForm({ title: doc.title, category: doc.category, description: doc.description ?? "" });
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDoc || !editForm.title.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tech-documents/${editDoc.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editForm.title.trim(),
          category: editForm.category,
          description: editForm.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to update");
      }
      setEditDoc(null);
      setSuccess("تم تحديث الوثيقة");
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally { setEditSaving(false); }
  };

  const openDocFile = async (doc: TechDoc) => {
    if (!doc.filePath) return;
    await fetch(`${API_BASE_URL}/tech-documents/${doc.id}/download`, {
      method: "PATCH", headers: authHeaders(), credentials: "include",
    }).catch(() => {});
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d));

    if (isImageMime(doc.mimeType, doc.filePath)) {
      openPreview(picUrl(doc.filePath), doc.title);
    } else {
      setDocViewer({ src: picUrl(doc.filePath), title: doc.title, isPdf: isPdfMime(doc.mimeType, doc.filePath) });
      setDocFullscreen(true);
    }
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

  const q = search.trim().toLowerCase();
  const filtered = docs.filter(d => {
    const catOk = activeCat === "All" || d.category === activeCat;
    const searchOk = !q
      || d.title.toLowerCase().includes(q)
      || (d.description ?? "").toLowerCase().includes(q)
      || d.category.toLowerCase().includes(q)
      || (d.uploadedBy?.fullName ?? "").toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const recentCount    = docs.filter(d => new Date(d.createdAt) > new Date(Date.now() - 30 * 86400000)).length;
  const totalDownloads = docs.reduce((s, d) => s + d.downloadCount, 0);

  const viewerStyle = docFullscreen
    ? { position: "fixed" as const, inset: 0, zIndex: 1100, background: "var(--bg-card)", display: "flex", flexDirection: "column" as const, borderRadius: 0, padding: 0, maxWidth: "none", width: "100vw", height: "100vh", gap: 0 }
    : { width: "min(92vw, 1100px)", height: "90vh", maxWidth: "none", padding: ".75rem 1rem", overflow: "hidden", gap: ".5rem" };

  return (
    <ModulePageShell
      title={"التوثيق التقني"}
      subtitle={"الوصول وإدارة الموارد التقنية والكتيبات"}
      icon={<FileText size={22} />}
      actions={canAdd ? (
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "إلغاء" : "رفع وثيقة"}
        </Button>
      ) : undefined}
    >
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "إجمالي الوثائق",   value: docs.length,    gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { label: "مضاف مؤخراً",      value: recentCount,    gradient: "linear-gradient(135deg,#10b981,#059669)" },
          { label: "إجمالي المشاهدات", value: totalDownloads, gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 14, padding: "1rem 1.1rem", background: k.gradient, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
            <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</p>
            <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Upload form */}
      {canAdd && showForm && (
        <Card className="p-5 mb-5 border-2 border-(--accent)">
          <h3 style={{ margin: "0 0 1rem", fontSize: ".95rem", fontWeight: 700 }}>
            {"رفع وثيقة جديدة"}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: "1rem" }}>
            {[
              { icon: "📄", label: "PDF" },
              { icon: "📝", label: "Word (.doc / .docx)" },
              { icon: "🖼️", label: "صورة" },
            ].map(t => (
              <span key={t.label} style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".75rem", padding: ".2rem .65rem", borderRadius: 99, background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>
          {error   && <div className="auth-alert auth-alert--error mb-3">{error}</div>}
          {success && <div className="auth-alert mb-3">{success}</div>}
          <form className="module-form" onSubmit={e => void submit(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
              <label style={{ gridColumn: "1 / -1" }}>{"العنوان"} *
                <input type="text" className="input" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={"مثال: دليل الآلة أ"} required />
              </label>
              <label>{"الفئة"}
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                {"الملف الرئيسي"}
                <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginLeft: ".3rem" }}>PDF / Word / Image</span>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="input"
                  style={{ padding: ".4rem .6rem" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>{"الوصف"}
                <textarea rows={2} className="input" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={"وصف مختصر..."} />
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: ".4rem", fontSize: ".85rem", fontWeight: 600 }}>
                  <ImageIcon size={13} style={{ display: "inline", marginInlineEnd: ".3rem", verticalAlign: "middle" }} />
                  {"صور إضافية (حتى 10)"}
                  <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginLeft: ".3rem", fontWeight: 400 }}>PNG · JPG · WebP</span>
                </label>
                <input ref={photosRef} type="file" accept="image/*" multiple className="input"
                  style={{ padding: ".4rem .6rem" }} onChange={e => addPhotoFiles(e.target.files)} />
                {photoFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".6rem" }}>
                    {photoFiles.map((f, i) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "2px solid var(--border-default)" }}>
                          <img src={url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onLoad={() => URL.revokeObjectURL(url)} />
                          <button type="button" onClick={() => removePhotoFile(i)}
                            style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.55)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 11, lineHeight: 1 }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <Button type="submit" size="sm" disabled={saving}>{saving ? "جارٍ الرفع..." : "رفع"}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>{"إلغاء"}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Success banner */}
      {success && !showForm && (
        <div className="auth-alert mb-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {success}
          <button type="button" onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Search + Category filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: ".7rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
          <input type="search" className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={"بحث في الوثائق…"}
            style={{ paddingLeft: "2.1rem", paddingRight: search ? "2rem" : undefined }} />
          {search && (
            <button type="button" onClick={() => setSearch("")}
              style={{ position: "absolute", right: ".6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1, fontSize: "1rem" }}>×</button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className="px-3 py-1 text-xs font-semibold rounded-full transition-all"
              style={{ background: activeCat === cat ? "var(--brand-primary,#f97316)" : "var(--bg-surface)", color: activeCat === cat ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <p style={{ fontSize: ".8rem", color: "var(--text-secondary)", marginBottom: ".75rem" }}>
          {filtered.length} {"نتيجة لـ"} "<strong>{search}</strong>"
        </p>
      )}

      {/* Document cards */}
      {loading ? (
        <div className="flex justify-center p-10"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center" style={{ color: "var(--text-secondary)" }}>
          <FileText size={32} style={{ margin: "0 auto 12px", opacity: .3, display: "block" }} />
          <p style={{ fontWeight: 600 }}>
            {q ? "لا توجد وثائق تطابق البحث" : "لا توجد وثائق"}
          </p>
          {canAdd && !q && <p style={{ fontSize: ".85rem", marginTop: ".25rem" }}>{"انقر على 'رفع وثيقة' لإضافة وثيقة"}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const meta        = CAT_META[doc.category] ?? CAT_META.Other;
            const photos      = doc.images ?? [];
            const hasFile     = !!doc.filePath;
            const fileIsImage = hasFile && isImageMime(doc.mimeType, doc.filePath);
            const openLabel   = fileIsImage ? "عرض الصورة" : "فتح الوثيقة";

            return (
              <Card key={doc.id} className="p-0 overflow-hidden flex flex-col" style={{ border: "1px solid var(--border-default)" }}>
                {/* Clickable header */}
                <div
                  role={hasFile ? "button" : undefined}
                  tabIndex={hasFile ? 0 : undefined}
                  onClick={hasFile ? () => void openDocFile(doc) : undefined}
                  onKeyDown={hasFile ? e => { if (e.key === "Enter" || e.key === " ") void openDocFile(doc); } : undefined}
                  style={{ background: meta.bg, borderBottom: `2px solid ${meta.color}30`, padding: "12px 16px", display: "flex", alignItems: "center", gap: ".75rem", cursor: hasFile ? "pointer" : "default", transition: "filter .15s" }}
                  onMouseEnter={e => { if (hasFile) (e.currentTarget as HTMLElement).style.filter = "brightness(.95)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ""; }}
                >
                  <FileText size={18} style={{ color: meta.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</p>
                    <span style={{ display: "inline-block", fontSize: ".72rem", padding: ".1rem .45rem", borderRadius: 999, fontWeight: 700, background: meta.color + "20", color: meta.color }}>{doc.category}</span>
                    {hasFile && <span style={{ marginInlineStart: ".4rem", fontSize: ".7rem", color: meta.color, opacity: .75 }}>— {openLabel}</span>}
                  </div>
                  {canAdd && (
                    <div style={{ display: "flex", gap: ".2rem", flexShrink: 0 }}>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); openEdit(doc); }}
                        title={"تعديل"}
                        style={{ background: "none", border: "none", cursor: "pointer", color: meta.color, padding: ".2rem" }}>
                        <Pencil size={13} />
                      </button>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); void handleDelete(doc.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: ".2rem" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: ".5rem", flex: 1 }}>
                  {doc.description && <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{doc.description}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    <Clock size={11} />
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    {doc.uploadedBy && <span>· {doc.uploadedBy.fullName}</span>}
                    {hasFile && <span style={{ color: meta.color }}>· {doc.downloadCount} {"مشاهدة"}</span>}
                  </div>
                  {photos.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginTop: ".25rem" }}>
                      {photos.map((img, i) => (
                        <button key={i} type="button"
                          title={"انقر لعرض الصورة"}
                          onClick={() => openPreview(picUrl(img), `${doc.title} — ${"صورة"} ${i + 1}`)}
                          style={{ position: "relative", width: 58, height: 58, borderRadius: 6, overflow: "hidden", border: "2px solid var(--border-default)", cursor: "pointer", background: "none", padding: 0, flexShrink: 0 }}
                          onMouseEnter={e => { (e.currentTarget.querySelector(".photo-overlay") as HTMLElement | null)?.style.setProperty("background", "rgba(0,0,0,.35)"); }}
                          onMouseLeave={e => { (e.currentTarget.querySelector(".photo-overlay") as HTMLElement | null)?.style.setProperty("background", "rgba(0,0,0,0)"); }}
                        >
                          <img src={picUrl(img)} alt={`photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <span className="photo-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
                            <Eye size={13} color="#fff" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {hasFile && (
                    <button type="button"
                      onClick={() => void openDocFile(doc)}
                      style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", padding: ".45rem .8rem", borderRadius: 8, border: `1.5px solid ${meta.color}`, background: meta.color + "12", cursor: "pointer", fontSize: ".8rem", fontWeight: 700, color: meta.color, transition: "background .15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = meta.color + "28"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = meta.color + "12"; }}
                    >
                      {fileIsImage ? <Eye size={13} /> : <Maximize2 size={13} />}
                      {openLabel}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editDoc && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1099 }} onClick={() => setEditDoc(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1100, background: "var(--bg-card)", borderRadius: 16, padding: "1.5rem", width: "min(92vw,520px)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>{"تعديل الوثيقة"}</h3>
            <form onSubmit={e => void submitEdit(e)}>
              <label style={{ display: "block", marginBottom: ".75rem" }}>
                <span style={{ fontSize: ".83rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: ".3rem" }}>{"العنوان"} *</span>
                <input className="input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required />
              </label>
              <label style={{ display: "block", marginBottom: ".75rem" }}>
                <span style={{ fontSize: ".83rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: ".3rem" }}>{"الفئة"}</span>
                <select className="input" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={{ display: "block", marginBottom: "1rem" }}>
                <span style={{ fontSize: ".83rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: ".3rem" }}>{"الوصف"}</span>
                <textarea rows={3} className="input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder={"وصف مختصر..."} />
              </label>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <Button type="submit" size="sm" disabled={editSaving}>
                  <Check size={13} />
                  {editSaving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditDoc(null)}>{"إلغاء"}</Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Fullscreen / windowed PDF · doc viewer ── */}
      {docViewer && (
        <>
          {!docFullscreen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1099 }} onClick={() => setDocViewer(null)} />
          )}
          <div className={docFullscreen ? undefined : "settings-image-modal__content"} style={viewerStyle}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: docFullscreen ? ".65rem 1.1rem" : ".25rem 0", borderBottom: docFullscreen ? "1px solid var(--border-default)" : undefined, flexShrink: 0, background: docFullscreen ? "var(--bg-surface)" : undefined }}>
              <FileText size={15} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docViewer.title}</span>
              <a href={docViewer.src} download onClick={e => e.stopPropagation()}
                style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none", padding: ".3rem .6rem", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}>
                <Download size={13} />
                {"تحميل"}
              </a>
              <button type="button" onClick={() => setDocFullscreen(f => !f)}
                title={docFullscreen ? "تصغير" : "تكبير"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)", cursor: "pointer", color: "var(--text-secondary)" }}>
                {docFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button type="button" onClick={() => setDocViewer(null)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--bg-surface)", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1rem" }}>✕</button>
            </div>
            {/* Viewer — object for PDFs, iframe for Word/other */}
            {docViewer.isPdf ? (
              <object
                data={docViewer.src}
                type="application/pdf"
                style={{ flex: 1, width: "100%", border: "none", display: "block" }}
              >
                <embed src={docViewer.src} type="application/pdf" style={{ width: "100%", height: "100%" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", color: "var(--text-secondary)" }}>
                  <FileText size={48} style={{ opacity: .3 }} />
                  <p style={{ fontWeight: 600 }}>{"لا يمكن عرض ملف PDF في هذا المتصفح."}</p>
                  <a href={docViewer.src} download style={{ padding: ".5rem 1.25rem", borderRadius: 8, background: "var(--brand-primary,#f97316)", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                    {"تحميل PDF"}
                  </a>
                </div>
              </object>
            ) : (
              <iframe src={docViewer.src} title={docViewer.title} style={{ flex: 1, width: "100%", border: "none" }} />
            )}
          </div>
        </>
      )}

      {/* ── Image lightbox ── */}
      {preview && (
        <div className="settings-image-modal" role="dialog" aria-modal="true" onClick={closePreview}>
          <div className="settings-image-modal__content" onClick={e => e.stopPropagation()}>
            <div className="settings-image-modal__toolbar">
              <button type="button" className="img-zoom-btn" onClick={zoomOut} disabled={zoom <= 0.5}>−</button>
              <span className="img-zoom-pct">{Math.round(zoom * 100)}%</span>
              <button type="button" className="img-zoom-btn" onClick={zoomIn}  disabled={zoom >= 5}>+</button>
              {zoom !== 1 && <button type="button" className="img-zoom-btn img-zoom-btn--reset" onClick={() => setZoom(1)}>↺</button>}
              <div style={{ flex: 1 }} />
              <button type="button" className="auth-button auth-button--ghost" onClick={closePreview}>✕ {"إغلاق"}</button>
            </div>
            <div className="settings-image-modal__viewport" onWheel={handleWheel}>
              <img src={preview.src} alt={preview.alt}
                style={{ transform: `scale(${zoom})`, cursor: zoom < 5 ? "zoom-in" : "default" }}
                onDoubleClick={() => setZoom(z => (z < 2 ? 3 : 1))}
                draggable={false} />
            </div>
            <p className="img-zoom-hint">
              {locale === "ar"
                ? "عجلة الفأرة للتكبير · نقر مزدوج للتكبير/التصغير"
                : "Scroll wheel to zoom · Double-click to toggle zoom"}
            </p>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
