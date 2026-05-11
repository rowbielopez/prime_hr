import { PageHeader } from "@/components/foundation";
import { ExportCsvButton } from "@/components/features/learning/reports/export-csv-button";
import { RequestPipelineTable } from "@/components/features/learning/reports/request-pipeline-table";
import { RequestsStatusChart } from "@/components/features/learning/reports/requests-status-chart";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listRequestPipelineRows } from "@/features/learning/reports/repository/operational-reports.repository";

export default async function LearningRequestAnalyticsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/reports/requests",
    permission: "learning.reports.read",
  });
  const rows = await listRequestPipelineRows(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="flex justify-end">
        <ExportCsvButton
          filename="learning-request-pipeline.csv"
          headers={["campusName", "requestKind", "status", "requestCount"]}
          rows={rows as unknown as Array<Record<string, unknown>>}
        />
      </div>
      <RequestsStatusChart rows={rows} />
      <RequestPipelineTable rows={rows} />
    </div>
  );
}
