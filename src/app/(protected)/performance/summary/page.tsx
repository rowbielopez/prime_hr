import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listFinalizedSummaryRows } from "@/features/performance/repository/records.repository";
import { FinalRatingSummaryList } from "@/components/features/performance/final-rating-summary-list";

export default async function PerformanceFinalSummaryPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/summary",
    permission: "performance.read",
  });
  const rows = await listFinalizedSummaryRows(context);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <FinalRatingSummaryList rows={rows} />
    </div>
  );
}
