import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { authCopy, type Locale } from "../../content/authCopy";

const getTokenFromSearch = (search: string) => {
  const params = new URLSearchParams(search);
  return params.get("token") || "";
};

type ResetPasswordPageProps = {
  locale: Locale;
};

const getStrength = (password: string): 0 | 1 | 2 | 3 => {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^a-zA-Z\d]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3;
};

const strengthColors: Record<1 | 2 | 3, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#22c55e",
};
const strengthLabels: Record<1 | 2 | 3, { en: string; ar: string }> = {
  1: { en: "Weak", ar: "ضعيف" },
  2: { en: "Fair", ar: "متوسط" },
  3: { en: "Strong", ar: "قوي" },
};

export function ResetPasswordPage({ locale }: ResetPasswordPageProps) {
  const copy = authCopy[locale];
  const isAr = locale === "ar";
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => getTokenFromSearch(location.search),
    [location.search],
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getStrength(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!token) {
      setErrorMessage(copy.resetMissingToken);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(copy.resetMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as { message?: string };
      setMessage(data.message || copy.resetSuccessDefault);
      const isSetup = new URLSearchParams(location.search).get("setup") === "1";
      setTimeout(() => navigate(isSetup ? "/login?welcome=1" : "/login"), 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Reset failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card" dir={isAr ? "rtl" : "ltr"}>
      {/* Icon + heading */}
      <div className="auth-card__heading">
        <div
          style={{
            width: 52,
            height: 52,
            background: "var(--orange-500)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            boxShadow: "0 4px 14px rgba(249,115,22,.35)",
          }}
        >
          <KeyRound size={26} color="#fff" />
        </div>
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2 style={{ margin: ".3rem 0 .4rem" }}>{copy.resetTitle}</h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>
          {copy.resetSubtitle}
        </p>
      </div>

      {/* Success state */}
      {message ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            padding: "1.5rem 0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#f0fdf4",
              border: "2px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <div>
            <p style={{ margin: "0 0 .3rem", fontWeight: 700, fontSize: "1rem" }}>
              {isAr ? "تم تغيير كلمة المرور!" : "Password changed!"}
            </p>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".875rem" }}>
              {isAr ? "جارٍ تحويلك لصفحة الدخول…" : "Redirecting to sign in…"}
            </p>
          </div>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* New password */}
          <div className="form-group">
            <label className="auth-label" htmlFor="rp-new">
              {copy.resetNewPasswordLabel}
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="rp-new"
                type={showNew ? "text" : "password"}
                className="auth-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={copy.passwordPlaceholder}
                required
              />
              <button
                type="button"
                className="auth-input-icon--right"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide" : "Show"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword.length > 0 && strength > 0 && (
              <div style={{ marginTop: ".5rem" }}>
                <div style={{ display: "flex", gap: ".25rem", marginBottom: ".2rem" }}>
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 999,
                        background: strength >= level ? strengthColors[strength] : "var(--border-default)",
                        transition: "background .2s",
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: ".75rem", color: strengthColors[strength], fontWeight: 600 }}>
                  {isAr ? strengthLabels[strength].ar : strengthLabels[strength].en}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="auth-label" htmlFor="rp-confirm">
              {copy.resetConfirmPasswordLabel}
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                className={`auth-input${confirmPassword.length > 0 && !passwordsMatch ? " auth-input--error" : ""}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={copy.confirmPasswordPlaceholder}
                required
              />
              <button
                type="button"
                className="auth-input-icon--right"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide" : "Show"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && passwordsMatch && (
              <span style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".75rem", color: "#16a34a", marginTop: ".3rem", fontWeight: 600 }}>
                <CheckCircle size={13} />
                {isAr ? "كلمتا المرور متطابقتان" : "Passwords match"}
              </span>
            )}
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span className="auth-error-text">
                <AlertCircle size={13} /> {copy.resetMismatch}
              </span>
            )}
          </div>

          {errorMessage ? (
            <div className="auth-alert auth-alert--error" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <AlertCircle size={15} /> {errorMessage}
            </div>
          ) : null}

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                <span className="spinner" style={{ width: 16, height: 16, borderTopColor: "#fff" }} />
                {copy.resetSubmitting}
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                {copy.resetSubmitButton} <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>
      )}

      <footer className="auth-card__footer">
        <span>{copy.resetBackHint}</span>
        <Link className="auth-link auth-link--strong" to="/login">
          {copy.resetBackAction}
        </Link>
      </footer>
    </section>
  );
}
