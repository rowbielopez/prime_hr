import Link from "next/link";
import { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceCycleProgressRow, PerformanceDashboardSummary, PerformanceStatusCount } from "@/features/performance/types";

export function PerformanceDashboardCards({
  summary,
  statusCounts,
  cycleProgress,
}: {
  summary: PerformanceDashboardSummary;
  statusCounts: PerformanceStatusCount[];
  cycleProgress: PerformanceCycleProgressRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Active cycles" value={String(summary.activeCycles)} trend="Open appraisal periods" />
        <DashboardMetricCard label="Total records" value={String(summary.totalRecords)} trend="All records in scope" />
        <DashboardMetricCard label="Pending reviews" value={String(summary.pendingReviews)} trend="Submitted or under review" />
        <DashboardMetricCard label="Finalized" value={String(summary.finalizedRecords)} trend="Final rating completed" />
        <DashboardMetricCard label="Rejected" value={String(summary.rejectedRecords)} trend="Reviewer rejected" />
      </div>
      {cycleProgress.length > 0 ? (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium">Completion by cycle</h3>
          <p className="text-xs text-muted-foreground">Snapshot of records per cycle in your scope.</p>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Pending review</TableHead>
                  <TableHead className="text-right">Finalized</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycleProgress.map((row) => (
                  <TableRow key={row.cycleId}>
                    <TableCell>
                      <Link href={`/performance/cycles/${row.cycleId}`} className="text-primary hover:underline">
                        {row.cycleName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalRecords}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.pendingReview}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.finalized}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">Record status distribution</h3>
        <div className="mt-3 space-y-2">
          {statusCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet for this scope.</p>
          ) : (
            statusCounts.map((row) => (
              <div key={row.status} className="flex items-center justify-between text-sm">
                <span>{row.status}</span>
                <span>{row.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
