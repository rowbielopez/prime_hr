import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { RewardsReportsDashboard } from "@/components/features/rewards/rewards-reports-dashboard";
import { ExportCsvButton } from "@/components/features/learning/reports/export-csv-button";
import {
  getRewardsApprovalTurnaroundSummary,
  listRewardsApprovalTurnaroundMonthly,
  listRewardsAwardDistributionByCampus,
} from "@/features/rewards/repository/reports.repository";
import type { RewardsReportPeriod } from "@/features/rewards/types";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parsePeriod(params: Record<string, string | string[] | undefined>): RewardsReportPeriod {
  const from = firstValue(params.from).trim();
  const to = firstValue(params.to).trim();
  const normalizedFrom = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const normalizedTo = /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;
  return { from: normalizedFrom, to: normalizedTo };
}

function buildPeriodSuffix(period: RewardsReportPeriod) {
  if (!period.from && !period.to) return "all-time";
  return `${period.from ?? "start"}_to_${period.to ?? "end"}`;
}

export default async function RewardsReportsPage(props: Props) {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/rewards/reports",
    permission: "rewards.reports.read",
  });
  const resolvedSearchParams = (await props.searchParams) ?? {};
  const period = parsePeriod(resolvedSearchParams);
  const periodSuffix = buildPeriodSuffix(period);

  const [approvalSummary, turnaroundMonthly, distributionByCampus] = await Promise.all([
    getRewardsApprovalTurnaroundSummary(period, context),
    listRewardsApprovalTurnaroundMonthly(period, context),
    listRewardsAwardDistributionByCampus(period, context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <div className="flex justify-end gap-2">
        <ExportCsvButton
          filename={`rewards-approval-turnaround-monthly-${periodSuffix}.csv`}
          headers={["month", "count", "averageDays"]}
          rows={turnaroundMonthly as unknown as Array<Record<string, unknown>>}
        />
        <ExportCsvButton
          filename={`rewards-award-distribution-by-campus-${periodSuffix}.csv`}
          headers={["campusId", "campusName", "awardeeCount"]}
          rows={distributionByCampus as unknown as Array<Record<string, unknown>>}
        />
      </div>
      <RewardsReportsDashboard
        period={period}
        approvalSummary={approvalSummary}
        turnaroundMonthly={turnaroundMonthly}
        distributionByCampus={distributionByCampus}
      />
    </div>
  );
}

