import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicVacancyBySlug } from "@/features/recruitment/public/repository/public-careers.repository";
import { PublicApplyForm } from "@/components/features/careers/public-apply-form";
import { getVacancyState } from "@/components/features/careers/vacancy-badges";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CareerApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vacancy = await getPublicVacancyBySlug(slug);
  if (!vacancy) notFound();

  const state = getVacancyState(vacancy.postedAt, vacancy.closingAt);
  const closed = state === "deadline_passed";

  return (
    <div className="container mx-auto px-6 lg:px-12 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <Link
            href={`/careers/${vacancy.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
              <path
                d="M12 7H2M6 3.5L2.5 7 6 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to position details
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Apply for this position
          </h1>
          <p className="text-muted-foreground">
            Submit the form below to send your application. You will receive a
            reference number to track your submission.
          </p>
        </div>
        {closed ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-8 text-center">
            <p className="font-semibold text-foreground">
              This vacancy is no longer accepting applications.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The application deadline has passed.
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg border border-border bg-surface-raised text-sm font-semibold transition-colors hover:bg-surface-inset"
            >
              Browse open positions
            </Link>
          </div>
        ) : (
          <PublicApplyForm
            vacancySlug={vacancy.slug}
            vacancyTitle={vacancy.title}
            campusName={vacancy.campusName}
            officeName={vacancy.officeName}
            employmentType={vacancy.employmentType}
            requiredDocuments={vacancy.requiredDocuments}
          />
        )}
      </div>
    </div>
  );
}
