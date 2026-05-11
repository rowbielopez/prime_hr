import { PageHeader } from "@/components/foundation";
import { TrainingRequestListManagement } from "@/components/features/learning/requests/training-request-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { canSubmitTrainingNomination } from "@/features/learning/requests/nomination-guards";
import { listTrainingRequests } from "@/features/learning/requests/repository/requests.repository";

export default async function TrainingRequestsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/requests",
    permission: "learning.read",
  });
  const rows = await listTrainingRequests(context);
  const canNominate = canSubmitTrainingNomination(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <TrainingRequestListManagement rows={rows} canNominate={canNominate} />
    </div>
  );
}
