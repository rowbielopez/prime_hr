import { PageHeader } from "@/components/foundation";
import { TrainingSessionListManagement } from "@/components/features/learning/sessions/training-session-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listTrainingSessions } from "@/features/learning/sessions/repository/sessions.repository";

export default async function TrainingSessionsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/sessions",
    permission: "learning.read",
  });
  const rows = await listTrainingSessions(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <TrainingSessionListManagement rows={rows} />
    </div>
  );
}
