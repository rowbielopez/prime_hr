import { PageHeader } from "@/components/foundation";
import { TrainingSessionForm } from "@/components/features/learning/sessions/training-session-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createTrainingSessionAction } from "@/features/learning/sessions/actions";
import { listEmployeeCampusOptions } from "@/features/employees/repository/employees.repository";
import { listTrainingProgramsForOptions } from "@/features/learning/programs/repository/programs.repository";

export default async function NewTrainingSessionPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/sessions",
    permission: "learning.write",
  });
  const [campuses, programs] = await Promise.all([
    listEmployeeCampusOptions(context),
    listTrainingProgramsForOptions(context),
  ]);
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New training session"
        subtitle="Schedule a program run with venue, capacity, and timing."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <TrainingSessionForm
        mode="create"
        initialValue={{
          programId: programs[0]?.id ?? "",
          title: "",
          campusId: campuses[0]?.id ?? "",
          venue: null,
          capacity: null,
          status: "scheduled",
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        }}
        campusOptions={campuses}
        programOptions={programs}
        onSubmit={createTrainingSessionAction}
      />
    </div>
  );
}
