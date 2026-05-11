import { PageHeader } from "@/components/foundation";
import { MyTrainingRequestForm } from "@/components/features/learning/requests/my-training-request-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createTrainingRequestAction } from "@/features/learning/requests/actions";
import { listEmployeeCampusOptions } from "@/features/employees/repository/employees.repository";
import { listTrainingPrograms } from "@/features/learning/programs/repository/programs.repository";
import { getLinkedEmployeeCampus } from "@/features/learning/server/employee-link";
import { redirect } from "next/navigation";

export default async function NewMyTrainingRequestPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/my-requests",
    permission: "learning.access",
  });
  const link = await getLinkedEmployeeCampus(context.appUserId);
  if (!link) {
    redirect("/forbidden");
  }
  const [programs, campuses] = await Promise.all([
    listTrainingPrograms(context),
    listEmployeeCampusOptions(context),
  ]);
  const activePrograms = programs.filter((p) => p.status === "active").map((p) => ({ id: p.id, title: p.title }));
  const campusLabel = campuses.find((c) => c.id === link.campusId)?.name ?? link.campusId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New training request"
        subtitle="Describe the learning need for HR review."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <MyTrainingRequestForm
        campusId={link.campusId}
        campusLabel={campusLabel}
        programOptions={activePrograms}
        onSubmit={createTrainingRequestAction}
      />
    </div>
  );
}
