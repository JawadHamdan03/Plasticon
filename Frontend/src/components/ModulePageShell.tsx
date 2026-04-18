import type { ReactNode } from "react";
import { appCopy } from "../content/appCopy";
import { useLocale } from "../context/LocaleContext";

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
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-card)",
        padding: "1.5rem",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          borderBottom: "1px solid var(--border-default)",
          paddingBottom: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: ".7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".14em",
              color: "var(--text-secondary)",
            }}
          >
            {copy.appName}
          </p>
          <h1
            style={{
              margin: ".375rem 0 0",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-.025em",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h1>
          <p style={{ margin: ".375rem 0 0", fontSize: ".875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>
        {actions && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".5rem" }}>
            {actions}
          </div>
        )}
      </header>
      <div>{children}</div>
    </div>
  );
}
