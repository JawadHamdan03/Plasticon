import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-14 px-6 text-center gap-3", className)}>
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--border-default) bg-(--bg-app) text-(--text-tertiary) mb-1">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-(--text-primary) m-0">{title}</p>
      {description && (
        <p className="text-xs text-(--text-secondary) max-w-[280px] leading-relaxed m-0">{description}</p>
      )}
      {action && <div className="mt-2 flex justify-center">{action}</div>}
    </div>
  );
}
