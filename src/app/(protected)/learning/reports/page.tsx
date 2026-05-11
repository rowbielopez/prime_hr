import { PageHeader } from "@/components/foundation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getLearningDashboardSummary } from "@/features/learning/dashboard/repository/learning-dashboard.repository";

export default async function LearningReportsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/reports",
    permission: "learning.reports.read",
  });
  const summary = await getLearningDashboardSummary(context);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Active catalog programs: </span>
              {summary.activePrograms}
            </p>
            <p>
              <span className="text-muted-foreground">Upcoming sessions: </span>
              {summary.upcomingSessions}
            </p>
            <p>
              <span className="text-muted-foreground">Open requests: </span>
              {summary.pendingRequests}
            </p>
            <p>
              <span className="text-muted-foreground">Completions (90 days): </span>
              {summary.completedLast90Days}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested next reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Program utilization by campus and modality.</p>
            <p>Session attendance vs. capacity and no-show rate.</p>
            <p>Request cycle time from submission to decision.</p>
            <p>Employee completion history for compliance audits.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link className="text-primary hover:underline" href="/learning/reports/operational">
                Open operational reports
              </Link>
            </p>
            <p>
              <Link className="text-primary hover:underline" href="/learning/reports/requests">
                Open request analytics
              </Link>
            </p>
            <p>
              <Link className="text-primary hover:underline" href="/learning/reports/analytics">
                Open trend analytics
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
