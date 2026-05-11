import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { RecommendationDetailManagement } from "@/components/features/recruitment/recommendations/recommendation-detail-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getRecommendationById } from "@/features/recruitment/recommendations/repository/recommendations.repository";

export default async function RecommendationDetailPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/recommendations",
    permission: "recruitment.recommendations.read",
  });
  const detail = await getRecommendationById(recommendationId, context);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Recommendation: ${detail.applicantName}`}
        subtitle="Recommendation detail, remarks, and approval status."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.applicantName }]}
      />
      <RecommendationDetailManagement
        detail={detail}
        canManage={context.permissions.includes("recruitment.recommendations.write")}
      />
    </div>
  );
}
