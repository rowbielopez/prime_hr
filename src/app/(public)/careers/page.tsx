import { listPublicVacancies } from "@/features/recruitment/public/repository/public-careers.repository";
import { CareersHero } from "@/components/features/careers/careers-hero";
import { PublicCareersShell } from "@/components/features/careers/public-careers-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CareersIndexPage() {
    const vacancies = await listPublicVacancies();
    return (
        <>
            <CareersHero count={vacancies.length} />
            <div className="container mx-auto px-6 lg:px-12 py-12">
                <PublicCareersShell vacancies={vacancies} />
            </div>
        </>
    );
}
