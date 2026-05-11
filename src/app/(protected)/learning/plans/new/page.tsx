import { PageHeader } from "@/components/foundation";
import { AnnualPlanForm } from "@/components/features/learning/plans/annual-plan-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createAnnualPlanAction } from "@/features/learning/plans/actions";
import { listEmployeeCampusOptions } from "@/features/employees/repository/employees.repository";

export default async function NewAnnualPlanPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/plans",
    permission: "learning.write",
  });
  const campuses = await listEmployeeCampusOptions(context);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New annual plan"
        subtitle="Create a campus plan for a calendar year."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <AnnualPlanForm
        mode="create"
        initialValue={{
          year: new Date().getFullYear(),
          title: "",
          campusId: campuses[0]?.id ?? "",
          status: "draft",
          notes: null,
        }}
        campusOptions={campuses}
        onSubmit={createAnnualPlanAction}
      />
    </div>
  );
}
