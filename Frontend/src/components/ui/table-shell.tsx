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
        "w-full rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]",
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
      className={cn("w-full border-collapse text-sm text-[#000000]", className)}
    >
      {children}
    </table>
  );
}
