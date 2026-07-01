import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "default" | "soft" | "accent" | "blue" | "orange" | "green" | "red" | "yellow" | "purple" | "pink" | "teal";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
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
  purple:  "border-purple-100 bg-purple-50 text-purple-700",
  pink:    "border-pink-100 bg-pink-50 text-pink-700",
  teal:    "border-teal-100 bg-teal-50 text-teal-700",
};

const dotColors: Record<BadgeTone, string> = {
  default: "bg-(--text-tertiary)",
  soft:    "bg-(--text-tertiary)",
  accent:  "bg-(--orange-500)",
  blue:    "bg-(--blue-500)",
  orange:  "bg-(--orange-500)",
  green:   "bg-(--green-500)",
  red:     "bg-(--red-600)",
  yellow:  "bg-(--yellow-600)",
  purple:  "bg-purple-500",
  pink:    "bg-pink-500",
  teal:    "bg-teal-500",
};

export function Badge({ className, tone = "default", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[tone])} />}
      {children}
    </span>
  );
}

/* ── StatusBadge — maps known status strings to colors ── */
const STATUS_MAP: Record<string, BadgeTone> = {
  // English statuses
  ACTIVE: "green", INACTIVE: "red", PENDING: "yellow", APPROVED: "green",
  REJECTED: "red", COMPLETED: "blue", CANCELLED: "red", IN_PROGRESS: "orange",
  CRITICAL: "red", LOW: "orange", OK: "green", NORMAL: "green",
  PRESENT: "green", ABSENT: "red", LATE: "yellow", ON_LEAVE: "blue",
  // Arabic-mapped
  نشط: "green", غير_نشط: "red", معلق: "yellow",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط", INACTIVE: "غير نشط", PENDING: "معلق", APPROVED: "مقبول",
  REJECTED: "مرفوض", COMPLETED: "مكتمل", CANCELLED: "ملغي", IN_PROGRESS: "جارٍ",
  CRITICAL: "حرج", LOW: "منخفض", OK: "طبيعي", NORMAL: "طبيعي",
  PRESENT: "حاضر", ABSENT: "غائب", LATE: "متأخر", ON_LEAVE: "إجازة",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const tone = STATUS_MAP[status] ?? "default";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  return <Badge tone={tone} dot className={className}>{displayLabel}</Badge>;
}

/* ── RoleBadge — maps role strings to colors ── */
const ROLE_MAP: Record<string, { tone: BadgeTone; label: string }> = {
  ADMIN:      { tone: "orange", label: "مدير" },
  ENGINEER:   { tone: "purple", label: "مهندس" },
  ACCOUNTANT: { tone: "teal",   label: "محاسب" },
  WORKER:     { tone: "blue",   label: "عامل" },
  SALES_REP:  { tone: "pink",   label: "مندوب مبيعات" },
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const cfg = ROLE_MAP[role] ?? { tone: "default" as BadgeTone, label: role };
  return <Badge tone={cfg.tone} className={className}>{cfg.label}</Badge>;
}
