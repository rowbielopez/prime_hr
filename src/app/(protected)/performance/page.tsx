import Link from "next/link";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  getPerformanceDashboardSummary,
  listPerformanceCycleProgress,
  listPerformanceStatusCounts,
} from "@/features/performance/repository/dashboard.repository";
import { PerformanceDashboardCards } from "@/components/features/performance/performance-dashboard-cards";

export default async function PerformancePage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance",
    permission: "performance.read",
  });
  const [summary, statusCounts, cycleProgress] = await Promise.all([
    getPerformanceDashboardSummary(context),
    listPerformanceStatusCounts(context),
    listPerformanceCycleProgress(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <PerformanceDashboardCards summary={summary} statusCounts={statusCounts} cycleProgress={cycleProgress} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cycle setup</CardTitle>
            <CardDescription>Configure performance periods and deadlines.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/cycles" className="text-sm text-primary hover:underline">
              Open cycles
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance records</CardTitle>
            <CardDescription>Create records, assign staff and cycles, and manage targets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/records" className="text-sm text-primary hover:underline">
              Open performance records
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My performance</CardTitle>
            <CardDescription>Manage your objectives and accomplishments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/my" className="text-sm text-primary hover:underline">
              Open my records
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review queue</CardTitle>
            <CardDescription>Process submitted records and approvals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/reviews" className="text-sm text-primary hover:underline">
              Open reviews
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion dashboard</CardTitle>
            <CardDescription>Track record status and finalization progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/dashboard" className="text-sm text-primary hover:underline">
              Open dashboard
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finalization</CardTitle>
            <CardDescription>Finalize approved records and compute final ratings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/finalizations" className="text-sm text-primary hover:underline">
              Open finalization queue
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final rating summary</CardTitle>
            <CardDescription>View finalized ratings by cycle and employee.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/performance/summary" className="text-sm text-primary hover:underline">
              Open summary
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
