import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { ApplicantForm } from "@/components/features/recruitment/applicants/applicant-form";
import { updateApplicantAction } from "@/features/recruitment/applicants/actions";
import { getApplicantById } from "@/features/recruitment/applicants/repository/applicants.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function EditApplicantPage({ params }: { params: Promise<{ applicantId: string }> }) {
  const { applicantId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/applicants",
    permission: "recruitment.applicants.write",
  });
  const [detail, campuses, offices] = await Promise.all([
    getApplicantById(applicantId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.fullName}`}
        subtitle="Update applicant profile details."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.fullName }]}
      />
      <ApplicantForm
        mode="edit"
        initialValue={{
          firstName: detail.firstName,
          middleName: detail.middleName,
          lastName: detail.lastName,
          suffix: detail.suffix,
          email: detail.email,
          mobileNo: detail.mobileNo,
          campusId: detail.campusId,
          officeId: detail.officeId,
          status: detail.status,
          notes: detail.notes,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={(input) => updateApplicantAction(applicantId, input)}
      />
    </div>
  );
}
