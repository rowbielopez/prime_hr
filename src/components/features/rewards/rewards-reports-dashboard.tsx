import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";
import { ContentSection } from "@/components/foundation/page/content-section";
import { cn } from "@/lib/utils";
import type {
  RewardsApprovalTurnaroundMonthlyRow,
  RewardsApprovalTurnaroundSummary,
  RewardsAwardDistributionByCampusRow,
  RewardsReportPeriod,
} from "@/features/rewards/types";

export function RewardsReportsDashboard({
  period,
  approvalSummary,
  turnaroundMonthly,
  distributionByCampus,
}: {
  period: RewardsReportPeriod;
  approvalSummary: RewardsApprovalTurnaroundSummary;
  turnaroundMonthly: RewardsApprovalTurnaroundMonthlyRow[];
  distributionByCampus: RewardsAwardDistributionByCampusRow[];
}) {
  const periodLabel = period.from || period.to ? `${period.from ?? "Any"} to ${period.to ?? "Any"}` : "All time";
  return (
    <div className="space-y-6">
      <ContentSection>
        <form className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">From date</span>
            <Input name="from" type="date" defaultValue={period.from ?? ""} className="h-9" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-foreground">To date</span>
            <Input name="to" type="date" defaultValue={period.to ?? ""} className="h-9" />
          </label>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button type="submit" size="lg">
              Apply period
            </Button>
            <a
              href="/rewards/reports"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Clear
            </a>
          </div>
        </form>
      </ContentSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Records considered" value={String(approvalSummary.consideredCount)} trend={periodLabel} />
        <DashboardMetricCard label="Average turnaround" value={approvalSummary.averageDays == null ? "-" : `${approvalSummary.averageDays}d`} trend="Submitted to approved/awarded" />
        <DashboardMetricCard label="Median turnaround" value={approvalSummary.medianDays == null ? "-" : `${approvalSummary.medianDays}d`} trend="Less sensitive to outliers" />
        <DashboardMetricCard label="<= 7 days" value={String(approvalSummary.within7Days)} trend="Fast approvals" />
        <DashboardMetricCard label="<= 14 days" value={String(approvalSummary.within14Days)} trend="On-time approvals" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval turnaround by month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {turnaroundMonthly.length === 0 ? (
              <p className="text-muted-foreground">No approval turnaround data for selected period.</p>
            ) : (
              turnaroundMonthly.map((row) => (
                <div key={row.month} className="grid grid-cols-3 gap-2 rounded border px-3 py-2">
                  <span>{row.month}</span>
                  <span>{row.count} records</span>
                  <span>{row.averageDays} days avg</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Award distribution by campus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {distributionByCampus.length === 0 ? (
              <p className="text-muted-foreground">No awardees found for selected period.</p>
            ) : (
              distributionByCampus.map((row) => (
                <div key={`${row.campusId ?? "none"}-${row.campusName}`} className="flex items-center justify-between rounded border px-3 py-2">
                  <span>{row.campusName}</span>
                  <span>{row.awardeeCount}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

