import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-(--border-default) pb-5",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-(--text-primary)">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-secondary)">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
