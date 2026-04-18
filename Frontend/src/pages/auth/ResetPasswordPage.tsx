import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { authCopy, type Locale } from "../../content/authCopy";

const getTokenFromSearch = (search: string) => {
  const params = new URLSearchParams(search);
  return params.get("token") || "";
};

type ResetPasswordPageProps = {
  locale: Locale;
};

export function ResetPasswordPage({ locale }: ResetPasswordPageProps) {
  const copy = authCopy[locale];
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => getTokenFromSearch(location.search),
    [location.search],
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-card__heading">
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2>{copy.resetTitle}</h2>
        <p>{copy.resetSubtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">{copy.resetNewPasswordLabel}</span>
          <input
            className="field__control"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">{copy.resetConfirmPasswordLabel}</span>
          <input
            className="field__control"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={copy.confirmPasswordPlaceholder}
            required
          />
        </label>

        {message ? <div className="auth-alert">{message}</div> : null}
        {errorMessage ? (
          <div className="auth-alert auth-alert--error">{errorMessage}</div>
        ) : null}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? copy.resetSubmitting : copy.resetSubmitButton}
        </button>
      </form>

      <footer className="auth-card__footer">
        <span>{copy.resetBackHint}</span>
        <Link className="auth-link auth-link--strong" to="/login">
          {copy.resetBackAction}
        </Link>
      </footer>
    </section>
  );
}




