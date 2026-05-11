import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { TrainingRequestReviewForm } from "@/components/features/learning/requests/training-request-review-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { reviewTrainingRequestAction } from "@/features/learning/requests/actions";
import { getTrainingRequestById } from "@/features/learning/requests/repository/requests.repository";
import type { TrainingRequestReviewInput } from "@/features/learning/requests/schemas/request-form.schema";

type PageProps = { params: Promise<{ requestId: string }> };

function defaultReview(row: Awaited<ReturnType<typeof getTrainingRequestById>>): TrainingRequestReviewInput {
  if (!row) {
    return { status: "under_review", reviewerNotes: null };
  }
  if (row.status === "approved" || row.status === "rejected" || row.status === "under_review") {
    return { status: row.status, reviewerNotes: row.reviewerNotes };
  }
  return { status: "under_review", reviewerNotes: row.reviewerNotes };
}

export default async function TrainingRequestDetailPage(props: PageProps) {
  const { requestId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/requests",
    permission: "learning.read",
  });
  const row = await getTrainingRequestById(requestId, context);
  if (!row) notFound();
  const canReview = hasPermission(context, "learning.write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training request"
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: row.requesterName }]}
      />
      <Link href="/learning/requests" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        Back to queue
      </Link>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Request</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {row.requestKind === "nomination" ? "Nomination" : "Self-request"}
            </span>
            <AdminStatusChip
              tone={
                row.status === "approved"
                  ? "active"
                  : row.status === "rejected" || row.status === "withdrawn"
                    ? "inactive"
                    : row.status === "submitted" || row.status === "under_review"
                      ? "pending"
                      : "info"
              }
              label={row.status}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Employee: </span>
            {row.requesterName}
          </div>
          {row.submittedByName ? (
            <div>
              <span className="text-muted-foreground">Submitted by: </span>
              {row.submittedByName}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">Campus: </span>
            {row.campusName}
          </div>
          <div>
            <span className="text-muted-foreground">Training: </span>
            {row.programTitle ?? row.customTitle ?? "—"}
          </div>
          <div className="pt-2">
            <p className="text-muted-foreground">Rationale</p>
            <p>{row.justification}</p>
          </div>
          {row.remarks ? (
            <div className="pt-2">
              <p className="text-muted-foreground">Remarks</p>
              <p>{row.remarks}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {canReview ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Approval</h3>
          <TrainingRequestReviewForm
            initial={defaultReview(row)}
            onSubmit={(input) => reviewTrainingRequestAction(requestId, input)}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You can view this request. Approvers will update the status.</p>
      )}
    </div>
  );
}
