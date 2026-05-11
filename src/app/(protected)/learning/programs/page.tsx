import { PageHeader } from "@/components/foundation";
import { TrainingProgramListManagement } from "@/components/features/learning/programs/training-program-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listTrainingPrograms } from "@/features/learning/programs/repository/programs.repository";

export default async function TrainingProgramsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/programs",
    permission: "learning.read",
  });
  const rows = await listTrainingPrograms(context);
  const canWrite = hasPermission(context, "learning.write");

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <TrainingProgramListManagement rows={rows} canWrite={canWrite} />
    </div>
  );
}
