import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getPerformanceRecordById, listFinalizationHistoryByRecordId } from "@/features/performance/repository/records.repository";
import { FinalRatingSummaryCard } from "@/components/features/performance/final-rating-summary-card";
import { FinalizationHistoryTimeline } from "@/components/features/performance/finalization-history-timeline";

type Props = { params: Promise<{ recordId: string }> };

export default async function PerformanceFinalSummaryDetailPage(props: Props) {
  const { recordId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/summary",
    permission: "performance.read",
  });
  const [detail, history] = await Promise.all([
    getPerformanceRecordById(recordId, context),
    listFinalizationHistoryByRecordId(recordId, context),
  ]);
  if (!detail) notFound();
  if (!(detail.status === "finalized" && detail.finalScore != null && detail.finalRating != null && detail.finalizedAt)) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.employeeName} - ${detail.cycleName}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.employeeNo }]}
      />
      <div className="flex gap-2">
        <Link href="/performance/summary" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to final summary
        </Link>
      </div>
      <FinalRatingSummaryCard
        finalScore={detail.finalScore!}
        finalRating={detail.finalRating!}
        finalizedAt={detail.finalizedAt!}
        comments={detail.finalizerComments}
      />
      <FinalizationHistoryTimeline rows={history} />
    </div>
  );
}
