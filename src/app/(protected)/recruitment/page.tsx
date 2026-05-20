import Link from "next/link";
import { PageHeader, AnimatedMetricCard } from "@/components/foundation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getRecruitmentDashboardSummary } from "@/features/recruitment/dashboard/repository/recruitment-dashboard.repository";

export default async function RecruitmentDashboardPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/recruitment",
    permission: "recruitment.applicants.read",
  });
  const summary = await getRecruitmentDashboardSummary(context);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent Pipeline"
        subtitle="Track potential applicants, screening, interviews, and conversions to employees."
        breadcrumb={pageMeta.breadcrumb}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/recruitment/vacancies" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Vacancies
            </Link>
            <Link href="/recruitment/applicants" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Applicants
            </Link>
            <Link href="/recruitment/applicants/new" className={cn(buttonVariants({ size: "sm" }))}>
              Add Applicant
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AnimatedMetricCard label="Total Applicants" value={summary.totals.totalApplicants} />
        <AnimatedMetricCard label="New This Month" value={summary.totals.newThisMonth} />
        <AnimatedMetricCard label="Shortlisted" value={summary.totals.shortlisted} />
        <AnimatedMetricCard label="In Interview" value={summary.totals.inInterview} />
        <AnimatedMetricCard label="Hired" value={summary.totals.hired} />
        <AnimatedMetricCard label="Open Vacancies" value={summary.totals.openVacancies} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Applicants</h2>
            <Link
              href="/recruitment/applicants"
              className="text-xs text-muted-foreground underline"
            >
              View all
            </Link>
          </div>
          {summary.recentApplicants.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No applicants yet. Use <span className="font-medium">Add Applicant</span> to start
              the pipeline.
            </p>
          ) : (
            <ul className="mt-3 divide-y">
              {summary.recentApplicants.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/recruitment/applicants/${row.id}`}
                      className="block truncate font-medium underline"
                    >
                      {row.fullName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.campusName} · {row.status}
                      {row.convertedEmployeeId ? " · converted" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Upcoming Interviews</h2>
          {summary.upcomingInterviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No interviews scheduled. Schedule one from an applicant&apos;s profile.
            </p>
          ) : (
            <ul className="mt-3 divide-y">
              {summary.upcomingInterviews.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/recruitment/applicants/${row.applicantId}`}
                      className="block truncate font-medium underline"
                    >
                      {row.applicantName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.mode.replace("_", " ")} · {row.outcome}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(row.scheduledAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
