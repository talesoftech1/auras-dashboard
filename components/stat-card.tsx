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

export function StatCard({
  label,
  value,
  hint,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-2 text-3xl font-semibold leading-tight", valueClassName)}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
