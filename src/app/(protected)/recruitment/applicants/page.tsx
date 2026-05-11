import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { ApplicantListManagement } from "@/components/features/recruitment/applicants/applicant-list-management";
import { listApplicants } from "@/features/recruitment/applicants/repository/applicants.repository";

export default async function ApplicantsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/applicants",
    permission: "recruitment.applicants.read",
  });
  const rows = await listApplicants(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <ApplicantListManagement rows={rows} />
    </div>
  );
}
