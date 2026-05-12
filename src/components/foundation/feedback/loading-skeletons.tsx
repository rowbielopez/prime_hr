import { Skeleton } from "@/components/ui/skeleton";

export function DashboardCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border premium-border bg-surface-panel p-4 shadow-premium-sm">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-4 h-8 w-20 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-32 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border premium-border bg-surface-panel p-3 shadow-premium-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-sm rounded-xl" />
        <Skeleton className="hidden h-9 w-32 rounded-xl sm:block" />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="mt-2 h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border premium-border bg-surface-panel p-4 shadow-premium-sm">
      <Skeleton className="h-5 w-36 rounded-full" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-5 w-40 rounded-full" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

