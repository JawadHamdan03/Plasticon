import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "orange" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  asChild?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "border-(--orange-500) bg-(--orange-500) text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:bg-(--orange-600) hover:border-(--orange-600)",
  orange:
    "border-(--orange-500) bg-(--orange-500) text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:bg-(--orange-600) hover:border-(--orange-600)",
  secondary:
    "border-(--border-default) bg-(--gray-100) text-(--text-primary) hover:bg-(--gray-200)",
  ghost:
    "border-transparent bg-transparent text-(--text-secondary) hover:bg-(--gray-100) hover:text-(--text-primary)",
  outline:
    "border-(--border-default) bg-(--bg-card) text-(--text-primary) hover:border-(--orange-400) hover:text-(--orange-600)",
  danger:
    "border-red-600 bg-red-600 text-white shadow-[0_4px_14px_rgba(220,38,38,0.25)] hover:bg-red-700 hover:border-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-(--orange-400)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
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
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={buttonClassName}
      {...(props as unknown as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}
