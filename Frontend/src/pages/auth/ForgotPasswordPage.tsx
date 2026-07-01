import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Factory,
} from "lucide-react";
import { API_BASE_URL, readApiError } from "../../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as {
        message?: string;
        resetUrl?: string;
      };
      setSent(true);
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success state ── */
  if (sent) {
    return (
      <div className="auth-card">
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".6rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: "var(--orange-500,#f97316)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(249,115,22,.3)",
            }}
          >
            <Factory size={20} color="#fff" />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              color: "var(--text-primary)",
            }}
          >
            لاميكو
          </span>
        </div>

        <div style={{ textAlign: "center", padding: ".5rem 0 1rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "rgba(34,197,94,.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              border: "2px solid rgba(34,197,94,.2)",
            }}
          >
            <CheckCircle size={34} color="#22c55e" />
          </div>
          <h2
            style={{
              margin: "0 0 .6rem",
              fontSize: "1.55rem",
              fontWeight: 800,
            }}
          >
            تحقق من بريدك الوارد
          </h2>
          <p
            style={{
              margin: "0 0 .4rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              fontSize: ".9rem",
            }}
          >
            لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى
          </p>
          <p
            style={{
              margin: "0 0 1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontSize: ".92rem",
            }}
          >
            {email}
          </p>

          {resetUrl && (
            <a
              href={resetUrl}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: ".5rem",
                padding: ".7rem 1.5rem",
                borderRadius: 10,
                background: "var(--orange-500,#f97316)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: ".9rem",
                marginBottom: "1rem",
                boxShadow: "0 4px 14px rgba(249,115,22,.35)",
              }}
            >
              فتح رابط الإعادة <ArrowRight size={16} />
            </a>
          )}

          <p
            style={{
              fontSize: ".82rem",
              color: "var(--text-secondary)",
              margin: "0 0 1.25rem",
              lineHeight: 1.6,
            }}
          >
            لم تستلمه؟ تحقق من مجلد البريد المزعج أو حاول مجدداً بعد دقائق.
          </p>

          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: ".4rem",
              fontSize: ".85rem",
              color: "var(--orange-600,#ea580c)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div className="auth-card">
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".6rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            background: "var(--orange-500,#f97316)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(249,115,22,.3)",
          }}
        >
          <Factory size={20} color="#fff" />
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: "1rem",
            color: "var(--text-primary)",
          }}
        >
          لاميكو
        </span>
      </div>

      {/* Icon + heading */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            width: 52,
            height: 52,
            background: "rgba(249,115,22,.1)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            border: "1px solid rgba(249,115,22,.2)",
          }}
        >
          <Mail size={26} color="var(--orange-500,#f97316)" />
        </div>
        <h1
          style={{
            margin: "0 0 .4rem",
            fontSize: "1.65rem",
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          نسيت كلمة المرور؟
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            fontSize: ".9rem",
            lineHeight: 1.65,
          }}
        >
          لا تقلق — أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين آمن.
        </p>
      </div>

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="auth-label" htmlFor="forgot-email">
            بريدك الإلكتروني للعمل
          </label>
          <div className="auth-input-wrapper">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="forgot-email"
              type="email"
              className={`auth-input${error ? " auth-input--error" : ""}`}
              placeholder="بريدك@الشركة.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div
            className="auth-alert auth-alert--error"
            style={{ display: "flex", alignItems: "center", gap: ".5rem" }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button
          type="submit"
          className="auth-btn"
          disabled={submitting || !email.trim()}
          style={{ marginTop: ".25rem" }}
        >
          {submitting ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: ".5rem",
              }}
            >
              <span
                className="spinner"
                style={{ width: 16, height: 16, borderTopColor: "#fff" }}
              />
              جاري إرسال الرابط...
            </span>
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: ".5rem",
              }}
            >
              إرسال رابط الاستعادة <ArrowRight size={16} />
            </span>
          )}
        </button>
      </form>

      {/* Info note */}
      <div
        style={{
          marginTop: "1.25rem",
          padding: ".75rem 1rem",
          borderRadius: 8,
          background: "rgba(249,115,22,.06)",
          border: "1px solid rgba(249,115,22,.15)",
          fontSize: ".8rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        🔒 رابط الاستعادة ينتهي خلال <strong>15 دقيقة</strong> ويمكن استخدامه مرة واحدة فقط.
      </div>

      {/* Footer */}
      <p
        style={{
          textAlign: "center",
          marginTop: "1.5rem",
          fontSize: ".85rem",
          color: "var(--text-secondary)",
        }}
      >
        تتذكر كلمة المرور؟{" "}
        <Link
          to="/login"
          style={{
            color: "var(--orange-600,#ea580c)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
