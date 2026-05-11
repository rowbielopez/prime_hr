import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  getRewardsNominationById,
  getRewardsNominationReviewSummary,
  listCommitteeReviewerOptionsByNomination,
  listRewardsCommitteeAssignments,
  listRewardsNominationReviews,
  listRewardsNominationStatusHistory,
} from "@/features/rewards/repository/nominations.repository";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RewardReviewHistory } from "@/components/features/rewards/review-history";
import { RewardNominationStatusHistory } from "@/components/features/rewards/nomination-status-history";
import { RewardApprovalDecisionPanel } from "@/components/features/rewards/approval-decision-panel";
import {
  finalizeRewardNominationAwardingAction,
  saveRewardsCommitteeAssignmentsAction,
  submitRewardNominationApprovalAction,
} from "@/features/rewards/actions";
import { FinalizeRewardAwardButton } from "@/components/features/rewards/finalize-award-button";
import { RewardsCommitteeAssignmentPanel } from "@/components/features/rewards/committee-assignment-panel";

type Props = { params: Promise<{ nominationId: string }> };

export default async function RewardsApprovalDetailPage(props: Props) {
  const { nominationId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/approvals",
    permission: "rewards.nomination.approve",
  });
  const detail = await getRewardsNominationById(nominationId, context);
  if (!detail) notFound();
  const [reviewRows, reviewSummary, assignmentRows, assignmentOptions] = await Promise.all([
    listRewardsNominationReviews(nominationId),
    getRewardsNominationReviewSummary(nominationId),
    listRewardsCommitteeAssignments(nominationId, context),
    listCommitteeReviewerOptionsByNomination(nominationId, context),
  ]);
  const historyRows = await listRewardsNominationStatusHistory(nominationId, context);
  const canDecide = detail.status === "recommended";
  const canFinalizeAward = detail.status === "approved";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.awardTitle} approval`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.nomineeName }]}
      />
      <div className="flex gap-2">
        <Link href="/rewards/approvals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to approval queue
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nomination summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
          {detail.reviewerRemarks ? (
            <div>
              <span className="text-muted-foreground">Latest reviewer remarks: </span>
              {detail.reviewerRemarks}
            </div>
          ) : null}
          {detail.approverRemarks ? (
            <div>
              <span className="text-muted-foreground">Latest approver remarks: </span>
              {detail.approverRemarks}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <RewardsCommitteeAssignmentPanel
        options={assignmentOptions}
        assignments={assignmentRows}
        onSave={(input) => saveRewardsCommitteeAssignmentsAction(nominationId, input)}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Committee review summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <div>Total reviews: {reviewSummary.totalReviews}</div>
          <div>Recommend: {reviewSummary.recommendCount}</div>
          <div>Needs revision: {reviewSummary.requestRevisionCount}</div>
          <div>Reject: {reviewSummary.rejectCount}</div>
          <div>Average score: {reviewSummary.averageScore ?? "—"}</div>
        </CardContent>
      </Card>
      {canDecide ? <RewardApprovalDecisionPanel onSubmitDecision={(input) => submitRewardNominationApprovalAction(nominationId, input)} /> : null}
      {canFinalizeAward ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Award finalization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              This nomination is approved. Finalize it to create the awardee record and move status to awarded.
            </p>
            <FinalizeRewardAwardButton onFinalize={() => finalizeRewardNominationAwardingAction(nominationId)} />
          </CardContent>
        </Card>
      ) : null}
      <RewardReviewHistory rows={reviewRows} />
      <RewardNominationStatusHistory rows={historyRows} />
    </div>
  );
}

