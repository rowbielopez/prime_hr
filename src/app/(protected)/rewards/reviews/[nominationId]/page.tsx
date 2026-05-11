import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  getRewardsNominationById,
  getRewardsNominationReviewSummary,
  listRewardsCommitteeAssignments,
  listRewardsNominationReviews,
  listRewardsNominationStatusHistory,
} from "@/features/rewards/repository/nominations.repository";
import { RewardReviewDecisionPanel } from "@/components/features/rewards/review-decision-panel";
import { submitRewardNominationReviewAction } from "@/features/rewards/actions";
import { RewardReviewHistory } from "@/components/features/rewards/review-history";
import { RewardNominationStatusHistory } from "@/components/features/rewards/nomination-status-history";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RewardsAssignedCommitteeStrip } from "@/components/features/rewards/assigned-committee-strip";

type Props = { params: Promise<{ nominationId: string }> };

export default async function RewardsReviewDetailPage(props: Props) {
  const { nominationId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/reviews",
    permission: "rewards.nomination.review",
  });
  const detail = await getRewardsNominationById(nominationId, context);
  if (!detail) notFound();
  const [reviewRows, reviewSummary, assignmentRows] = await Promise.all([
    listRewardsNominationReviews(nominationId),
    getRewardsNominationReviewSummary(nominationId),
    listRewardsCommitteeAssignments(nominationId, context),
  ]);
  const historyRows = await listRewardsNominationStatusHistory(nominationId, context);
  const canReview = detail.status === "submitted" || detail.status === "under_review";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${detail.awardTitle} review`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.nomineeName }]}
      />
      <div className="flex gap-2">
        <Link href="/rewards/reviews" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to review queue
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
          {detail.nominatorRemarks ? (
            <div>
              <span className="text-muted-foreground">Nominator remarks: </span>
              {detail.nominatorRemarks}
            </div>
          ) : null}
          {detail.reviewerRemarks ? (
            <div>
              <span className="text-muted-foreground">Latest reviewer remarks: </span>
              {detail.reviewerRemarks}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <RewardsAssignedCommitteeStrip rows={assignmentRows} />
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
          <div className="text-muted-foreground">Recommendation quorum: at least 3 reviews and 2 recommends.</div>
        </CardContent>
      </Card>

      {canReview ? <RewardReviewDecisionPanel onSubmitDecision={(input) => submitRewardNominationReviewAction(nominationId, input)} /> : null}
      <RewardReviewHistory rows={reviewRows} />
      <RewardNominationStatusHistory rows={historyRows} />
    </div>
  );
}

