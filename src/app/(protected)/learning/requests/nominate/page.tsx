import { PageHeader } from "@/components/foundation";
import { getPageMeta } from "@/components/foundation/page/breadcrumbs";
import { TrainingNominationForm } from "@/components/features/learning/requests/training-nomination-form";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { redirect } from "next/navigation";
import { createNominationAction } from "@/features/learning/requests/actions";
import { canSubmitTrainingNomination } from "@/features/learning/requests/nomination-guards";
import { listEmployeeCampusOptions, listEmployees } from "@/features/employees/repository/employees.repository";
import { listTrainingPrograms } from "@/features/learning/programs/repository/programs.repository";

export default async function NominateTrainingPage() {
  const context = await requireAuthorizedUser();
  if (!canSubmitTrainingNomination(context)) {
    redirect(buildForbiddenUrl("missing_permission"));
  }
  const pageMeta = getPageMeta("/learning/requests/nominate");
  const [campuses, employees, programs] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployees(),
    listTrainingPrograms(context),
  ]);
  const activePrograms = programs.filter((p) => p.status === "active").map((p) => ({ id: p.id, title: p.title }));

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <TrainingNominationForm
        campusOptions={campuses}
        programOptions={activePrograms}
        employees={employees}
        onSubmit={createNominationAction}
      />
    </div>
  );
}
