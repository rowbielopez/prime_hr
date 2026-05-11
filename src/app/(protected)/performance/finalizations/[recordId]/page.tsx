import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getPerformanceRecordById, listFinalizationHistoryByRecordId } from "@/features/performance/repository/records.repository";
import { FinalizationPanel } from "@/components/features/performance/finalization-panel";
import { FinalRatingSummaryCard } from "@/components/features/performance/final-rating-summary-card";
import { FinalizationHistoryTimeline } from "@/components/features/performance/finalization-history-timeline";

type Props = { params: Promise<{ recordId: string }> };

export default async function PerformanceFinalizationDetailPage(props: Props) {
  const { recordId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/finalizations",
    permission: "performance.finalize",
  });
  const [detail, history] = await Promise.all([
    getPerformanceRecordById(recordId, context),
    listFinalizationHistoryByRecordId(recordId, context),
  ]);
  if (!detail) notFound();
  const alreadyFinalized =
    detail.status === "finalized" && detail.finalScore != null && detail.finalRating != null && detail.finalizedAt;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.employeeName} - ${detail.cycleName}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.employeeNo }]}
      />
      <div className="flex gap-2">
        <Link href="/performance/finalizations" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to finalization queue
        </Link>
      </div>
      <FinalizationPanel
        recordId={detail.id}
        objectives={detail.objectives.map((o) => ({
          id: o.id,
          title: o.title,
          weight: o.weight,
          reviewerScore: o.reviewerScore,
        }))}
        disabled={detail.status !== "approved"}
      />
      {alreadyFinalized ? (
        <FinalRatingSummaryCard
          finalScore={detail.finalScore!}
          finalRating={detail.finalRating!}
          finalizedAt={detail.finalizedAt!}
          comments={detail.finalizerComments}
        />
      ) : null}
      <FinalizationHistoryTimeline rows={history} />
    </div>
  );
}
