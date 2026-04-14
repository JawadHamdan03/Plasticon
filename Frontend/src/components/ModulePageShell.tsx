import type { ReactNode } from "react";
import { appCopy } from "../content/appCopy";
import { useLocale } from "../context/LocaleContext";
import { Card } from "./ui/card";

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
    <Card className="module-card p-5 max-md:p-4">
      <header className="module-header flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ui-border)] pb-5">
        <div className="min-w-0">
          <p className="auth-eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ui-text-muted)]">
            {copy.appName}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--ui-text)]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ui-text-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="module-header__actions flex flex-wrap items-center gap-2">
          {actions}
        </div>
      </header>
      <div className="pt-5">{children}</div>
    </Card>
  );
}
