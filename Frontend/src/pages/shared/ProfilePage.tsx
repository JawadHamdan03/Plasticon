import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL } from "../../lib/api";
import {
  User, Mail, Shield, Calendar, Clock,
  Building2, BadgeCheck,
} from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  ENGINEER: "Engineer",
  ACCOUNTANT: "Accountant",
  WORKER: "Worker",
};

const ROLE_AR: Record<string, string> = {
  ADMIN: "مدير النظام",
  ENGINEER: "مهندس",
  ACCOUNTANT: "محاسب",
  WORKER: "عامل",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

export function ProfilePage() {
  const { user } = useAuth();
  const { locale } = useLocale();

  if (!user) return null;

  const role = String(user.role ?? "WORKER").toUpperCase();
  const roleLabel = locale === "ar" ? (ROLE_AR[role] ?? role) : (ROLE_LABEL[role] ?? role);
  const avatarSrc = user.profileImage
    ? `${API_BASE_URL.replace("/api", "")}/pictures/${user.profileImage}`
    : null;

  const joined = user.createdAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      }).format(new Date(user.createdAt))
    : "—";

  return (
    <div className="profile-page">
      {/* Header card */}
      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name ?? "Avatar"} />
            ) : (
              initials(user.name ?? "U")
            )}
          </div>
          <div>
            <p className="profile-name">{user.name ?? user.username}</p>
            <span className="profile-role-badge">
              <BadgeCheck size={12} />
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-row">
            <span className="profile-info-label"><Mail size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "البريد الإلكتروني" : "Email"}</span>
            <span className="profile-info-value">{user.email ?? "—"}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label"><User size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "اسم المستخدم" : "Username"}</span>
            <span className="profile-info-value">{user.username ?? "—"}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label"><Shield size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "الدور" : "Role"}</span>
            <span className="profile-info-value">{roleLabel}</span>
          </div>
          {(user as any).shiftId && (
            <div className="profile-info-row">
              <span className="profile-info-label"><Clock size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "الوردية" : "Shift"}</span>
              <span className="profile-info-value">#{(user as any).shiftId}</span>
            </div>
          )}
          {(user as any).department && (
            <div className="profile-info-row">
              <span className="profile-info-label"><Building2 size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "القسم" : "Department"}</span>
              <span className="profile-info-value">{(user as any).department}</span>
            </div>
          )}
          <div className="profile-info-row">
            <span className="profile-info-label"><Calendar size={14} style={{ marginRight: ".375rem" }} />{locale === "ar" ? "تاريخ الانضمام" : "Joined"}</span>
            <span className="profile-info-value">{joined}</span>
          </div>
        </div>
      </div>

      {/* Account status card */}
      <div className="profile-card" style={{ padding: "1.25rem 1.5rem" }}>
        <p style={{ margin: "0 0 .75rem", fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-secondary)" }}>
          {locale === "ar" ? "حالة الحساب" : "Account Status"}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: (user as any).isActive !== false ? "var(--green-600)" : "var(--red-600)",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: ".875rem", color: "var(--text-primary)", fontWeight: 500 }}>
            {(user as any).isActive !== false
              ? (locale === "ar" ? "الحساب نشط" : "Account Active")
              : (locale === "ar" ? "الحساب غير نشط" : "Account Inactive")}
          </span>
        </div>
        {(user as any).isEmailVerified !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: ".5rem" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: (user as any).isEmailVerified ? "var(--green-600)" : "var(--yellow-600)",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: ".875rem", color: "var(--text-primary)", fontWeight: 500 }}>
              {(user as any).isEmailVerified
                ? (locale === "ar" ? "البريد مُحقق" : "Email Verified")
                : (locale === "ar" ? "البريد غير مُحقق" : "Email Not Verified")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
