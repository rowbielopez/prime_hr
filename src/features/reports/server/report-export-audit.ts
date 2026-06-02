import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import type { ReportDocument, ReportFormat } from "@/features/reports/types";

export async function writeReportExportAudit(input: {
  report: ReportDocument;
  format: ReportFormat;
}): Promise<void> {
  const rowCounts = Object.fromEntries(
    input.report.datasets.map((dataset) => [
      dataset.title,
      dataset.rows.length,
    ]),
  );

  await writeAuditLog({
    eventType: "reports.exported",
    action: `export_report_${input.format}`,
    entityType: "report",
    entityId: input.report.definition.key,
    campusId: input.report.filters.campusId,
    metadata: {
      reportKey: input.report.definition.key,
      format: input.format,
      campusId: input.report.filters.campusId,
      officeId: input.report.filters.officeId,
      from: input.report.filters.from,
      to: input.report.filters.to,
      rowCounts,
    },
  });
}
