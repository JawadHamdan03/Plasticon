import type { ReactNode } from "react";

type ModulePageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
};

export function ModulePageShell({
  title,
  subtitle,
  children,
  actions,
  icon,
}: ModulePageShellProps) {
  return (
    <div className="module-shell">
      <header className="module-shell__header">
        <div className="module-shell__header-text">
          <div className="module-shell__brand" style={{ paddingInlineStart: ".75rem" }}>
            {icon
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>{icon} Plasticon</span>
              : "Plasticon"}
          </div>
          <h1 className="module-shell__title" style={{ paddingInlineStart: ".75rem" }}>{title}</h1>
          <p className="module-shell__subtitle" style={{ paddingInlineStart: ".75rem" }}>{subtitle}</p>
        </div>
        {actions && (
          <div className="module-shell__actions">{actions}</div>
        )}
      </header>
      <div className="module-shell__body">{children}</div>
    </div>
  );
}
