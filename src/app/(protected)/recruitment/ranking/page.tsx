import { PageHeader } from "@/components/foundation";
import { RankingListManagement } from "@/components/features/recruitment/recommendations/ranking-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRankingByVacancy } from "@/features/recruitment/recommendations/repository/recommendations.repository";

export default async function RankingSummaryPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/ranking",
    permission: "recruitment.recommendations.read",
  });
  const rows = await listRankingByVacancy(context);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <RankingListManagement rows={rows} />
    </div>
  );
}
