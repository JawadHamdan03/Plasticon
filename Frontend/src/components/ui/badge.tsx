import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "default" | "soft" | "accent" | "blue" | "orange" | "green" | "red" | "yellow";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  default: "border-(--border-default) bg-(--gray-100) text-(--text-primary)",
  soft:    "border-(--border-default) bg-(--bg-card) text-(--text-secondary)",
  accent:  "border-(--orange-100) bg-(--orange-100) text-(--orange-700)",
  blue:    "border-(--blue-100) bg-(--blue-50) text-(--blue-700)",
  orange:  "border-(--orange-100) bg-(--orange-100) text-(--orange-700)",
  green:   "border-(--green-100) bg-(--green-50) text-(--green-600)",
  red:     "border-(--red-100) bg-(--red-50) text-(--red-600)",
  yellow:  "border-(--yellow-100) bg-(--yellow-100) text-(--yellow-600)",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
