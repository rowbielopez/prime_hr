import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { EvidenceDetailManagement } from "@/components/features/compliance/evidence/evidence-detail-management";
import {
  addEvidenceAttachmentAction,
  getEvidenceAttachmentSignedUrlAction,
  restoreEvidenceAttachmentAction,
  saveEvidenceActionPlanAction,
  softDeleteEvidenceAttachmentAction,
  uploadEvidenceAttachmentAction,
  updateEvidenceStatusAction,
} from "@/features/compliance/evidence/actions";
import { isComplianceGlobalAdmin } from "@/features/compliance/evidence/compliance-access";
import { filterEvidenceStatusOptionsForActor, getAllowedEvidenceStatusTransitions } from "@/features/compliance/evidence/status-transitions";
import { getEvidenceById } from "@/features/compliance/evidence/repository/evidence.repository";
import { listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function ComplianceEvidenceDetailPage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = await params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/compliance/evidence",
    permission: "compliance.evidence.read",
  });
  const canEditEvidence = context.permissions.includes("compliance.evidence.write");
  const canManageEvidence = context.permissions.includes("compliance.evidence.write");
  const canReviewEvidence = context.permissions.includes("compliance.review.write");
  const [detail, officeOptions] = await Promise.all([getEvidenceById(evidenceId, context), listEmployeeOfficeOptions(context)]);
  if (!detail) notFound();

  const isGlobalAdmin = isComplianceGlobalAdmin(context);
  const allowedStatusOptions = filterEvidenceStatusOptionsForActor(
    getAllowedEvidenceStatusTransitions(detail.status, isGlobalAdmin),
    detail.status,
    canManageEvidence,
    canReviewEvidence
  );
  const canEditEffective = canEditEvidence && (detail.status !== "approved" || isGlobalAdmin);

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title}
        subtitle={`${detail.areaName} / ${detail.indicatorCode}`}
        breadcrumb={[...pageMeta.breadcrumb, { label: detail.indicatorCode }]}
      />
      <EvidenceDetailManagement
        detail={detail}
        allowedStatusOptions={allowedStatusOptions}
        officeOptions={officeOptions}
        canEditEvidence={canEditEffective}
        canManageEvidence={canManageEvidence}
        canReviewEvidence={canReviewEvidence}
        onUpdateStatus={(input) => updateEvidenceStatusAction(detail.id, input)}
        onAddAttachment={(input) => addEvidenceAttachmentAction(input)}
        onUploadAttachment={(formData) => uploadEvidenceAttachmentAction(detail.id, formData)}
        onGetAttachmentSignedUrl={(attachmentId) => getEvidenceAttachmentSignedUrlAction(attachmentId)}
        onDeleteAttachment={(input) => softDeleteEvidenceAttachmentAction(input)}
        onRestoreAttachment={(input) => restoreEvidenceAttachmentAction(input)}
        onSaveActionPlan={(input) => saveEvidenceActionPlanAction(input)}
      />
    </div>
  );
}
