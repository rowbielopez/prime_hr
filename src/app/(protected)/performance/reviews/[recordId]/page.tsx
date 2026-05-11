import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getPerformanceRecordById, listPerformanceStatusHistoryByRecordId } from "@/features/performance/repository/records.repository";
import { ReviewDecisionPanel } from "@/components/features/performance/review-decision-panel";
import { RecordStatusHistory } from "@/components/features/performance/record-status-history";

type Props = { params: Promise<{ recordId: string }> };

export default async function PerformanceReviewDetailPage(props: Props) {
  const { recordId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/reviews",
    permission: "performance.review",
  });
  const [detail, statusHistory] = await Promise.all([
    getPerformanceRecordById(recordId, context),
    listPerformanceStatusHistoryByRecordId(recordId, context),
  ]);
  if (!detail) notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.employeeName} - ${detail.cycleName}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.employeeNo }]}
      />
      <div className="flex gap-2">
        <Link href="/performance/reviews" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to review queue
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Employee: </span>
            {detail.employeeName} ({detail.employeeNo})
          </div>
          <div>
            <span className="text-muted-foreground">Cycle: </span>
            {detail.cycleName}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
          {detail.employeeComments ? (
            <div>
              <span className="text-muted-foreground">Employee comments: </span>
              {detail.employeeComments}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Objective</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Reviewer score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.objectives.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell>{row.metric ?? "—"}</TableCell>
                <TableCell>{row.targetValue ?? "—"}</TableCell>
                <TableCell className="text-right">{row.weight}%</TableCell>
                <TableCell className="text-right">{row.reviewerScore ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReviewDecisionPanel recordId={detail.id} status={detail.status} />
      <RecordStatusHistory rows={statusHistory} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {detail.reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            detail.reviews.map((row) => (
              <div key={row.id} className="rounded-md border p-2">
                <div className="font-medium">
                  {row.decision} by {row.reviewerName}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</div>
                {row.comments ? <div>{row.comments}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
