import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, FileText, Users, ArrowRight, ShieldCheck } from "lucide-react";
import {
  AnimatedMetricCard,
  ActivityFeed,
  PageHeader,
} from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { buttonVariants } from "@/components/ui/button";
import { listPrimeDashboardActivity, getPrimeDashboardMetrics } from "@/features/dashboard/repository/prime-dashboard.repository";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { context, pageMeta } = await withProtectedPageMeta({ pathname: "/dashboard", permission: "dashboard.read" });
  const [metricsResult, activityResult] = await Promise.all([getPrimeDashboardMetrics(context), listPrimeDashboardActivity(context)]);
  const queryError = metricsResult.error ?? activityResult.error;

  const feedItems = activityResult.data.map((row, idx) => ({
    id: `${row.source}-${idx}-${row.occurredAt}`,
    title: row.label,
    description: row.detail ?? undefined,
    timestamp: row.occurredAt.slice(0, 19).replace("T", " "),
    tone: "neutral" as const,
  }));

  const quickLinks = [
    {
      href: "/employees",
      title: "Employees",
      description: "Directory & records",
      icon: Users,
      className: "bg-module-people/12 text-module-people",
    },
    {
      href: "/recruitment/vacancies",
      title: "Recruitment",
      description: "Vacancies & applicants",
      icon: Clock,
      className: "bg-module-recruitment/12 text-module-recruitment",
    },
    {
      href: "/compliance/dashboard",
      title: "Compliance",
      description: "Evidence & action plans",
      icon: CheckCircle2,
      className: "bg-module-compliance/12 text-module-compliance",
    },
    {
      href: "/performance",
      title: "Performance",
      description: "Reviews & cycles",
      icon: AlertTriangle,
      className: "bg-module-performance/12 text-module-performance",
    },
    {
      href: "/learning",
      title: "Learning & Dev",
      description: "Programs & sessions",
      icon: FileText,
      className: "bg-module-learning/12 text-module-learning",
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={pageMeta.breadcrumb}
        secondaryActions={
          <Link href="/reports" className={cn(buttonVariants({ variant: "outline" }))}>
            Reports
          </Link>
        }
      />

      {queryError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to load dashboard data: {queryError}
        </div>
      ) : null}

      <section className="apple-panel overflow-hidden rounded-lg border premium-border p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border premium-border bg-surface-glass px-3 py-1 text-xs font-medium text-muted-foreground shadow-premium-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Live CSU PRIME-HR Workspace
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">
              A calm operating view for HR, compliance, and campus workflows.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review workload, spot exceptions, and move into the right module without losing context.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border premium-border bg-surface-inset/70 p-2 text-center shadow-premium-sm sm:min-w-[22rem]">
            <div className="rounded-md bg-surface-panel px-3 py-2">
              <p className="text-lg font-semibold tabular-nums">{metricsResult.data.recruitmentVacanciesForReview}</p>
              <p className="text-[11px] text-muted-foreground">For Review</p>
            </div>
            <div className="rounded-md bg-surface-panel px-3 py-2">
              <p className="text-lg font-semibold tabular-nums">{metricsResult.data.complianceEvidenceSubmitted}</p>
              <p className="text-[11px] text-muted-foreground">Submitted</p>
            </div>
            <div className="rounded-md bg-surface-panel px-3 py-2">
              <p className="text-lg font-semibold tabular-nums">{metricsResult.data.complianceOverdueEvidence}</p>
              <p className="text-[11px] text-muted-foreground">Overdue</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnimatedMetricCard
          label="Employees"
          value={metricsResult.data.employeesTotal}
          caption="Active employee records in your scope"
        />
        <AnimatedMetricCard
          label="Vacancies Under Review"
          value={metricsResult.data.recruitmentVacanciesForReview}
          caption="Recruitment items awaiting HR review"
          invertTrend
        />
        <AnimatedMetricCard
          label="Evidence Submitted"
          value={metricsResult.data.complianceEvidenceSubmitted}
          caption="Evidence items pending compliance review"
        />
        <AnimatedMetricCard
          label="Overdue Evidence"
          value={metricsResult.data.complianceOverdueEvidence}
          caption={`${metricsResult.data.complianceUnresolvedGaps} unresolved action plan gap(s)`}
          invertTrend
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="apple-panel rounded-lg border premium-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {context.permissions.includes("audit.logs.read")
                    ? "Security-sensitive and operational events."
                    : "Recent compliance activity in your scope."}
                </p>
              </div>
            </div>
            <ActivityFeed
              items={feedItems}
              emptyState={
                <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
              }
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Quick Access</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Open a focused workflow.</p>
          </div>
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-lg border premium-border bg-surface-panel p-4 shadow-premium-sm transition-all hover-lift"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.className)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
