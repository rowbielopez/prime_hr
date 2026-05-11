"use client";

import { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  RecommendationReportSummary,
  RecommendationVacancyBreakdown,
} from "@/features/recruitment/recommendations/types";

type RecommendationReportsProps = {
  summary: RecommendationReportSummary;
  breakdown: RecommendationVacancyBreakdown[];
};

export function RecommendationReports({ summary, breakdown }: RecommendationReportsProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardMetricCard
          label="Total Recommendations"
          value={String(summary.total)}
          trend="Current scoped recommendation records."
        />
        <DashboardMetricCard
          label="Approved Recommendations"
          value={String(summary.byStatus.approved)}
          trend="Ready for appointment processing."
        />
        <DashboardMetricCard
          label="Updated Last 7 Days"
          value={String(summary.recentlyUpdatedCount)}
          trend="Recent recommendation activity."
        />
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Status Distribution</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          <div className="rounded border p-2">Draft: {summary.byStatus.draft}</div>
          <div className="rounded border p-2">For Review: {summary.byStatus.for_review}</div>
          <div className="rounded border p-2">Endorsed: {summary.byStatus.endorsed}</div>
          <div className="rounded border p-2">Approved: {summary.byStatus.approved}</div>
          <div className="rounded border p-2">Rejected: {summary.byStatus.rejected}</div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Vacancy Breakdown</h3>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacancy</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Endorsed</TableHead>
                <TableHead className="text-right">For Review</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Draft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No recommendation records found for current scope.
                  </TableCell>
                </TableRow>
              ) : (
                breakdown.map((row) => (
                  <TableRow key={row.vacancyId}>
                    <TableCell>{row.vacancyTitle}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.approved}</TableCell>
                    <TableCell className="text-right">{row.endorsed}</TableCell>
                    <TableCell className="text-right">{row.forReview}</TableCell>
                    <TableCell className="text-right">{row.rejected}</TableCell>
                    <TableCell className="text-right">{row.draft}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
