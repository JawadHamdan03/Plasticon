import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-[#EEEEEE] bg-[#EEEEEE] px-4 text-sm text-[#000000] outline-none transition placeholder:text-[#000000]/70 focus:border-[#A2AF9B] focus:ring-2 focus:ring-[#A2AF9B]/20",
        className,
      )}
      {...props}
    />
  );
}



