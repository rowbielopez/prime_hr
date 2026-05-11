import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardDashboardSummary, RewardStatusCount } from "@/features/rewards/types";
import { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";

export function RewardsHub({
  summary,
  statusCounts,
}: {
  summary: RewardDashboardSummary;
  statusCounts: RewardStatusCount[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Active awards" value={String(summary.activeAwards)} trend="Current catalog entries" />
        <DashboardMetricCard label="Nominations" value={String(summary.totalNominations)} trend="All records in scope" />
        <DashboardMetricCard label="Pending reviews" value={String(summary.pendingReviews)} trend="Submitted or under review" />
        <DashboardMetricCard label="Approved" value={String(summary.approvedNominations)} trend="Ready for awarding" />
        <DashboardMetricCard label="Awarded" value={String(summary.awardedCount)} trend="Awardee records created" />
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">Nomination status distribution</h3>
        <div className="mt-3 space-y-2">
          {statusCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No nominations yet for this scope.</p>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awards catalog</CardTitle>
            <CardDescription>Configure awards, windows, and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rewards/awards" className="text-sm text-primary hover:underline">
              Open awards
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nominations</CardTitle>
            <CardDescription>Submit and track nominations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rewards/nominations" className="text-sm text-primary hover:underline">
              Open nominations
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awardee history</CardTitle>
            <CardDescription>View awarded employees.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rewards/history" className="text-sm text-primary hover:underline">
              Open history
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports</CardTitle>
            <CardDescription>Analyze turnaround and award distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rewards/reports" className="text-sm text-primary hover:underline">
              Open reports
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

