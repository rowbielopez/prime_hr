import { PageHeader } from "@/components/foundation";
import { AnnualPlanListManagement } from "@/components/features/learning/plans/annual-plan-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listAnnualPlans } from "@/features/learning/plans/repository/plans.repository";

export default async function AnnualPlansPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/plans",
    permission: "learning.read",
  });
  const rows = await listAnnualPlans(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <AnnualPlanListManagement rows={rows} />
    </div>
  );
}
