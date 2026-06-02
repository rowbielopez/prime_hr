import { notFound } from "next/navigation";
import { getPublicVacancyBySlug } from "@/features/recruitment/public/repository/public-careers.repository";
import { VacancyDetailView } from "@/components/features/careers/vacancy-detail-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CareerVacancyPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const vacancy = await getPublicVacancyBySlug(slug);
    if (!vacancy) notFound();
    return (
        <div className="container mx-auto px-6 lg:px-12 py-12">
            <VacancyDetailView vacancy={vacancy} />
        </div>
    );
}
