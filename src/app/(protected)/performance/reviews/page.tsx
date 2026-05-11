import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listReviewQueueRecords } from "@/features/performance/repository/records.repository";
import { ReviewQueueList } from "@/components/features/performance/review-queue-list";

export default async function PerformanceReviewsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/reviews",
    permission: "performance.review",
  });
  const rows = await listReviewQueueRecords(context);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <ReviewQueueList rows={rows} />
    </div>
  );
}
