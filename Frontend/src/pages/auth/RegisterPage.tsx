import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Lock, Eye, EyeOff, Mail, Phone, Hash, Factory,
  IdCard, Shield, ArrowRight, Camera,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

type Fields = {
  fullName: string;
  username: string;
  nationalId: string;
  email: string;
  phone: string;
  role: Role;
  shiftId: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof Fields, string>>;

function validateAll(f: Fields, isAdmin: boolean): FieldErrors {
  const e: FieldErrors = {};
  if (!f.fullName.trim()) e.fullName = "Full name is required";
  if (!/^[A-Za-z0-9_]{3,30}$/.test(f.username.trim()))
    e.username = "3-30 characters, letters, numbers and underscore only";
  if (!/^\d{9}$/.test(f.nationalId.trim()))
    e.nationalId = "National ID must be exactly 9 digits";
  if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = "Enter a valid email address";
  if (f.phone.trim() && !/^\d{10}$/.test(f.phone.trim()))
    e.phone = "Phone must be exactly 10 digits";
  if (
    f.shiftId.trim() &&
    (!/^\d+$/.test(f.shiftId.trim()) || Number(f.shiftId) < 1)
  )
    e.shiftId = "Shift ID must be a positive number";
  if (f.password.length < 8)
    e.password = "Password must be at least 8 characters";
  if (f.confirmPassword !== f.password)
    e.confirmPassword = "Passwords do not match";
  return e;
}

type InputRowProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
};

function InputRow({ id, label, icon, error, children }: InputRowProps) {
  return (
    <div className="form-group">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrapper">
        <span className="auth-input-icon">{icon}</span>
        {children}
      </div>
      {error && <span className="auth-error-text">{error}</span>}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [fields, setFields] = useState<Fields>({
    fullName: "",
    username: "",
    nationalId: "",
    email: "",
    phone: "",
    role: "WORKER",
    shiftId: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((p) => ({ ...p, [k]: e.target.value }));

  const blur = (k: keyof Fields) => () => setTouched((p) => ({ ...p, [k]: true }));

  const allTouched = Object.keys(fields).reduce((a, k) => ({ ...a, [k]: true }), {}) as Record<keyof Fields, boolean>;
  const liveErrors = validateAll(fields, isAdmin);
  const displayErrors: FieldErrors = Object.fromEntries(
    Object.entries(liveErrors).filter(([k]) => touched[k as keyof Fields]),
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(allTouched);
    const errs = validateAll(fields, isAdmin);
    if (Object.keys(errs).length > 0) return;
    if (!isAdmin) {
      setServerError("Only administrators can create new accounts.");
      return;
    }

    setServerError("");
    setSubmitting(true);
    try {
      await register({
        fullName: fields.fullName.trim(),
        username: fields.username.trim(),
        nationalId: fields.nationalId.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim(),
        role: fields.role,
        shiftId: fields.shiftId.trim(),
        password: fields.password,
        confirmPassword: fields.confirmPassword,
        profileImage,
      });
      navigate("/login");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Registration failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-root" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
      {/* Illustration */}
      <div className="auth-illustration">
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff" }}>
          <div
            style={{
              width: 72, height: 72,
              background: "rgba(255,255,255,.15)",
              borderRadius: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Shield size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 .5rem" }}>
            Register Account
          </h2>
          <p style={{ opacity: 0.75, fontSize: ".9rem", margin: 0, maxWidth: 240 }}>
            Admin-only action. Fill in all required fields below.
          </p>

          <div
            style={{
              marginTop: "2.5rem",
              background: "rgba(255,255,255,.08)",
              borderRadius: 16,
              padding: "1.25rem",
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 .75rem", fontWeight: 700, fontSize: ".88rem" }}>
              Account Roles
            </p>
            {[
              { role: "WORKER", desc: "Factory floor access" },
              { role: "ENGINEER", desc: "Quality & maintenance" },
              { role: "ACCOUNTANT", desc: "Finance & reports" },
              { role: "ADMIN", desc: "Full system access" },
            ].map((r) => (
              <div
                key={r.role}
                style={{
                  display: "flex", alignItems: "center", gap: ".5rem",
                  padding: ".4rem 0",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: r.role === fields.role ? "var(--orange-400)" : "rgba(255,255,255,.3)",
                    transition: "background .2s",
                  }}
                />
                <span style={{ fontSize: ".82rem", fontWeight: 600 }}>{r.role}</span>
                <span style={{ fontSize: ".75rem", opacity: 0.6, marginLeft: "auto" }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-form-side" style={{ padding: "1.5rem", overflowY: "auto" }}>
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <div className="auth-card__logo">
            <div
              style={{
                width: 36, height: 36,
                background: "var(--orange-500)", borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 3px 8px rgba(249,115,22,.3)",
              }}
            >
              <Factory size={20} color="#fff" />
            </div>
            <span className="auth-card__logo-text">Plasticon</span>
          </div>

          <div className="auth-card__heading">
            <h1 style={{ fontSize: "1.5rem" }}>Create Account</h1>
            <p>Fill in the details to register a new user</p>
          </div>

          {!isAdmin && (
            <div className="auth-alert auth-alert--error" style={{ marginBottom: "1.25rem" }}>
              Only administrators can create new accounts. Please contact your admin.
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="grid-cols-2">
              <InputRow id="reg-name" label="Full Name *" icon={<User size={15} />} error={displayErrors.fullName}>
                <input
                  id="reg-name"
                  type="text"
                  className={`auth-input${displayErrors.fullName ? " auth-input--error" : ""}`}
                  placeholder="Ahmad Al-Hassan"
                  value={fields.fullName}
                  onChange={set("fullName")}
                  onBlur={blur("fullName")}
                  autoComplete="name"
                />
              </InputRow>

              <InputRow id="reg-username" label="Username *" icon={<Hash size={15} />} error={displayErrors.username}>
                <input
                  id="reg-username"
                  type="text"
                  className={`auth-input${displayErrors.username ? " auth-input--error" : ""}`}
                  placeholder="ahmad_hassan"
                  value={fields.username}
                  onChange={set("username")}
                  onBlur={blur("username")}
                  autoComplete="username"
                />
              </InputRow>

              <InputRow id="reg-national" label="National ID *" icon={<IdCard size={15} />} error={displayErrors.nationalId}>
                <input
                  id="reg-national"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  className={`auth-input${displayErrors.nationalId ? " auth-input--error" : ""}`}
                  placeholder="123456789"
                  value={fields.nationalId}
                  onChange={set("nationalId")}
                  onBlur={blur("nationalId")}
                />
              </InputRow>

              <InputRow id="reg-email" label="Email *" icon={<Mail size={15} />} error={displayErrors.email}>
                <input
                  id="reg-email"
                  type="email"
                  className={`auth-input${displayErrors.email ? " auth-input--error" : ""}`}
                  placeholder="user@company.com"
                  value={fields.email}
                  onChange={set("email")}
                  onBlur={blur("email")}
                  autoComplete="email"
                />
              </InputRow>

              <InputRow id="reg-phone" label="Phone" icon={<Phone size={15} />} error={displayErrors.phone}>
                <input
                  id="reg-phone"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  className={`auth-input${displayErrors.phone ? " auth-input--error" : ""}`}
                  placeholder="0791234567"
                  value={fields.phone}
                  onChange={set("phone")}
                  onBlur={blur("phone")}
                />
              </InputRow>

              <InputRow id="reg-shift" label="Shift ID" icon={<Hash size={15} />} error={displayErrors.shiftId}>
                <input
                  id="reg-shift"
                  type="text"
                  inputMode="numeric"
                  className={`auth-input${displayErrors.shiftId ? " auth-input--error" : ""}`}
                  placeholder="1"
                  value={fields.shiftId}
                  onChange={set("shiftId")}
                  onBlur={blur("shiftId")}
                />
              </InputRow>
            </div>

            {/* Role select */}
            <div className="form-group">
              <label className="auth-label" htmlFor="reg-role">Role *</label>
              {isAdmin ? (
                <select
                  id="reg-role"
                  className="auth-input auth-input--no-icon form-select"
                  value={fields.role}
                  onChange={set("role")}
                  style={{ paddingLeft: ".75rem" }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="auth-input auth-input--no-icon"
                  value="WORKER"
                  readOnly
                  style={{ paddingLeft: ".75rem", background: "var(--gray-50)" }}
                />
              )}
            </div>

            {/* Passwords */}
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="auth-label" htmlFor="reg-pass">Password *</label>
                <div className="auth-input-wrapper">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="reg-pass"
                    type={showPass ? "text" : "password"}
                    className={`auth-input${displayErrors.password ? " auth-input--error" : ""}`}
                    placeholder="Min 8 characters"
                    value={fields.password}
                    onChange={set("password")}
                    onBlur={blur("password")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-input-icon--right"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {displayErrors.password && <span className="auth-error-text">{displayErrors.password}</span>}
              </div>

              <div className="form-group">
                <label className="auth-label" htmlFor="reg-confirm">Confirm Password *</label>
                <div className="auth-input-wrapper">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    className={`auth-input${displayErrors.confirmPassword ? " auth-input--error" : ""}`}
                    placeholder="Repeat password"
                    value={fields.confirmPassword}
                    onChange={set("confirmPassword")}
                    onBlur={blur("confirmPassword")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-input-icon--right"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {displayErrors.confirmPassword && (
                  <span className="auth-error-text">{displayErrors.confirmPassword}</span>
                )}
              </div>
            </div>

            {/* Profile photo */}
            <div className="form-group">
              <label className="auth-label">Profile Photo (optional)</label>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: ".625rem",
                  padding: ".625rem .875rem",
                  border: "1.5px dashed var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "border-color .18s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--orange-400)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
              >
                <Camera size={18} style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontSize: ".84rem", color: "var(--text-secondary)" }}>
                  {profileImage ? profileImage.name : "Click to upload photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: "none" }}
                  onChange={(e) => setProfileImage(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {serverError && (
              <div className="auth-alert auth-alert--error">{serverError}</div>
            )}

            <button
              type="submit"
              className="auth-btn"
              disabled={submitting || !isAdmin}
            >
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Creating account...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                  Create Account <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
