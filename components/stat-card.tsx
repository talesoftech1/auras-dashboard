import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional secondary line below the value, e.g. "+18% vs last week". */
  hint?: ReactNode;
  /** Optional tint for the value, e.g. "text-emerald-600" for positive deltas. */
  valueClassName?: string;
  className?: string;
}

/**
 * Compact stat card used in the home grid. Sized so four fit in a row above the
 * fold next to the activity heatmap and answer-rate chart.
 */
export function StatCard({
  label,
  value,
  hint,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 shadow-sm sm:p-4", className)}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold leading-tight sm:text-2xl",
          valueClassName,
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:text-xs">
          {hint}
        </div>
      )}
    </div>
  );
}
