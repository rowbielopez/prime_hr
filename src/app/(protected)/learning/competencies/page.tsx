import { PageHeader } from "@/components/foundation";
import { CompetencyListManagement } from "@/components/features/learning/competencies/competency-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listCompetencies } from "@/features/learning/competencies/repository/competencies.repository";

export default async function CompetenciesPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies",
    permission: "learning.competencies.read",
  });
  const rows = await listCompetencies(context);
  const canWrite = hasPermission(context, "learning.competencies.write");

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <CompetencyListManagement rows={rows} canWrite={canWrite} />
    </div>
  );
}
