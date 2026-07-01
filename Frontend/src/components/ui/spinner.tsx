import { cn } from "../../lib/utils";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "w-4 h-4 border-[1.5px]",
  md: "w-5 h-5 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="جارٍ التحميل"
      className={cn(
        "rounded-full border-solid border-(--border-default) border-t-(--brand-primary) animate-spin shrink-0",
        sizeMap[size],
        className,
      )}
    />
  );
}

export function LoadingCenter({ size = "lg" }: { size?: SpinnerProps["size"] }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size={size} />
    </div>
  );
}
