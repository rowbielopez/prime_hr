import { PageHeader } from "@/components/foundation";
import { ExportCsvButton } from "@/components/features/learning/reports/export-csv-button";
import { SessionUtilizationTable } from "@/components/features/learning/reports/session-utilization-table";
import { UtilizationChart } from "@/components/features/learning/reports/utilization-chart";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listSessionUtilizationRows } from "@/features/learning/reports/repository/operational-reports.repository";

export default async function LearningOperationalReportsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/reports/operational",
    permission: "learning.reports.read",
  });
  const rows = await listSessionUtilizationRows(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="flex justify-end">
        <ExportCsvButton
          filename="learning-session-utilization.csv"
          headers={[
            "sessionTitle",
            "campusName",
            "startsAt",
            "status",
            "participantCount",
            "attendedCount",
            "absentCount",
            "completedCount",
            "capacity",
          ]}
          rows={rows as unknown as Array<Record<string, unknown>>}
        />
      </div>
      <UtilizationChart rows={rows} />
      <SessionUtilizationTable rows={rows} />
    </div>
  );
}
