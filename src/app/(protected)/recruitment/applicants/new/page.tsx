import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { ApplicantForm } from "@/components/features/recruitment/applicants/applicant-form";
import { createApplicantAction } from "@/features/recruitment/applicants/actions";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function NewApplicantPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/applicants",
    permission: "recruitment.applicants.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Applicant"
        subtitle="Create internal applicant profile for recruitment tracking."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <ApplicantForm
        mode="create"
        initialValue={{
          firstName: "",
          middleName: null,
          lastName: "",
          suffix: null,
          email: null,
          mobileNo: null,
          campusId: "",
          officeId: null,
          status: "new",
          notes: null,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={createApplicantAction}
      />
    </div>
  );
}
