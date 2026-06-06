import type { ReactNode } from "react";
import { type Locale } from "../content/authCopy";
import { useLocale } from "../context/LocaleContext";
import { LocaleSwitch } from "./LocaleSwitch";
import { DateTimeBadge } from "./DateTimeBadge";
import { ThemeToggle } from "./ThemeToggle";
import plasticonLogin from "../assets/plasticonLogin.png";

type AuthLayoutProps = {
  children: (locale: Locale) => ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const { locale } = useLocale();

  return (
    <main className="auth-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <img
          src={plasticonLogin}
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      </section>

      <section className="auth-panel">
        <header className="auth-panel__header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              width: "100%",
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




