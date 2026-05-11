import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { TrainingSessionForm } from "@/components/features/learning/sessions/training-session-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { updateTrainingSessionAction } from "@/features/learning/sessions/actions";
import { listEmployeeCampusOptions } from "@/features/employees/repository/employees.repository";
import { listTrainingProgramsForOptions } from "@/features/learning/programs/repository/programs.repository";
import { getTrainingSessionById } from "@/features/learning/sessions/repository/sessions.repository";

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function EditTrainingSessionPage(props: PageProps) {
  const { sessionId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/sessions",
    permission: "learning.write",
  });
  const [detail, campuses, programs] = await Promise.all([
    getTrainingSessionById(sessionId, context),
    listEmployeeCampusOptions(context),
    listTrainingProgramsForOptions(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.title}`}
        subtitle="Adjust scheduling, venue, and status."
        breadcrumb={[...pageMeta.breadcrumb, { label: "Edit" }]}
      />
      <TrainingSessionForm
        mode="edit"
        initialValue={{
          programId: detail.programId,
          title: detail.title,
          campusId: detail.campusId,
          venue: detail.venue,
          capacity: detail.capacity,
          status: detail.status,
          startsAt: detail.startsAt,
          endsAt: detail.endsAt,
        }}
        campusOptions={campuses}
        programOptions={programs}
        onSubmit={(input) => updateTrainingSessionAction(sessionId, input)}
      />
    </div>
  );
}
