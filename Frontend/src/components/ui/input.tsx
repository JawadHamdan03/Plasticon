import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-(--border-input) bg-(--bg-input) px-4 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-tertiary) focus:border-(--border-focus) focus:ring-2 focus:ring-(--brand-primary)/20",
        className,
      )}
      {...props}
    />
  );
}



