import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { ComplianceDashboard } from "@/components/features/compliance/dashboard/compliance-dashboard";
import {
  getComplianceDashboardCampusBreakdown,
  getComplianceDashboardSummary,
  getComplianceDashboardUnresolvedGaps,
} from "@/features/compliance/evidence/repository/compliance-dashboard.repository";

export default async function ComplianceDashboardPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/compliance/dashboard",
    permission: "compliance.dashboard.read",
  });
  const [summaryResult, campusResult, gapsResult] = await Promise.all([
    getComplianceDashboardSummary(context),
    getComplianceDashboardCampusBreakdown(context),
    getComplianceDashboardUnresolvedGaps(context),
  ]);
  const queryError = summaryResult.error ?? campusResult.error ?? gapsResult.error;

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <ComplianceDashboard
        summary={summaryResult.data}
        campusBreakdown={campusResult.data}
        unresolvedGaps={gapsResult.data}
        queryError={queryError}
      />
    </div>
  );
}
