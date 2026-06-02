import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { VacancyForm } from "@/components/features/recruitment/vacancies/vacancy-form";
import { updateVacancyAction } from "@/features/recruitment/vacancies/actions";
import { getVacancyById } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function EditVacancyPage({ params }: { params: Promise<{ vacancyId: string }> }) {
  const { vacancyId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/vacancies",
    permission: "recruitment.vacancies.write",
  });
  const [detail, campuses, offices] = await Promise.all([
    getVacancyById(vacancyId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.title}`}
        subtitle="Update vacancy details and status."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <VacancyForm
        mode="edit"
        initialValue={{
          title: detail.title,
          description: detail.description,
          qualificationNotes: detail.qualificationNotes,
          plantillaItemNo: detail.plantillaItemNo,
          employmentType: detail.employmentType,
          campusId: detail.campusId,
          officeId: detail.officeId,
          itemCount: detail.itemCount,
          status: detail.status,
          postedAt: detail.postedAt,
          closingAt: detail.closingAt,
          remarks: detail.remarks,
          requiredDocuments: detail.requiredDocuments,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={updateVacancyAction.bind(null, vacancyId)}
      />
    </div>
  );
}
