import { PageHeader } from "@/components/foundation";
import Link from "next/link";
import { RecommendationListManagement } from "@/components/features/recruitment/recommendations/recommendation-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRecommendations } from "@/features/recruitment/recommendations/repository/recommendations.repository";
import { buttonVariants } from "@/components/ui/button";

export default async function RecommendationsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/recommendations",
    permission: "recruitment.recommendations.read",
  });
  const rows = await listRecommendations(context);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={pageMeta.breadcrumb}
        actions={
          <>
            <Link
              href="/recruitment/recommendations/reports"
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              View Reports
            </Link>
            {context.permissions.includes("recruitment.recommendations.write") ? (
              <Link
                href="/recruitment/recommendations/new"
                className={buttonVariants({ variant: "default", size: "default" })}
              >
                Create Recommendation
              </Link>
            ) : null}
          </>
        }
      />
      <RecommendationListManagement rows={rows} />
    </div>
  );
}
