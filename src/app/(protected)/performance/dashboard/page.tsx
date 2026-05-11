import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { PerformanceDashboardCards } from "@/components/features/performance/performance-dashboard-cards";
import {
  getPerformanceDashboardSummary,
  listPerformanceCycleProgress,
  listPerformanceStatusCounts,
} from "@/features/performance/repository/dashboard.repository";

export default async function PerformanceCompletionDashboardPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/dashboard",
    permission: "performance.dashboard.read",
  });
  const [summary, statusCounts, cycleProgress] = await Promise.all([
    getPerformanceDashboardSummary(context),
    listPerformanceStatusCounts(context),
    listPerformanceCycleProgress(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <PerformanceDashboardCards summary={summary} statusCounts={statusCounts} cycleProgress={cycleProgress} />
    </div>
  );
}
