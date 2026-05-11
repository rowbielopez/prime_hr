import { PageHeader } from "@/components/foundation";
import { AnalyticsSummaryTables } from "@/components/features/learning/reports/analytics-summary-table";
import { CompletionTrendChart } from "@/components/features/learning/reports/completion-trend-chart";
import { ExportCsvButton } from "@/components/features/learning/reports/export-csv-button";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  listCompletionKpiDaily,
  listDeliveryLoadMonthly,
} from "@/features/learning/reports/repository/analytical-reports.repository";

export default async function LearningAnalyticsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/reports/analytics",
    permission: "learning.reports.read",
  });
  const [completionDaily, deliveryMonthly] = await Promise.all([
    listCompletionKpiDaily(context),
    listDeliveryLoadMonthly(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="flex justify-end gap-2">
        <ExportCsvButton
          filename="learning-completion-kpi-daily.csv"
          headers={["metricDate", "campusId", "programId", "participantCount", "completedCount", "attendedCount"]}
          rows={completionDaily as unknown as Array<Record<string, unknown>>}
        />
        <ExportCsvButton
          filename="learning-delivery-load-monthly.csv"
          headers={["metricMonth", "campusId", "programId", "sessionCount", "plannedCapacity", "enrolledCount"]}
          rows={deliveryMonthly as unknown as Array<Record<string, unknown>>}
        />
      </div>
      <CompletionTrendChart rows={completionDaily} />
      <AnalyticsSummaryTables completionDaily={completionDaily} deliveryMonthly={deliveryMonthly} />
    </div>
  );
}
