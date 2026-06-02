import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { VacancyForm } from "@/components/features/recruitment/vacancies/vacancy-form";
import { createVacancyAction } from "@/features/recruitment/vacancies/actions";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function NewVacancyPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/vacancies",
    permission: "recruitment.vacancies.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Vacancy"
        subtitle="Register a new staffing vacancy with scope and status."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <VacancyForm
        mode="create"
        initialValue={{
          title: "",
          description: null,
          qualificationNotes: null,
          plantillaItemNo: null,
          employmentType: null,
          campusId: "",
          officeId: null,
          itemCount: 1,
          status: "draft",
          postedAt: null,
          closingAt: null,
          remarks: null,
          requiredDocuments: [],
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={createVacancyAction}
      />
    </div>
  );
}
