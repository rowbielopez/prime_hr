import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getPerformanceRecordById, listPerformanceStatusHistoryByRecordId } from "@/features/performance/repository/records.repository";
import { PerformanceRecordEditor } from "@/components/features/performance/performance-record-editor";
import { FinalRatingSummaryCard } from "@/components/features/performance/final-rating-summary-card";
import { RecordStatusHistory } from "@/components/features/performance/record-status-history";

type Props = { params: Promise<{ recordId: string }> };

export default async function MyPerformanceRecordDetailPage(props: Props) {
  const { recordId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/my",
    permission: "performance.read",
  });
  const [detail, statusHistory] = await Promise.all([
    getPerformanceRecordById(recordId, context),
    listPerformanceStatusHistoryByRecordId(recordId, context),
  ]);
  if (!detail) notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.cycleName} - ${detail.status}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.cycleName }]}
      />
      <div className="flex gap-2">
        <Link href="/performance/my" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to my records
        </Link>
      </div>
      <PerformanceRecordEditor detail={detail} />
      {detail.status === "finalized" && detail.finalScore != null && detail.finalRating != null && detail.finalizedAt ? (
        <FinalRatingSummaryCard
          finalScore={detail.finalScore}
          finalRating={detail.finalRating}
          finalizedAt={detail.finalizedAt}
          comments={detail.finalizerComments}
        />
      ) : null}
      <RecordStatusHistory rows={statusHistory} />
    </div>
  );
}
