import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-md)] transition hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow-lg)]",
        className,
      )}
      {...props}
    />
  );
}
