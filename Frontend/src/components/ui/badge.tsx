import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "default" | "soft" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  default: "border-[#EEEEEE] bg-[#EEEEEE] text-[#000000]",
  soft: "border-[#EEEEEE] bg-[#FFFFFF] text-[#000000]",
  accent: "border-[#A2AF9B] bg-[#DCCFC0] text-[#000000]",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}


