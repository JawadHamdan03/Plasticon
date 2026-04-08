import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { appCopy } from "../content/appCopy";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "./LocaleSwitch";
import { DateTimeBadge } from "./DateTimeBadge";
import { UserAvatarBadge } from "./UserAvatarBadge";
import logo from "../assets/plasticon.png";

type ModulePageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function ModulePageShell({
  title,
  subtitle,
  children,
  actions,
}: ModulePageShellProps) {
  const { locale } = useLocale();
  const copy = appCopy[locale];

  return (
    <main className="module-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="module-card">
        <div className="module-shell__bar">
          <div className="dashboard-brand">
            <img
              className="dashboard-brand__logo"
              src={logo}
              alt="Plasticon logo"
            />
            <div>
              <h1 className="dashboard-brand__name">{copy.appName}</h1>
              <span className="dashboard-brand__tag">
                {copy.commandCenterLabel}
              </span>
            </div>
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
            <UserAvatarBadge size="sm" />
          </div>
        </div>
        <header className="module-header">
          <div>
            <p className="auth-eyebrow">{copy.appName}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="module-header__actions">
            <Link className="module-back-link" to="/dashboard">
              {copy.backToDashboard}
            </Link>
            {actions}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
