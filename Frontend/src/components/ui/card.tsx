import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--border-default) bg-(--bg-card) shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lg)",
        className,
      )}
      {...props}
    />
  );
}
