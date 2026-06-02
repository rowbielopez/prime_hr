import { BarChart3, Clock, ShieldCheck } from "lucide-react";

import { ReportDownloadButtons } from "@/components/features/reports/report-download-buttons";
import { PageHeader } from "@/components/foundation/page/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { REPORT_DEFINITIONS } from "@/features/reports/report-catalog";
import { buildCampusOperationsReport } from "@/features/reports/repository/campus-operations.repository";
import type { ReportFilters } from "@/features/reports/types";

const DEFAULT_FILTERS: ReportFilters = {
  campusId: null,
  officeId: null,
  from: null,
  to: null,
};

function summaryLabel(label: string): string {
  return label.replace(/_/g, " ");
}

export default async function ReportsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/reports",
    permission: "reports.read",
  });

  const reports = await Promise.all(
    REPORT_DEFINITIONS.map((definition) =>
      buildCampusOperationsReport(definition.key, context, DEFAULT_FILTERS),
    ),
  );

  const totalRows = reports.reduce(
    (sum, report) =>
      sum +
      report.datasets.reduce(
        (datasetSum, dataset) => datasetSum + dataset.rows.length,
        0,
      ),
    0,
  );

  return (
    <main className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        sticky={false}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart3 className="size-4" />
            Report Bundle
          </div>
          <div className="mt-2 text-2xl font-semibold">
            Campus HR Operations
          </div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="size-4" />
            Scope
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {context.isSuperAdmin || context.roles.includes("central_hr_admin")
              ? "All authorized"
              : "Assigned campus"}
          </div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" />
            Rows Available
          </div>
          <div className="mt-2 text-2xl font-semibold">{totalRows}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => {
          const datasetCount = report.datasets.reduce(
            (sum, dataset) => sum + dataset.rows.length,
            0,
          );
          return (
            <Card key={report.definition.key}>
              <CardHeader>
                <CardTitle>{report.definition.title}</CardTitle>
                <CardDescription>
                  {report.definition.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      Rows
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {datasetCount}
                    </div>
                  </div>
                  {report.summary.slice(0, 2).map((item) => (
                    <div key={`${report.definition.key}-${item.label}`}>
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        {summaryLabel(item.label)}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {report.datasets.map((dataset) => (
                    <span
                      key={dataset.title}
                      className="rounded-md border px-2 py-1"
                    >
                      {dataset.title}: {dataset.rows.length}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  PDF and XLSX exports are audit logged.
                </div>
                <ReportDownloadButtons
                  reportKey={report.definition.key}
                  filters={DEFAULT_FILTERS}
                />
              </CardFooter>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
