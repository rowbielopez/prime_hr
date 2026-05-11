import { PageHeader } from "@/components/foundation";
import { LearningHub } from "@/components/features/learning/learning-hub";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getLearningDashboardSummary } from "@/features/learning/dashboard/repository/learning-dashboard.repository";

export default async function LearningPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning",
    permission: "learning.access",
  });
  const summary = await getLearningDashboardSummary(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <LearningHub summary={summary} context={context} />
    </div>
  );
}
