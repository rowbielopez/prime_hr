import { DashboardCardsSkeleton } from "@/components/foundation";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 lg:space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <section className="rounded-2xl border premium-border bg-surface-panel p-5 shadow-premium-md md:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <div className="space-y-4">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-10 w-full max-w-3xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border premium-border bg-surface-glass/80 p-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </section>
      <DashboardCardsSkeleton />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </section>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
