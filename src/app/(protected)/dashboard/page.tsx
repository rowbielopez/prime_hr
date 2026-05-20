import Link from "next/link";
import { redirect } from "next/navigation";
import {
    AlertTriangle,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    Clock,
    FileText,
    GraduationCap,
    HeartHandshake,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";
import {
    ActivityFeed,
    AnimatedMetricCard,
    PageHeader,
    ProgressRing,
    Sparkline,
} from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    getPrimeDashboardMetrics,
    listPrimeDashboardActivity,
} from "@/features/dashboard/repository/prime-dashboard.repository";
import { cn } from "@/lib/utils";

const quickActions = [
    {
        href: "/employees",
        title: "People directory",
        description: "Open records and 201 files",
        icon: Users,
        accent: "bg-module-people/12 text-module-people border-module-people/20",
    },
    {
        href: "/recruitment/vacancies",
        title: "Talent pipeline",
        description: "Review vacancies and applicants",
        icon: BriefcaseBusiness,
        accent:
            "bg-module-recruitment/12 text-module-recruitment border-module-recruitment/20",
    },
    {
        href: "/compliance/dashboard",
        title: "PRIME-HRM readiness",
        description: "Evidence, gaps, and action plans",
        icon: ShieldCheck,
        accent:
            "bg-module-compliance/12 text-module-compliance border-module-compliance/20",
    },
    {
        href: "/learning",
        title: "Growth programs",
        description: "Training plans and competencies",
        icon: GraduationCap,
        accent:
            "bg-module-learning/12 text-module-learning border-module-learning/20",
    },
    {
        href: "/rewards",
        title: "Recognition",
        description: "Awards and nominations",
        icon: HeartHandshake,
        accent: "bg-module-rewards/12 text-module-rewards border-module-rewards/20",
    },
];

export default async function DashboardPage() {
    const { context, pageMeta } = await withProtectedPageMeta({
        pathname: "/dashboard",
        permission: "dashboard.read",
    });

    // Redirect employee-only accounts to their personal workspace.
    if (!context.isSuperAdmin && context.roles.length === 1 && context.roles[0] === "employee") {
        redirect("/me");
    }
    const [metricsResult, activityResult] = await Promise.all([
        getPrimeDashboardMetrics(context),
        listPrimeDashboardActivity(context),
    ]);
    const queryError = metricsResult.error ?? activityResult.error;
    const metrics = metricsResult.data;

    const totalWorkload =
        metrics.recruitmentVacanciesForReview +
        metrics.recruitmentApplicationsInPipeline +
        metrics.complianceEvidenceSubmitted +
        metrics.complianceOverdueEvidence +
        metrics.complianceUnresolvedGaps;
    const complianceTotal =
        metrics.complianceEvidenceSubmitted +
        metrics.complianceOverdueEvidence +
        metrics.complianceUnresolvedGaps;
    const readinessScore =
        complianceTotal === 0
            ? 100
            : Math.max(
                0,
                Math.round(
                    ((metrics.complianceEvidenceSubmitted + 1) /
                        (complianceTotal + 1)) *
                    100,
                ),
            );
    const riskTone =
        metrics.complianceOverdueEvidence > 0 ||
            metrics.complianceUnresolvedGaps > 0
            ? "warning"
            : "success";

    const feedItems = activityResult.data.map((row, idx) => ({
        id: `${row.source}-${idx}-${row.occurredAt}`,
        title: row.label,
        description: row.detail ?? undefined,
        timestamp: row.occurredAt.slice(0, 19).replace("T", " "),
        tone: resolveActivityTone(row.detail),
        icon:
            row.source === "audit" ? (
                <FileText className="size-3" />
            ) : (
                <ShieldCheck className="size-3" />
            ),
    }));

    const workload = [
        {
            label: "Vacancies for review",
            value: metrics.recruitmentVacanciesForReview,
            href: "/recruitment/vacancies",
            icon: BriefcaseBusiness,
            tone: "text-module-recruitment bg-module-recruitment/12",
        },
        {
            label: "Applications in pipeline",
            value: metrics.recruitmentApplicationsInPipeline,
            href: "/recruitment/applicants",
            icon: Users,
            tone: "text-module-people bg-module-people/12",
        },
        {
            label: "Evidence awaiting review",
            value: metrics.complianceEvidenceSubmitted,
            href: "/compliance/evidence",
            icon: CheckCircle2,
            tone: "text-module-compliance bg-module-compliance/12",
        },
        {
            label: "Overdue evidence",
            value: metrics.complianceOverdueEvidence,
            href: "/compliance/evidence",
            icon: AlertTriangle,
            tone: "text-destructive bg-destructive/12",
        },
    ];

    return (
        <div className="space-y-6 lg:space-y-7">
            <PageHeader
                title={pageMeta.title}
                subtitle={pageMeta.subtitle}
                breadcrumb={pageMeta.breadcrumb}
                secondaryActions={
                    <Link
                        href="/reports"
                        className={cn(buttonVariants({ variant: "outline" }))}
                    >
                        Reports
                    </Link>
                }
            />

            {queryError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Unable to load dashboard data: {queryError}
                </div>
            ) : null}

            <section className="relative overflow-hidden rounded-lg border premium-border bg-surface-panel p-4 shadow-premium-sm md:p-5 lg:p-6">
                <div
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
                    aria-hidden
                />
                <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-md border premium-border bg-surface-inset px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Sparkles className="size-3.5 text-brand-gold" />
                            Live CSU PRIME-HR Command Center
                        </div>
                        <h2 className="mt-4 max-w-3xl text-xl font-semibold leading-tight text-foreground md:text-2xl">
                            A streamlined HR dashboard for people management, compliance, and
                            campus operations.
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Monitor key HR activities, track PRIME-HRM readiness, and quickly
                            access the workflows that matter most.
                        </p>
                    </div>
                    <div className="rounded-lg border premium-border bg-surface-panel p-3 shadow-premium-sm">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <SummaryTile label="Workload" value={totalWorkload} />
                            <SummaryTile label="Readiness" value={readinessScore} unit="%" />
                            <SummaryTile label="Employees" value={metrics.employeesTotal} />
                        </div>
                        <div className="mt-3 rounded-md border premium-border bg-surface-inset/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        Operational signal
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Current scoped snapshot
                                    </p>
                                </div>
                                <Sparkline
                                    data={[
                                        metrics.recruitmentOpenVacancies,
                                        metrics.recruitmentVacanciesForReview,
                                        metrics.recruitmentApplicationsInPipeline,
                                        metrics.complianceEvidenceSubmitted,
                                        totalWorkload,
                                    ]}
                                    tone={2}
                                    height={34}
                                    width={110}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AnimatedMetricCard
                    label="Employee Scope"
                    value={metrics.employeesTotal}
                    caption="Active employee records available in your current authorization scope."
                    spark={[
                        0,
                        Math.max(1, metrics.employeesTotal * 0.4),
                        Math.max(1, metrics.employeesTotal * 0.75),
                        metrics.employeesTotal,
                    ]}
                    sparkTone={2}
                />
                <AnimatedMetricCard
                    label="Vacancies Under Review"
                    value={metrics.recruitmentVacanciesForReview}
                    caption={`${metrics.recruitmentOpenVacancies} open vacancies need pipeline attention.`}
                    invertTrend
                    spark={[
                        metrics.recruitmentOpenVacancies,
                        metrics.recruitmentVacanciesForReview,
                        metrics.recruitmentApplicationsInPipeline,
                    ]}
                    sparkTone={4}
                />
                <AnimatedMetricCard
                    label="Evidence Submitted"
                    value={metrics.complianceEvidenceSubmitted}
                    caption="Compliance evidence waiting for governance review."
                    spark={[
                        0,
                        metrics.complianceEvidenceSubmitted,
                        metrics.complianceEvidenceSubmitted +
                        metrics.complianceUnresolvedGaps,
                    ]}
                    sparkTone={3}
                />
                <AnimatedMetricCard
                    label="Overdue Evidence"
                    value={metrics.complianceOverdueEvidence}
                    caption={`${metrics.complianceUnresolvedGaps} unresolved action plan gap(s).`}
                    invertTrend
                    spark={[
                        metrics.complianceEvidenceSubmitted,
                        metrics.complianceUnresolvedGaps,
                        metrics.complianceOverdueEvidence,
                    ]}
                    sparkTone={1}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="apple-panel rounded-lg border premium-border p-5 shadow-premium-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    Workload Queue
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Prioritized work that needs HR movement.
                                </p>
                            </div>
                            <Badge variant="outline" className="rounded-full">
                                {totalWorkload} active
                            </Badge>
                        </div>
                        <div className="mt-4 space-y-2">
                            {workload.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="group flex items-center justify-between gap-3 rounded-md border premium-border bg-surface-panel/72 p-3 transition-all hover:bg-surface-raised hover:shadow-premium-sm"
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={cn(
                                                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                                                    item.tone,
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium text-foreground">
                                                    {item.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Open workflow
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
                                            {item.value}
                                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="apple-panel rounded-lg border premium-border p-5 shadow-premium-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    PRIME-HRM Readiness
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Evidence health and unresolved governance pressure.
                                </p>
                            </div>
                            <ProgressRing
                                value={readinessScore}
                                max={100}
                                size={72}
                                tone={riskTone}
                                ariaLabel="PRIME-HRM readiness score"
                            >
                                {readinessScore}%
                            </ProgressRing>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <ReadinessMetric
                                label="Submitted"
                                value={metrics.complianceEvidenceSubmitted}
                                tone="text-module-compliance"
                            />
                            <ReadinessMetric
                                label="Gaps"
                                value={metrics.complianceUnresolvedGaps}
                                tone="text-status-warning"
                            />
                            <ReadinessMetric
                                label="Overdue"
                                value={metrics.complianceOverdueEvidence}
                                tone="text-destructive"
                            />
                        </div>
                        <div className="mt-4 rounded-md border premium-border bg-surface-inset/60 p-3 text-xs leading-5 text-muted-foreground">
                            {riskTone === "warning"
                                ? "Resolve overdue evidence and action-plan gaps first; they have the highest governance impact."
                                : "No overdue evidence or unresolved gaps are visible in your current scope."}
                        </div>
                    </div>
                </div>

                <aside className="apple-panel rounded-lg border premium-border p-5 shadow-premium-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                Quick Moves
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Five high-frequency modules, grouped by outcome.
                            </p>
                        </div>
                        <Clock className="size-4 text-muted-foreground" />
                    </div>
                    <div className="mt-4 space-y-2">
                        {quickActions.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group flex items-center justify-between gap-3 rounded-md border border-transparent p-2.5 transition-all hover:border-border hover:bg-surface-raised"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-md border",
                                                item.accent,
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-foreground">
                                                {item.title}
                                            </span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {item.description}
                                            </span>
                                        </span>
                                    </span>
                                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            );
                        })}
                    </div>
                </aside>
            </section>

            <section className="apple-panel rounded-lg border premium-border p-5 shadow-premium-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">
                            Live Activity Timeline
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {context.permissions.includes("audit.logs.read")
                                ? "Security-sensitive and operational events across your scope."
                                : "Recent compliance movement in your authorization scope."}
                        </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                        {feedItems.length} events
                    </Badge>
                </div>
                <ActivityFeed
                    items={feedItems}
                    className="grid gap-4 lg:grid-cols-2"
                    emptyState={
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No recent activity.
                        </p>
                    }
                />
            </section>
        </div>
    );
}

function SummaryTile({
    label,
    value,
    unit,
}: {
    label: string;
    value: number;
    unit?: string;
}) {
    return (
        <div className="rounded-md bg-surface-panel px-3 py-3 shadow-premium-sm">
            <p className="text-xl font-semibold leading-none tabular-nums text-foreground">
                {value}
                {unit}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
        </div>
    );
}

function ReadinessMetric({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: string;
}) {
    return (
        <div className="rounded-md border premium-border bg-surface-panel/70 p-3">
            <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

function resolveActivityTone(
    detail: string | null,
): "neutral" | "info" | "success" | "warning" | "danger" {
    const text = detail?.toLowerCase() ?? "";
    if (
        text.includes("overdue") ||
        text.includes("reject") ||
        text.includes("failed")
    )
        return "danger";
    if (
        text.includes("pending") ||
        text.includes("submitted") ||
        text.includes("open")
    )
        return "warning";
    if (
        text.includes("approve") ||
        text.includes("verified") ||
        text.includes("complete")
    )
        return "success";
    if (text.includes("update") || text.includes("review")) return "info";
    return "neutral";
}
