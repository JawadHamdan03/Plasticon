import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, readApiError } from "../lib/api";
import { authCopy, type Locale } from "../content/authCopy";

type ForgotPasswordPageProps = {
  locale: Locale;
};

export function ForgotPasswordPage({ locale }: ForgotPasswordPageProps) {
  const copy = authCopy[locale];
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setResetUrl("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as {
        message?: string;
        resetUrl?: string;
      };
      setMessage(data.message || copy.forgotSuccessDefault);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-card__heading">
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2>{copy.forgotTitle}</h2>
        <p>{copy.forgotSubtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">{copy.emailLabel}</span>
          <input
            className="field__control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            autoComplete="email"
            required
          />
        </label>

        {message ? <div className="auth-alert">{message}</div> : null}
        {resetUrl ? (
          <div className="auth-alert">
            <a className="auth-link auth-link--strong" href={resetUrl}>
              Open reset link
            </a>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? copy.forgotSubmitting : copy.forgotSubmitButton}
        </button>
      </form>

      <footer className="auth-card__footer">
        <span>{copy.forgotBackHint}</span>
        <Link className="auth-link auth-link--strong" to="/login">
          {copy.forgotBackAction}
        </Link>
      </footer>
    </section>
  );
}
