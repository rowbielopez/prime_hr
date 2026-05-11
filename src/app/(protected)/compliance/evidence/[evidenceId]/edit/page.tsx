import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { EvidenceForm } from "@/components/features/compliance/evidence/evidence-form";
import { updateEvidenceAction } from "@/features/compliance/evidence/actions";
import {
  getEvidenceById,
  listComplianceIndicators,
  listPrimeAreas,
} from "@/features/compliance/evidence/repository/evidence.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { isComplianceGlobalAdmin } from "@/features/compliance/evidence/compliance-access";

export default async function EditComplianceEvidencePage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/compliance/evidence",
    permission: "compliance.evidence.write",
  });
  const [detail, areas, indicators, campuses, offices] = await Promise.all([
    getEvidenceById(evidenceId, context),
    listPrimeAreas(),
    listComplianceIndicators(),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!detail) notFound();
  if (detail.status === "approved" && !isComplianceGlobalAdmin(context)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${detail.title}`}
        subtitle="Update compliance evidence metadata and scope."
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.title }]}
      />
      <EvidenceForm
        mode="edit"
        areas={areas}
        indicators={indicators}
        campusOptions={campuses}
        officeOptions={offices}
        initialValue={{
          title: detail.title,
          description: detail.description,
          areaId: detail.areaId,
          indicatorId: detail.indicatorId,
          campusId: detail.campusId,
          officeId: detail.officeId,
          reportingPeriod: detail.reportingPeriod,
          dueDate: detail.dueDate,
          ownerUserId: detail.ownerUserId,
        }}
        onSubmit={(input) => updateEvidenceAction(evidenceId, input)}
      />
    </div>
  );
}
