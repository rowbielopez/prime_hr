import { PageHeader } from "@/components/foundation";
import { AssessmentListManagement } from "@/components/features/learning/competencies/assessment-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listCompetencyAssessments } from "@/features/learning/competencies/repository/assessments.repository";

export default async function CompetencyAssessmentsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies/assessments",
    permission: "learning.competencies.assess.read",
  });
  const rows = await listCompetencyAssessments(context);
  const canWrite = hasPermission(context, "learning.competencies.assess.write");
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <AssessmentListManagement rows={rows} canWrite={canWrite} />
    </div>
  );
}
