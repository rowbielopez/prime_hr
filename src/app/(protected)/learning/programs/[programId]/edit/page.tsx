import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { TrainingProgramForm } from "@/components/features/learning/programs/training-program-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { updateTrainingProgramAction } from "@/features/learning/programs/actions";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { getTrainingProgramById } from "@/features/learning/programs/repository/programs.repository";

type PageProps = { params: Promise<{ programId: string }> };

export default async function EditTrainingProgramPage(props: PageProps) {
  const { programId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/programs",
    permission: "learning.write",
  });
  const [detail, campuses, offices] = await Promise.all([
    getTrainingProgramById(programId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.title}`}
        subtitle="Update scope, modality, and publication status."
        breadcrumb={[...pageMeta.breadcrumb, { label: "Edit" }]}
      />
      <TrainingProgramForm
        mode="edit"
        initialValue={{
          title: detail.title,
          description: detail.description,
          modality: detail.modality,
          durationHours: detail.durationHours,
          campusId: detail.campusId,
          officeId: detail.officeId,
          status: detail.status,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={(input) => updateTrainingProgramAction(programId, input)}
      />
    </div>
  );
}
