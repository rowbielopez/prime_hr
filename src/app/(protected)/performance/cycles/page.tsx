import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listPerformanceCycles } from "@/features/performance/repository/cycles.repository";
import { PerformanceCycleList } from "@/components/features/performance/performance-cycle-list";
import type { PerformanceCycleListItem } from "@/features/performance/types";

function filterByActiveState(rows: PerformanceCycleListItem[], filter: string | undefined) {
  if (filter === "active") return rows.filter((r) => r.status === "active");
  if (filter === "inactive") return rows.filter((r) => r.status !== "active");
  return rows;
}

type PageProps = { searchParams: Promise<{ status?: string }> };

export default async function PerformanceCyclesPage(props: PageProps) {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/cycles",
    permission: "performance.read",
  });
  const sp = (await props.searchParams) ?? {};
  const allRows = await listPerformanceCycles(context);
  const rows = filterByActiveState(allRows, sp.status);
  const canWrite = hasPermission(context, "performance.write");
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <PerformanceCycleList rows={rows} canWrite={canWrite} statusFilter={sp.status} />
    </div>
  );
}
