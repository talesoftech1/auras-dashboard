/**
 * Generic dashboard loading skeleton. Shown immediately while the destination
 * page renders. Each individual route can override with its own loading.tsx
 * if it wants a more specific skeleton.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/60" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-6 shadow">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded bg-muted/60" />
      <div className="space-y-2 pt-2">
        <div className="h-10 w-full animate-pulse rounded bg-muted/40" />
        <div className="h-10 w-full animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}
