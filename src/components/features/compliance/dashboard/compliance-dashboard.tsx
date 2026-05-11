import { DashboardMetricCard, DataTableWrapper } from "@/components/foundation";
import type {
  ComplianceDashboardCampusBreakdown,
  ComplianceDashboardSummary,
  UnresolvedGapListItem,
} from "@/features/compliance/evidence/types";

type ComplianceDashboardProps = {
  summary: ComplianceDashboardSummary;
  campusBreakdown: ComplianceDashboardCampusBreakdown[];
  unresolvedGaps: UnresolvedGapListItem[];
  queryError?: string | null;
};

export function ComplianceDashboard({ summary, campusBreakdown, unresolvedGaps, queryError }: ComplianceDashboardProps) {
  return (
    <div className="space-y-6">
      {queryError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to load dashboard metrics: {queryError}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard label="Total Evidence Items" value={String(summary.totalItems)} />
        <DashboardMetricCard label="Approved" value={String(summary.approvedCount)} trend="Compliant submissions" />
        <DashboardMetricCard label="Submitted" value={String(summary.submittedCount)} trend="Awaiting review" />
        <DashboardMetricCard label="Rejected" value={String(summary.rejectedCount)} trend="Needs corrective action" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardMetricCard label="Draft" value={String(summary.draftCount)} />
        <DashboardMetricCard label="Open Gaps" value={String(summary.withOpenGapCount)} />
        <DashboardMetricCard label="Overdue Items" value={String(summary.overdueCount)} />
      </div>

      <DataTableWrapper
        title="Campus Compliance Breakdown"
        description="Summary by campus with approved, rejected, and pending evidence."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">Campus</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Approved</th>
                <th className="px-2 py-2">Rejected</th>
                <th className="px-2 py-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {campusBreakdown.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={5}>
                    No compliance data available for this scope.
                  </td>
                </tr>
              ) : (
                campusBreakdown.map((row) => (
                  <tr key={row.campusId} className="border-b">
                    <td className="px-2 py-2">{row.campusName}</td>
                    <td className="px-2 py-2">{row.total}</td>
                    <td className="px-2 py-2">{row.approved}</td>
                    <td className="px-2 py-2">{row.rejected}</td>
                    <td className="px-2 py-2">{row.pending}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>

      <DataTableWrapper
        title="Unresolved Gaps"
        description="Open or in-progress action plans (overdue items prioritized)."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">Due</th>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Progress</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Responsible Office</th>
                <th className="px-2 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {unresolvedGaps.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={7}>
                    No unresolved gaps for this scope.
                  </td>
                </tr>
              ) : (
                unresolvedGaps.map((row) => (
                  <tr key={row.evidenceId} className="border-b">
                    <td className="px-2 py-2">
                      {row.isOverdue ? <span className="text-destructive">{row.dueDate}</span> : row.dueDate}
                    </td>
                    <td className="px-2 py-2">{row.gapSeverity}</td>
                    <td className="px-2 py-2">{row.gapCategory}</td>
                    <td className="px-2 py-2">
                      {row.progressPercent}% ({row.actionPlanStatus})
                    </td>
                    <td className="px-2 py-2">
                      {row.ownerName}
                      {row.ownerUserLabel ? <div className="text-xs text-muted-foreground">{row.ownerUserLabel}</div> : null}
                    </td>
                    <td className="px-2 py-2">{row.responsibleOfficeLabel ?? "-"}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{row.indicatorCode}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.campusName}
                        {row.officeName ? ` / ${row.officeName}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.evidenceTitle}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </div>
  );
}
