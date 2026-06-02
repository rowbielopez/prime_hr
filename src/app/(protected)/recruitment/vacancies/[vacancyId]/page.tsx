import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getVacancyById, listApplicationsByVacancyId } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import { VacancyDetailManagement } from "@/components/features/recruitment/vacancies/vacancy-detail-management";
import { listApplicants } from "@/features/recruitment/applicants/repository/applicants.repository";
import type { VacancyApplicationStatusCounts } from "@/features/recruitment/vacancies/types";

function emptyApplicationStatusCounts(): VacancyApplicationStatusCounts {
  return {
    submitted: 0,
    screening: 0,
    interview: 0,
    for_offer: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  };
}

export default async function VacancyDetailPage({ params }: { params: Promise<{ vacancyId: string }> }) {
  const { vacancyId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/vacancies",
    permission: "recruitment.vacancies.read",
  });
  const canManageStatus = context.permissions.includes("recruitment.vacancies.write");
  const canManageApplications = context.permissions.includes("recruitment.applicants.write");
  const [detail, applications, applicantOptions] = await Promise.all([
    getVacancyById(vacancyId, context),
    listApplicationsByVacancyId(vacancyId, context),
    canManageApplications ? listApplicants(context) : Promise.resolve([]),
  ]);
  if (!detail) notFound();
  const applicationStatusCounts = applications.reduce((counts, application) => {
    counts[application.applicationStatus] += 1;
    return counts;
  }, emptyApplicationStatusCounts());
  const detailWithApplicationSummary = {
    ...detail,
    applicantsCount: applications.length,
    applicationStatusCounts,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={detailWithApplicationSummary.title}
        subtitle="Vacancy details, scope association, and status handling."
        breadcrumb={[...pageMeta.breadcrumb, { label: detailWithApplicationSummary.title }]}
      />
      <VacancyDetailManagement
        detail={detailWithApplicationSummary}
        applications={applications}
        applicantOptions={applicantOptions}
        canManageStatus={canManageStatus}
        canManageApplications={canManageApplications}
      />
    </div>
  );
}
