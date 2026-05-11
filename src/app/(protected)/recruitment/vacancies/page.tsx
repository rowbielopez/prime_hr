import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { VacancyListManagement } from "@/components/features/recruitment/vacancies/vacancy-list-management";
import { listVacancies } from "@/features/recruitment/vacancies/repository/vacancies.repository";

export default async function VacanciesPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/vacancies",
    permission: "recruitment.vacancies.read",
  });
  const rows = await listVacancies(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <VacancyListManagement rows={rows} />
    </div>
  );
}
