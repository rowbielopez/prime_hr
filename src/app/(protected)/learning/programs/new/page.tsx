import { PageHeader } from "@/components/foundation";
import { TrainingProgramForm } from "@/components/features/learning/programs/training-program-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createTrainingProgramAction } from "@/features/learning/programs/actions";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function NewTrainingProgramPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/programs",
    permission: "learning.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New training program"
        subtitle="Create a reusable catalog entry with campus and optional office scope."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <TrainingProgramForm
        mode="create"
        initialValue={{
          title: "",
          description: null,
          modality: "classroom",
          durationHours: 1,
          campusId: null,
          officeId: null,
          status: "draft",
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={createTrainingProgramAction}
      />
    </div>
  );
}
