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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          autoComplete="current-password"
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
