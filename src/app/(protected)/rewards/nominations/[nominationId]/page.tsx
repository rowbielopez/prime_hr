import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getRewardsNominationById, listRewardsCommitteeAssignments } from "@/features/rewards/repository/nominations.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { RewardsAssignedCommitteeStrip } from "@/components/features/rewards/assigned-committee-strip";

type Props = { params: Promise<{ nominationId: string }> };

export default async function RewardNominationDetailPage(props: Props) {
  const { nominationId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/nominations",
    permission: "rewards.nomination.read",
  });
  const detail = await getRewardsNominationById(nominationId, context);
  if (!detail) notFound();
  const assignmentRows = await listRewardsCommitteeAssignments(nominationId, context);
  const actorEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  const canEdit = actorEmployeeId === detail.nominatorEmployeeId && ["draft", "needs_revision"].includes(detail.status);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.awardTitle} - ${detail.status}`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.nomineeName }]}
      />
      <div className="flex gap-2">
        <Link href="/rewards/nominations" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to nominations
        </Link>
        {canEdit ? (
          <Link href={`/rewards/nominations/${detail.id}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit nomination
          </Link>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nomination details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Award: </span>
            {detail.awardTitle}
          </div>
          <div>
            <span className="text-muted-foreground">Nominee: </span>
            {detail.nomineeName}
          </div>
          <div>
            <span className="text-muted-foreground">Nominator: </span>
            {detail.nominatorName}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {detail.status}
          </div>
          <div>
            <span className="text-muted-foreground">Justification: </span>
            {detail.justification}
          </div>
          {detail.nominatorRemarks ? (
            <div>
              <span className="text-muted-foreground">Nominator remarks: </span>
              {detail.nominatorRemarks}
            </div>
          ) : null}
          {detail.reviewerRemarks ? (
            <div>
              <span className="text-muted-foreground">Reviewer remarks: </span>
              {detail.reviewerRemarks}
            </div>
          ) : null}
          {detail.approverRemarks ? (
            <div>
              <span className="text-muted-foreground">Approver remarks: </span>
              {detail.approverRemarks}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <RewardsAssignedCommitteeStrip rows={assignmentRows} />
    </div>
  );
}

