import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-(--border-input) bg-(--bg-input) px-4 pe-9 text-sm text-(--text-primary) outline-none transition cursor-pointer",
        "placeholder:text-(--text-tertiary)",
        "hover:border-(--border-strong)",
        "focus:border-(--border-focus) focus:ring-2 focus:ring-(--brand-primary)/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat [background-position:right_0.875rem_center]",
        "[dir='rtl']:ps-9 [dir='rtl']:pe-4 [dir='rtl']:[background-position:left_0.875rem_center]",
        className,
      )}
      {...props}
    />
  );
}
