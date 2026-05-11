import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { EvidenceForm } from "@/components/features/compliance/evidence/evidence-form";
import { createEvidenceAction } from "@/features/compliance/evidence/actions";
import { listComplianceIndicators, listPrimeAreas } from "@/features/compliance/evidence/repository/evidence.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function NewComplianceEvidencePage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/compliance/evidence",
    permission: "compliance.evidence.write",
  });
  const [areas, indicators, campuses, offices] = await Promise.all([
    listPrimeAreas(),
    listComplianceIndicators(),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Compliance Evidence"
        subtitle="Define evidence entry, indicator linkage, and scope."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <EvidenceForm
        mode="create"
        areas={areas}
        indicators={indicators}
        campusOptions={campuses}
        officeOptions={offices}
        initialValue={{
          title: "",
          description: null,
          areaId: "",
          indicatorId: "",
          campusId: "",
          officeId: null,
          reportingPeriod: "",
          dueDate: null,
          ownerUserId: null,
        }}
        onSubmit={createEvidenceAction}
      />
    </div>
  );
}
