import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { ApplicantDetailManagement } from "@/components/features/recruitment/applicants/applicant-detail-management";
import {
  createInterviewRecordAction,
  createScreeningResultAction,
  createApplicationAction,
  updateApplicationStatusAction,
} from "@/features/recruitment/applicants/actions";
import { getApplicantById } from "@/features/recruitment/applicants/repository/applicants.repository";
import { listVacancies } from "@/features/recruitment/vacancies/repository/vacancies.repository";

export default async function ApplicantDetailPage({ params }: { params: Promise<{ applicantId: string }> }) {
  const { applicantId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/applicants",
    permission: "recruitment.applicants.read",
  });
  const canEditApplicant = context.permissions.includes("recruitment.applicants.write");
  const canManageApplications = context.permissions.includes("recruitment.applicants.write");
  const [detail, vacancies] = await Promise.all([
    getApplicantById(applicantId, context),
    listVacancies(context),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.fullName}
        subtitle="Applicant profile and linked application records."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.fullName }]}
      />
      <ApplicantDetailManagement
        detail={detail}
        vacancyOptions={vacancies.map((vacancy) => ({ id: vacancy.id, title: vacancy.title }))}
        canEditApplicant={canEditApplicant}
        canManageApplications={canManageApplications}
        onCreateApplication={createApplicationAction}
        onUpdateApplicationStatus={(applicationId, input) => updateApplicationStatusAction(applicationId, input)}
        onCreateScreeningResult={createScreeningResultAction}
        onCreateInterviewRecord={createInterviewRecordAction}
      />
    </div>
  );
}
