import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  asChild?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "border-[#A2AF9B] bg-[#A2AF9B] text-[#FFFFFF] shadow-[0_10px_20px_rgba(162,175,155,0.28)] hover:bg-[#8E9A88]",
  secondary:
    "border-[#EEEEEE] bg-[#EEEEEE] text-[#000000] hover:bg-[#DCCFC0]",
  ghost:
    "border-transparent bg-transparent text-[#000000] hover:bg-[#EEEEEE]",
  outline:
    "border-[#EEEEEE] bg-[#FFFFFF] text-[#000000] hover:border-[#A2AF9B] hover:bg-[#EEEEEE]",
};

export function Button({
  className,
  variant = "default",
  type = "button",
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#A2AF9B]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
    });
  }

  return (
    <motion.button
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={buttonClassName}
      {...(props as unknown as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}


