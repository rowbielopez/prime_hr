import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getRewardAwardById } from "@/features/rewards/repository/awards.repository";
import { countRewardsNominationsByAwardId } from "@/features/rewards/repository/nominations.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac/scopes";

type Props = { params: Promise<{ awardId: string }> };

export default async function RewardAwardDetailPage(props: Props) {
  const { awardId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/awards",
    permission: "rewards.catalog.read",
  });
  const award = await getRewardAwardById(awardId, context);
  if (!award) notFound();
  const canWrite = hasPermission(context, "rewards.catalog.write");
  const canReadNominations = hasPermission(context, "rewards.nomination.read");
  const nominationCount = canReadNominations ? await countRewardsNominationsByAwardId(awardId, context) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={award.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: award.code }]}
      />
      <div className="flex gap-2">
        <Link href="/rewards/awards" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to awards
        </Link>
        {canWrite ? (
          <Link href={`/rewards/awards/${award.id}/edit`} className={cn(buttonVariants({ size: "sm" }))}>
            Edit award
          </Link>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Award details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Code: </span>
            {award.code}
          </div>
          <div>
            <span className="text-muted-foreground">Title: </span>
            {award.title}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            {award.status}
          </div>
          <div>
            <span className="text-muted-foreground">Scope: </span>
            {award.campusName ? `${award.campusName}${award.officeName ? ` · ${award.officeName}` : ""}` : "Organization-wide"}
          </div>
          <div>
            <span className="text-muted-foreground">Nomination window: </span>
            {award.nominationStartDate ?? "—"} to {award.nominationEndDate ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Review end date: </span>
            {award.reviewEndDate ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Description: </span>
            {award.description ?? "—"}
          </div>
        </CardContent>
      </Card>
      {canReadNominations ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nominations under this award</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Total nominations: </span>
              {nominationCount}
            </div>
            <Link href={`/rewards/nominations?awardId=${award.id}`} className="text-primary hover:underline">
              Open nominations list
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

