import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { getPerformanceRecordById, listFinalizationHistoryByRecordId } from "@/features/performance/repository/records.repository";
import { PerformanceRecordEditor } from "@/components/features/performance/performance-record-editor";
import { FinalRatingSummaryCard } from "@/components/features/performance/final-rating-summary-card";
import { FinalizationHistoryTimeline } from "@/components/features/performance/finalization-history-timeline";

type Props = { params: Promise<{ recordId: string }> };

export default async function PerformanceRecordManagementDetailPage(props: Props) {
  const { recordId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/records",
    permission: "performance.read",
  });
  const [detail, history] = await Promise.all([
    getPerformanceRecordById(recordId, context),
    listFinalizationHistoryByRecordId(recordId, context),
  ]);
  if (!detail) notFound();
  const canWrite = hasPermission(context, "performance.write");
  const finalizedView =
    detail.status === "finalized" && detail.finalScore != null && detail.finalRating != null && detail.finalizedAt;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.employeeName} – ${detail.cycleName}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.employeeNo }]}
      />
      <div className="flex flex-wrap gap-2">
        <Link href="/performance/records" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to records
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
          <div>
            <span className="text-muted-foreground">Employee: </span>
            {detail.employeeName} ({detail.employeeNo})
          </div>
        </CardContent>
      </Card>
      <PerformanceRecordEditor detail={detail} editMode="hr" readOnly={!canWrite} />
      {finalizedView ? (
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
