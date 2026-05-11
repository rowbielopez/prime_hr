import { IndicatorManagement } from "@/components/features/admin/compliance/indicator-management";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import {
  listComplianceIndicatorsAdmin,
  listPrimeAreaOptions,
} from "@/features/compliance/indicators/repository/indicator.repository";

export default async function AdminComplianceIndicatorsPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/admin/compliance-indicators",
    permission: "compliance.indicators.write",
  });
  const [indicators, areas] = await Promise.all([listComplianceIndicatorsAdmin(), listPrimeAreaOptions()]);
  const canMutate = context.permissions.includes("compliance.indicators.write");

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <IndicatorManagement indicators={indicators} areas={areas} canMutate={canMutate} />
    </div>
  );
}
