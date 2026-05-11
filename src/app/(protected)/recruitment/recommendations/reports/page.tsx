import { PageHeader } from "@/components/foundation";
import { RecommendationReports } from "@/components/features/recruitment/recommendations/recommendation-reports";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  getRecommendationReportSummary,
  getRecommendationVacancyBreakdown,
} from "@/features/recruitment/recommendations/repository/recommendations.repository";

export default async function RecommendationReportsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/recommendations/reports",
    permission: "recruitment.recommendations.read",
  });
  const [summary, breakdown] = await Promise.all([
    getRecommendationReportSummary(context),
    getRecommendationVacancyBreakdown(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={pageMeta.breadcrumb}
      />
      <RecommendationReports summary={summary} breakdown={breakdown} />
    </div>
  );
}
