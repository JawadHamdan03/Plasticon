import type { ReactNode } from "react";
import { authCopy, type Locale } from "../content/authCopy";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "./LocaleSwitch";
import { DateTimeBadge } from "./DateTimeBadge";
import { ThemeToggle } from "./ThemeToggle";
import logo from "../assets/plasticon.png";

type AuthLayoutProps = {
  children: (locale: Locale) => ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const { locale } = useLocale();
  const copy = authCopy[locale];

  return (
    <main className="auth-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="auth-hero">
        <div className="auth-brand">
          <div className="auth-brand__logo" aria-hidden="true">
            <img
              className="auth-brand__logo-image"
              src={logo}
              alt="Plasticon logo"
              onError={(event) => {
                const target = event.currentTarget;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(
                  ".auth-brand__logo-fallback",
                );
                if (fallback instanceof HTMLElement) {
                  fallback.style.display = "grid";
                }
              }}
            />
            <span className="auth-brand__logo-fallback">P</span>
          </div>

          <div className="auth-brand__copy">
            <p className="auth-eyebrow">{copy.appName}</p>
            <span className="dashboard-brand__tag auth-brand__tag">
              {copy.commandCenterLabel}
            </span>
            <h1>{copy.heroTitle}</h1>
            <p className="auth-hero__text">{copy.heroDescription}</p>
            <button type="button" className="auth-hero__cta">
              {copy.heroCta}
            </button>
          </div>

          <ul className="auth-hero__features">
            {copy.heroFeatures.map((item) => (
              <li key={item.title} className="auth-hero__feature-item">
                <span className="auth-hero__feature-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="auth-hero__feature-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="auth-hero__stats">
            {copy.heroStats.map((item) => (
              <article className="auth-hero__stat" key={item.label}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="auth-hero__mockup" aria-hidden="true">
            <div className="auth-hero__mockup-header">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-hero__mockup-body">
              <div className="auth-hero__mockup-chart" />
              <div className="auth-hero__mockup-grid">
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero__accent">
          <span className="auth-hero__dot auth-hero__dot--primary" />
          <span className="auth-hero__dot auth-hero__dot--secondary" />
          <span className="auth-hero__dot auth-hero__dot--paper" />
        </div>
      </section>

      <section className="auth-panel">
        <header className="auth-panel__header">
          <div>
            <p className="auth-panel__kicker">{copy.appTagline}</p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <DateTimeBadge />
            <LocaleSwitch />
            <ThemeToggle />
          </div>
        </header>

        <div className="auth-panel__body">{children(locale)}</div>
      </section>
    </main>
  );
}




