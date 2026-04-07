import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authCopy, type Locale } from "../content/authCopy";
import { useAuth } from "../context/AuthContext";
import { TextField } from "../components/FormField";

type LoginPageProps = {
  locale: Locale;
};

export function LoginPage({ locale }: LoginPageProps) {
  const copy = authCopy[locale];
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signIn({ email, password });

      if (rememberMe) {
        window.localStorage.setItem("plasticon_remember_me", "true");
      } else {
        window.localStorage.removeItem("plasticon_remember_me");
      }

      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.loginErrorPrefix}: ${error.message}`
          : copy.loginErrorPrefix,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-card__heading">
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2>{copy.loginTitle}</h2>
        <p>{copy.loginSubtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <TextField
          label={copy.emailLabel}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailPlaceholder}
          autoComplete="email"
          required
        />

        <TextField
          label={copy.passwordLabel}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          autoComplete="current-password"
          rightAction={
            <button
              type="button"
              className="field__action-button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? locale === "ar"
                    ? "إخفاء كلمة المرور"
                    : "Hide password"
                  : locale === "ar"
                    ? "إظهار كلمة المرور"
                    : "Show password"
              }
              title={
                showPassword
                  ? locale === "ar"
                    ? "إخفاء كلمة المرور"
                    : "Hide password"
                  : locale === "ar"
                    ? "إظهار كلمة المرور"
                    : "Show password"
              }
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4.2 4.2a1 1 0 1 0-1.4 1.4l2.2 2.2C3.4 9.1 2.2 10.7 1.4 12a1 1 0 0 0 0 1c2 3.3 5.7 6 10.6 6 2 0 3.8-.4 5.3-1.2l2.5 2.5a1 1 0 1 0 1.4-1.4ZM8.1 10.9l1.6 1.6a2.5 2.5 0 0 0 2.8 2.8l1.6 1.6A4.5 4.5 0 0 1 8.1 10.9Zm7.6 3.4L9.7 8.3A4.5 4.5 0 0 1 15.7 14.3Zm2.1-2.1A7.9 7.9 0 0 0 12 5c-1.2 0-2.4.2-3.4.6a1 1 0 1 0 .8 1.8A5.9 5.9 0 0 1 12 7a6 6 0 0 1 5.2 3c.4.7.7 1.3 1 2-.1.1-.2.3-.4.5a1 1 0 0 0 1.5 1.3l.2-.3a1 1 0 0 0 .1-1.1c-.5-.9-1-1.7-1.6-2.2Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 5c-4.9 0-8.6 2.7-10.6 6a1 1 0 0 0 0 1c2 3.3 5.7 6 10.6 6s8.6-2.7 10.6-6a1 1 0 0 0 0-1c-2-3.3-5.7-6-10.6-6Zm0 11c-3.9 0-7-2-8.6-4 .7-.9 1.7-1.9 3-2.6A5 5 0 1 0 17 12a5 5 0 0 0-8.4-3.6A10.6 10.6 0 0 1 12 7c3.9 0 7 2 8.6 4-1.6 2-4.7 4-8.6 4Zm0-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          }
          required
        />

        <div className="auth-form__row auth-form__row--split">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>{copy.rememberMe}</span>
          </label>

          <Link className="auth-link" to="/forgot-password">
            {copy.forgotPassword}
          </Link>
        </div>

        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? `${copy.loginButton}...` : copy.loginButton}
        </button>
      </form>

      <footer className="auth-card__footer">
        <span>{copy.loginHint}</span>
        <Link className="auth-link auth-link--strong" to="/register">
          {copy.registerRouteLabel}
        </Link>
      </footer>
    </section>
  );
}
