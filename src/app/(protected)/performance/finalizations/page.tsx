import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listFinalizationQueueRecords } from "@/features/performance/repository/records.repository";
import { FinalizationQueueList } from "@/components/features/performance/finalization-queue-list";

export default async function PerformanceFinalizationsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/finalizations",
    permission: "performance.finalize",
  });
  const rows = await listFinalizationQueueRecords(context);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <FinalizationQueueList rows={rows} />
    </div>
  );
}
