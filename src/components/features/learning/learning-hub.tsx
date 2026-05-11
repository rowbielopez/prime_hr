"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";
import type { LearningDashboardSummary } from "@/features/learning/types";
import { hasPermission } from "@/lib/rbac/scopes";
import type { AuthorizationContext } from "@/features/auth/types";
import { canSubmitTrainingNomination } from "@/features/learning/requests/nomination-guards";

type LearningHubProps = {
  summary: LearningDashboardSummary;
  context: AuthorizationContext;
};

export function LearningHub({ summary, context }: LearningHubProps) {
  const hr = hasPermission(context, "learning.read");
  const reports = hasPermission(context, "learning.reports.read");
  const competencyRead = hasPermission(context, "learning.competencies.read");
  const canNominate = canSubmitTrainingNomination(context);

  return (
    <div className="space-y-8">
      {hr ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard label="Active programs" value={String(summary.activePrograms)} trend="Catalog status = active" />
          <DashboardMetricCard label="Upcoming sessions" value={String(summary.upcomingSessions)} trend="Scheduled or in progress" />
          <DashboardMetricCard label="Pending requests" value={String(summary.pendingRequests)} trend="Submitted or under review" />
          <DashboardMetricCard label="Completions (90d)" value={String(summary.completedLast90Days)} trend="Participant completion" />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hr ? (
          <>
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Training catalog</CardTitle>
                <CardDescription>Define modalities, duration, and campus scope.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/learning/programs" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Open catalog
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Annual training plans</CardTitle>
                <CardDescription>Campus plans by year with quarterly line items.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/learning/plans" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Open plans
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Sessions</CardTitle>
                <CardDescription>Schedule runs, assign participants, record attendance.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/learning/sessions" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Open sessions
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Training requests</CardTitle>
                <CardDescription>Review employee-submitted needs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/learning/requests" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Open queue
                </Link>
              </CardContent>
            </Card>
            {canNominate ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Nominate training</CardTitle>
                  <CardDescription>Assign catalog or custom training to an employee for approval.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/learning/requests/nominate"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Nominate employee
                  </Link>
                </CardContent>
              </Card>
            ) : null}
            {competencyRead ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Competencies</CardTitle>
                  <CardDescription>Manage competency catalog and employee assessments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/learning/competencies" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Open competencies
                  </Link>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">My requests</CardTitle>
            <CardDescription>Submit training you need and track decisions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learning/my-requests" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              View my requests
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">My training history</CardTitle>
            <CardDescription>Attendance and completion across sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learning/my-training" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              View history
            </Link>
          </CardContent>
        </Card>

        {reports ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Reports</CardTitle>
              <CardDescription>Throughput, completion, and request outcomes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/learning/reports" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Open reports
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
