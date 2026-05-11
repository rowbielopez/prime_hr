import { PageHeader } from "@/components/foundation";
import { RatingBandConfigForm } from "@/components/features/performance/rating-band-config-form";
import { RatingBandConfigAuditStrip } from "@/components/features/performance/rating-band-config-audit-strip";
import { getPageMeta } from "@/components/foundation/page/breadcrumbs";
import { requireRatingBandAdminAccess } from "@/features/performance/rating-band-authorization";
import { getRatingBandConfigAudit, listRatingBandConfig } from "@/features/performance/rating-band.repository";

export default async function PerformanceRatingBandsPage() {
  await requireRatingBandAdminAccess();
  const pageMeta = getPageMeta("/performance/rating-bands");
  const [rows, audit] = await Promise.all([listRatingBandConfig(), getRatingBandConfigAudit()]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <RatingBandConfigAuditStrip audit={audit} />
      <RatingBandConfigForm initialRows={rows} />
    </div>
  );
}

