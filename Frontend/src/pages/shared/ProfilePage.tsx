import React, { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  User, Mail, Shield, Calendar, Phone, MapPin, Link2,
  Briefcase, Building2, BadgeCheck, Camera, Upload, Trash2,
  FileText, Award, FilePlus, CheckCircle, AlertCircle, Pencil, X, Save,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, pictureUrl as globalPictureUrl } from "../../lib/api";
import { Card } from "../../components/ui/card";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدير",
  ENGINEER: "مهندس",
  ACCOUNTANT: "محاسب",
  WORKER: "عامل",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  CV: "السيرة الذاتية",
  CERTIFICATE: "شهادة",
  OTHER: "مستند آخر",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function calcCompletion(u: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  linkedIn?: string | null;
  skills?: string | null;
  profileImage?: string | null;
}): number {
  const fields = [
    u.name, u.email, u.phone, u.bio, u.jobTitle,
    u.department, u.dateOfBirth, u.address, u.linkedIn, u.skills, u.profileImage,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

type FormState = {
  fullName: string;
  phone: string;
  bio: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  address: string;
  linkedIn: string;
  skills: string;
};

export function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    bio: "",
    jobTitle: "",
    department: "",
    dateOfBirth: "",
    address: "",
    linkedIn: "",
    skills: "",
  });

  // Photo
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Documents
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [docFileName, setDocFileName] = useState("");
  const [docUploading, setDocUploading] = useState(false);
  const [docMsg, setDocMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sync form when user data changes or edit mode opens
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.name ?? "",
        phone: user.phone ?? "",
        bio: user.bio ?? "",
        jobTitle: user.jobTitle ?? "",
        department: user.department ?? "",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
        address: user.address ?? "",
        linkedIn: user.linkedIn ?? "",
        skills: user.skills ?? "",
      });
    }
  }, [user]);

  if (!user) return null;

  const role = String(user.role ?? "WORKER").toUpperCase();
  const completion = calcCompletion(user);
  const avatarSrc = user.profileImage ? globalPictureUrl(user.profileImage) || null : null;
  const joined = user.createdAt ? formatDate(user.createdAt) : "—";
  const skillsArray = user.skills
    ? user.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  function openEditMode() {
    // Re-sync form with latest user data before opening
    setForm({
      fullName: user?.name ?? "",
      phone: user?.phone ?? "",
      bio: user?.bio ?? "",
      jobTitle: user?.jobTitle ?? "",
      department: user?.department ?? "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
      address: user?.address ?? "",
      linkedIn: user?.linkedIn ?? "",
      skills: user?.skills ?? "",
    });
    setSaveMsg(null);
    setEditMode(true);
  }

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE_URL}/profile/me/photo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("فشل رفع الصورة");
      await refreshUser();
    } catch {
      setPhotoError("فشل رفع الصورة. حاول مرة أخرى.");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/profile/me`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      await refreshUser();
      setEditMode(false);
      setSaveMsg({ type: "ok", text: "تم حفظ الملف الشخصي بنجاح!" });
    } catch {
      setSaveMsg({ type: "err", text: "فشل الحفظ. حاول مرة أخرى." });
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = docInputRef.current?.files?.[0];
    if (!file) {
      setDocMsg({ type: "err", text: "اختر ملفاً أولاً." });
      return;
    }
    setDocUploading(true);
    setDocMsg(null);
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("title", docTitle.trim() || file.name);
      fd.append("documentType", docType);
      const token = localStorage.getItem("plasticon_token");
      const res = await window.fetch(`${API_BASE_URL}/profile/me/documents`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      await refreshUser();
      setDocTitle("");
      setDocType("OTHER");
      setDocFileName("");
      if (docInputRef.current) docInputRef.current.value = "";
      setDocMsg({ type: "ok", text: "تم رفع المستند بنجاح!" });
    } catch {
      setDocMsg({ type: "err", text: "فشل الرفع. حاول مرة أخرى." });
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    setDeletingId(id);
    try {
      const token = localStorage.getItem("plasticon_token");
      await fetch(`${API_BASE_URL}/profile/me/documents/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      await refreshUser();
    } finally {
      setDeletingId(null);
    }
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 860,
        margin: "0 auto",
        padding: "1.5rem 1rem",
      }}
    >
      {/* ── Profile Header ── */}
      <Card style={{ padding: "1.75rem 2rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Avatar + photo upload */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "linear-gradient(135deg,var(--orange-500,#f97316),var(--orange-600,#ea580c))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#fff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(249,115,22,.3)",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user.name ?? ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials(user.name ?? "U")
              )}
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              title="تغيير الصورة"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--orange-500,#f97316)",
                border: "2px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: photoUploading ? "not-allowed" : "pointer",
                opacity: photoUploading ? 0.6 : 1,
              }}
            >
              {photoUploading ? (
                <span
                  className="spinner"
                  style={{ width: 12, height: 12, borderTopColor: "#fff" }}
                />
              ) : (
                <Camera size={13} color="#fff" />
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}
            >
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>{user.name}</h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: ".3rem",
                  padding: ".2rem .7rem",
                  borderRadius: 999,
                  background: "rgba(249,115,22,.12)",
                  color: "var(--orange-600,#ea580c)",
                  fontSize: ".75rem",
                  fontWeight: 700,
                }}
              >
                <BadgeCheck size={12} />
                {ROLE_LABEL[role] ?? role}
              </span>
              {user.profileCompleted && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".3rem",
                    padding: ".2rem .7rem",
                    borderRadius: 999,
                    background: "rgba(34,197,94,.1)",
                    color: "#16a34a",
                    fontSize: ".75rem",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle size={12} /> مكتمل
                </span>
              )}
            </div>
            {user.jobTitle && (
              <p style={{ margin: ".25rem 0 0", color: "var(--text-secondary)", fontSize: ".9rem" }}>
                {user.jobTitle}
                {user.department ? ` · ${user.department}` : ""}
              </p>
            )}
            <p style={{ margin: ".2rem 0 0", fontSize: ".82rem", color: "var(--text-secondary)" }}>
              {user.email}
            </p>

            {/* Completion bar */}
            <div style={{ marginTop: ".75rem" }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: ".3rem" }}
              >
                <span style={{ fontSize: ".75rem", color: "var(--text-secondary)" }}>
                  اكتمال الملف الشخصي
                </span>
                <span
                  style={{
                    fontSize: ".75rem",
                    fontWeight: 700,
                    color: completion >= 80 ? "#16a34a" : "var(--orange-600,#ea580c)",
                  }}
                >
                  {completion}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "var(--border-color,#e5e7eb)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    width: `${completion}%`,
                    background:
                      completion >= 80
                        ? "linear-gradient(90deg,#22c55e,#16a34a)"
                        : "linear-gradient(90deg,var(--orange-400,#fb923c),var(--orange-600,#ea580c))",
                    transition: "width .4s ease",
                  }}
                />
              </div>
            </div>

            {photoError && (
              <p style={{ margin: ".5rem 0 0", fontSize: ".8rem", color: "#dc2626" }}>
                {photoError}
              </p>
            )}
          </div>

          {/* Edit toggle */}
          <button
            type="button"
            onClick={editMode ? () => setEditMode(false) : openEditMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
              padding: ".5rem 1.1rem",
              borderRadius: 8,
              background: editMode ? "var(--border-color,#e5e7eb)" : "var(--orange-500,#f97316)",
              color: editMode ? "var(--text-primary)" : "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: ".85rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {editMode ? (
              <>
                <X size={15} /> إلغاء
              </>
            ) : (
              <>
                <Pencil size={15} /> تعديل الملف الشخصي
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Save result banner — shown outside edit form so it persists after closing */}
      {saveMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
            padding: ".65rem 1rem",
            borderRadius: 8,
            fontSize: ".875rem",
            fontWeight: 500,
            background: saveMsg.type === "ok" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
            color: saveMsg.type === "ok" ? "#16a34a" : "#dc2626",
            border: `1px solid ${saveMsg.type === "ok" ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
          }}
        >
          {saveMsg.type === "ok" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {saveMsg.text}
          <button
            type="button"
            onClick={() => setSaveMsg(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", opacity: 0.6, padding: "2px 4px", fontSize: "1rem", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Personal Info ── */}
      <Card style={{ padding: "1.5rem 2rem" }}>
        <h3
          style={{
            margin: "0 0 1.25rem",
            fontSize: "1rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
          }}
        >
          <User size={16} color="var(--orange-500,#f97316)" /> المعلومات الشخصية
        </h3>

        {/* ── READ VIEW ── */}
        {!editMode && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
              gap: ".9rem 2rem",
            }}
          >
            {[
              { label: "الاسم الكامل", value: user.name, icon: User },
              { label: "البريد الإلكتروني", value: user.email, icon: Mail },
              { label: "الهاتف", value: user.phone, icon: Phone },
              { label: "المسمى الوظيفي", value: user.jobTitle, icon: Briefcase },
              { label: "القسم", value: user.department, icon: Building2 },
              {
                label: "تاريخ الميلاد",
                value: user.dateOfBirth ? formatDate(user.dateOfBirth) : null,
                icon: Calendar,
              },
              { label: "العنوان", value: user.address, icon: MapPin },
              { label: "لينكدإن", value: user.linkedIn, icon: Link2, isLink: true },
              { label: "الدور", value: ROLE_LABEL[role] ?? role, icon: Shield },
              { label: "تاريخ الانضمام", value: joined, icon: Calendar },
            ].map(({ label, value, icon: Icon, isLink }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: ".3rem",
                  }}
                >
                  <Icon size={12} /> {label}
                </span>
                {isLink && value ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: ".875rem",
                      color: "var(--orange-600,#ea580c)",
                      fontWeight: 500,
                      textDecoration: "none",
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </a>
                ) : (
                  <span
                    style={{
                      fontSize: ".875rem",
                      color: value ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: value ? 500 : 400,
                      fontStyle: value ? "normal" : "italic",
                    }}
                  >
                    {value ?? "غير محدد"}
                  </span>
                )}
              </div>
            ))}

            {user.bio && (
              <div
                style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: ".2rem" }}
              >
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--text-secondary)",
                  }}
                >
                  نبذة
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: ".875rem",
                    color: "var(--text-primary)",
                    lineHeight: 1.7,
                  }}
                >
                  {user.bio}
                </p>
              </div>
            )}

            {skillsArray.length > 0 && (
              <div
                style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: ".4rem" }}
              >
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--text-secondary)",
                  }}
                >
                  المهارات
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                  {skillsArray.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: ".2rem .65rem",
                        borderRadius: 999,
                        background: "rgba(249,115,22,.1)",
                        color: "var(--orange-700,#c2410c)",
                        fontSize: ".78rem",
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!user.bio && !user.phone && !user.jobTitle && (
              <div style={{ gridColumn: "1 / -1" }}>
                <p
                  style={{
                    margin: 0,
                    padding: "1rem",
                    borderRadius: 8,
                    background: "rgba(249,115,22,.06)",
                    border: "1px dashed var(--orange-300,#fdba74)",
                    fontSize: ".85rem",
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  ملفك الشخصي غير مكتمل. انقر على{" "}
                  <strong style={{ color: "var(--orange-600,#ea580c)" }}>تعديل الملف الشخصي</strong>{" "}
                  أعلاه لملء بياناتك.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── EDIT FORM ── */}
        {editMode && (
          <form onSubmit={handleSave}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                gap: "1rem",
              }}
            >
              {(
                [
                  { label: "الاسم الكامل", key: "fullName" as const, icon: User, type: "text" },
                  { label: "الهاتف", key: "phone" as const, icon: Phone, type: "tel" },
                  { label: "المسمى الوظيفي", key: "jobTitle" as const, icon: Briefcase, type: "text" },
                  { label: "القسم", key: "department" as const, icon: Building2, type: "text" },
                  { label: "تاريخ الميلاد", key: "dateOfBirth" as const, icon: Calendar, type: "date" },
                  { label: "العنوان", key: "address" as const, icon: MapPin, type: "text" },
                  { label: "رابط لينكدإن", key: "linkedIn" as const, icon: Link2, type: "url" },
                ] as const
              ).map(({ label, key, icon: Icon, type }) => (
                <div key={key}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: ".35rem",
                      fontSize: ".8rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </label>
                  <div className="auth-input-wrapper">
                    <Icon size={15} className="auth-input-icon" />
                    <input
                      type={type}
                      className="auth-input"
                      placeholder={label}
                      {...field(key)}
                    />
                  </div>
                </div>
              ))}

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: ".35rem",
                    fontSize: ".8rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  Bio
                </label>
                <textarea
                  className="auth-input"
                  rows={3}
                  placeholder="Write a short bio about yourself..."
                  style={{ paddingLeft: "1rem", resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: ".35rem",
                    fontSize: ".8rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  Skills{" "}
                  <span style={{ fontWeight: 400, opacity: 0.7 }}>(comma-separated)</span>
                </label>
                <div className="auth-input-wrapper">
                  <BadgeCheck size={15} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. React, Project Management, Quality Control"
                    {...field("skills")}
                  />
                </div>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: ".75rem",
                  paddingTop: ".25rem",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".45rem",
                    padding: ".55rem 1.4rem",
                    borderRadius: 8,
                    background: "var(--orange-500,#f97316)",
                    color: "#fff",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: ".875rem",
                    fontWeight: 700,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <span
                      className="spinner"
                      style={{ width: 15, height: 15, borderTopColor: "#fff" }}
                    />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  style={{
                    padding: ".55rem 1.1rem",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--border-color,#e5e7eb)",
                    cursor: "pointer",
                    fontSize: ".875rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </Card>

      {/* ── Documents ── */}
      <Card style={{ padding: "1.5rem 2rem" }}>
        <h3
          style={{
            margin: "0 0 1.25rem",
            fontSize: "1rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
          }}
        >
          <FileText size={16} color="var(--orange-500,#f97316)" /> Documents & Certificates
        </h3>

        {/* Upload form */}
        <form
          onSubmit={handleDocUpload}
          style={{
            padding: "1rem 1.25rem",
            borderRadius: 10,
            border: "2px dashed var(--orange-300,#fdba74)",
            background: "rgba(249,115,22,.04)",
            marginBottom: "1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 .9rem",
              fontSize: ".82rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
            }}
          >
            <FilePlus size={14} color="var(--orange-500,#f97316)" /> Upload a document
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: ".75rem",
              marginBottom: ".75rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: ".3rem",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Title
              </label>
              <input
                type="text"
                className="auth-input"
                style={{ paddingLeft: "1rem" }}
                placeholder="e.g. Engineering Certificate 2024"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: ".3rem",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Type
              </label>
              <select
                className="auth-input"
                style={{ paddingLeft: "1rem" }}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="CV">سيرة ذاتية</option>
                <option value="CERTIFICATE">شهادة</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".4rem",
                padding: ".45rem .9rem",
                borderRadius: 7,
                background: "var(--border-color,#e5e7eb)",
                border: "none",
                cursor: "pointer",
                fontSize: ".82rem",
                fontWeight: 600,
              }}
            >
              <Upload size={13} /> Choose File
            </button>
            <span
              style={{ fontSize: ".78rem", color: "var(--text-secondary)", fontStyle: "italic" }}
            >
              {docFileName || "No file selected"}
            </span>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) => setDocFileName(e.target.files?.[0]?.name ?? "")}
            />

            <button
              type="submit"
              disabled={docUploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".4rem",
                padding: ".45rem 1rem",
                borderRadius: 7,
                background: "var(--orange-500,#f97316)",
                color: "#fff",
                border: "none",
                cursor: docUploading ? "not-allowed" : "pointer",
                fontSize: ".82rem",
                fontWeight: 700,
                opacity: docUploading ? 0.7 : 1,
                marginLeft: "auto",
              }}
            >
              {docUploading ? (
                <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "#fff" }} />
              ) : (
                <Upload size={13} />
              )}
              {docUploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {docMsg && (
            <div
              style={{
                marginTop: ".65rem",
                display: "flex",
                alignItems: "center",
                gap: ".4rem",
                fontSize: ".82rem",
                fontWeight: 500,
                color: docMsg.type === "ok" ? "#16a34a" : "#dc2626",
              }}
            >
              {docMsg.type === "ok" ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              {docMsg.text}
            </div>
          )}
        </form>

        {/* Document list */}
        {!user.userDocuments?.length ? (
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem",
              color: "var(--text-secondary)",
              fontSize: ".875rem",
              fontStyle: "italic",
            }}
          >
            No documents uploaded yet. Add your CV, certificates, or other files above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
            {user.userDocuments.map((doc) => {
              const Icon =
                doc.documentType === "CV"
                  ? User
                  : doc.documentType === "CERTIFICATE"
                    ? Award
                    : FileText;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".875rem",
                    padding: ".75rem 1rem",
                    borderRadius: 10,
                    border: "1px solid var(--border-color,#e5e7eb)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "rgba(249,115,22,.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} color="var(--orange-500,#f97316)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: ".875rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.title}
                    </p>
                    <p
                      style={{ margin: 0, fontSize: ".75rem", color: "var(--text-secondary)" }}
                    >
                      {DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType} ·{" "}
                      {(doc.fileSize / 1024).toFixed(0)} KB · {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <a
                    href={globalPictureUrl(doc.filePath)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: ".78rem",
                      fontWeight: 600,
                      color: "var(--orange-600,#ea580c)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    disabled={deletingId === doc.id}
                    title="Delete"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: deletingId === doc.id ? "not-allowed" : "pointer",
                      padding: ".25rem",
                      color: "#ef4444",
                      opacity: deletingId === doc.id ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {deletingId === doc.id ? (
                      <span
                        className="spinner"
                        style={{ width: 14, height: 14, borderTopColor: "#ef4444" }}
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
