import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { authCopy, type Locale } from "../../content/authCopy";

const getTokenFromSearch = (search: string) => {
  const params = new URLSearchParams(search);
  return params.get("token") || "";
};

type VerifyEmailPageProps = {
  locale: Locale;
};

export function VerifyEmailPage({ locale }: VerifyEmailPageProps) {
  const copy = authCopy[locale];
  const location = useLocation();
  const token = useMemo(
    () => getTokenFromSearch(location.search),
    [location.search],
  );
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState(copy.verifyLoading);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage(copy.verifyMissingToken);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
        );

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const data = (await response.json()) as { message?: string };
        setStatus("success");
        setMessage(data.message || copy.verifySuccessDefault);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : copy.verifyErrorDefault,
        );
      }
    };

    void verify();
  }, [
    copy.verifyErrorDefault,
    copy.verifyLoading,
    copy.verifyMissingToken,
    copy.verifySuccessDefault,
    token,
  ]);

  return (
    <section className="auth-card">
      <div className="auth-card__heading">
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2>{copy.verifyTitle}</h2>
        <p>{message}</p>
      </div>

      <div
        className={`auth-alert ${status === "error" ? "auth-alert--error" : ""}`}
      >
        {status === "loading" ? copy.verifyLoading : message}
      </div>

      <footer className="auth-card__footer">
        <span>{copy.verifyBackHint}</span>
        <Link className="auth-link auth-link--strong" to="/login">
          {copy.verifyBackAction}
        </Link>
      </footer>
    </section>
  );
}




