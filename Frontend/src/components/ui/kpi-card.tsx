import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type KpiColor = "blue" | "green" | "orange" | "red" | "purple" | "pink" | "teal";

const colorMap: Record<KpiColor, { accent: string; bg: string; text: string }> = {
  blue:   { accent: "#3b82f6", bg: "rgba(59,130,246,.1)",  text: "#1d4ed8" },
  green:  { accent: "#10b981", bg: "rgba(16,185,129,.1)",  text: "#059669" },
  orange: { accent: "#f97316", bg: "rgba(249,115,22,.1)",  text: "#ea580c" },
  red:    { accent: "#ef4444", bg: "rgba(239,68,68,.1)",   text: "#dc2626" },
  purple: { accent: "#8b5cf6", bg: "rgba(139,92,246,.1)",  text: "#7c3aed" },
  pink:   { accent: "#ec4899", bg: "rgba(236,72,153,.1)",  text: "#db2777" },
  teal:   { accent: "#14b8a6", bg: "rgba(20,184,166,.1)",  text: "#0d9488" },
};

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  color?: KpiColor;
  className?: string;
};

export function KpiCard({ label, value, sub, icon, color = "blue", className }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 rounded-2xl border border-(--border-default) bg-(--bg-card) px-5 py-4 shadow-(--shadow-sm) overflow-hidden transition-shadow hover:shadow-(--shadow-md)",
        className,
      )}
      style={{ borderInlineStartWidth: 3, borderInlineStartColor: c.accent }}
    >
      {/* Subtle tinted background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${c.bg} 0%, transparent 70%)` }}
        aria-hidden
      />
      {icon && (
        <div
          className="relative mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-sm"
          style={{ background: c.bg, color: c.text }}
        >
          {icon}
        </div>
      )}
      <p className="relative m-0 text-xs font-semibold uppercase tracking-widest text-(--text-tertiary)">
        {label}
      </p>
      <p className="relative m-0 text-2xl font-extrabold leading-none text-(--text-primary)">
        {value}
      </p>
      {sub && (
        <p className="relative m-0 text-xs text-(--text-secondary)">{sub}</p>
      )}
    </div>
  );
}

export function KpiStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]", className)}>
      {children}
    </div>
  );
}
