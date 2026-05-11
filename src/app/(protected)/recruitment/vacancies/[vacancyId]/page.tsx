import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getVacancyById } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import { VacancyDetailManagement } from "@/components/features/recruitment/vacancies/vacancy-detail-management";

export default async function VacancyDetailPage({ params }: { params: Promise<{ vacancyId: string }> }) {
  const { vacancyId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/vacancies",
    permission: "recruitment.vacancies.read",
  });
  const canManageStatus = context.permissions.includes("recruitment.vacancies.write");
  const detail = await getVacancyById(vacancyId, context);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title}
        subtitle="Vacancy details, scope association, and status handling."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <VacancyDetailManagement detail={detail} canManageStatus={canManageStatus} />
    </div>
  );
}
