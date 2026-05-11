import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { RewardsHub } from "@/components/features/rewards/rewards-hub";
import { getRewardsDashboardSummary, listRewardStatusCounts } from "@/features/rewards/repository/dashboard.repository";

export default async function RewardsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards",
    permission: "rewards.read",
  });
  const [summary, statusCounts] = await Promise.all([
    getRewardsDashboardSummary(context),
    listRewardStatusCounts(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <RewardsHub summary={summary} statusCounts={statusCounts} />
    </div>
  );
}

