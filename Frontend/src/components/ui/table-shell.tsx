import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type TableShellProps = {
  children: ReactNode;
  className?: string;
};

export function TableShell({ children, className }: TableShellProps) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-(--border-default) bg-(--bg-card) overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TableBase({ children, className }: TableShellProps) {
  return (
    <table
      className={cn("w-full border-collapse text-sm text-(--text-primary)", className)}
    >
      {children}
    </table>
  );
}
