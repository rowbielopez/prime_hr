import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { AnnualPlanForm } from "@/components/features/learning/plans/annual-plan-form";
import { PlanItemsPanel } from "@/components/features/learning/plans/plan-items-panel";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { updateAnnualPlanAction } from "@/features/learning/plans/actions";
import { listEmployeeCampusOptions } from "@/features/employees/repository/employees.repository";
import { getAnnualPlanById } from "@/features/learning/plans/repository/plans.repository";
import { listTrainingProgramsForOptions } from "@/features/learning/programs/repository/programs.repository";

type PageProps = { params: Promise<{ planId: string }> };

export default async function EditAnnualPlanPage(props: PageProps) {
  const { planId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/plans",
    permission: "learning.write",
  });
  const [detail, campuses, programs] = await Promise.all([
    getAnnualPlanById(planId, context),
    listEmployeeCampusOptions(context),
    listTrainingProgramsForOptions(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.title}`}
        subtitle="Update plan metadata and quarterly line items."
        breadcrumb={[...pageMeta.breadcrumb, { label: "Edit" }]}
      />
      <AnnualPlanForm
        mode="edit"
        initialValue={{
          year: detail.year,
          title: detail.title,
          campusId: detail.campusId,
          status: detail.status,
          notes: detail.notes,
        }}
        campusOptions={campuses}
        onSubmit={(input) => updateAnnualPlanAction(planId, input)}
      />
      <PlanItemsPanel planId={planId} items={detail.items} programOptions={programs} />
    </div>
  );
}
