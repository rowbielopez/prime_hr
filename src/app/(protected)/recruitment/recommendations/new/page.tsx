import { PageHeader } from "@/components/foundation";
import { RecommendationForm } from "@/components/features/recruitment/recommendations/recommendation-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { upsertRecommendationAction } from "@/features/recruitment/recommendations/actions";
import { listVacancies } from "@/features/recruitment/vacancies/repository/vacancies.repository";
import { listApplicants } from "@/features/recruitment/applicants/repository/applicants.repository";

export default async function NewRecommendationPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment/recommendations",
    permission: "recruitment.recommendations.write",
  });

  const [vacancies, applicants] = await Promise.all([listVacancies(context), listApplicants(context)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Appointment Recommendation"
        subtitle="Create a recommendation record with remarks and approval status."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <RecommendationForm
        initialValue={{
          vacancyId: "",
          applicantId: "",
          status: "draft",
          remarks: null,
          justification: null,
          decidedAt: null,
        }}
        vacancyOptions={vacancies.map((vacancy) => ({ id: vacancy.id, title: vacancy.title }))}
        applicantOptions={applicants.map((applicant) => ({ id: applicant.id, fullName: applicant.fullName }))}
        onSubmit={upsertRecommendationAction}
      />
    </div>
  );
}
