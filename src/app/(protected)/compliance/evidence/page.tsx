import { PageHeader } from "@/components/foundation";
import { EvidenceListManagement } from "@/components/features/compliance/evidence/evidence-list-management";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEvidenceItems, listPrimeAreas } from "@/features/compliance/evidence/repository/evidence.repository";

export default async function ComplianceEvidencePage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/compliance/evidence",
    permission: "compliance.evidence.read",
  });
  const [rows, areas] = await Promise.all([listEvidenceItems(context), listPrimeAreas()]);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <EvidenceListManagement rows={rows} areas={areas} />
    </div>
  );
}

