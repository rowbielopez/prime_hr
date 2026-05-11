"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isComplianceGlobalAdmin } from "@/features/compliance/evidence/compliance-access";
import { assertValidEvidenceStatusTransition } from "@/features/compliance/evidence/status-transitions";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { evidenceFormSchema, type EvidenceFormInput } from "@/features/compliance/evidence/schemas/evidence-form.schema";
import { statusUpdateSchema, type StatusUpdateInput } from "@/features/compliance/evidence/schemas/status-update.schema";
import {
  evidenceActionPlanSchema,
  evidenceAttachmentSchema,
  type EvidenceActionPlanInput,
  type EvidenceAttachmentInput,
} from "@/features/compliance/evidence/schemas/evidence-attachment.schema";
import {
  addEvidenceAttachment,
  createEvidence,
  getDeletedAttachmentAccessContext,
  getAttachmentAccessContext,
  getEvidenceMutationContext,
  getEvidenceReportingPeriodById,
  getEvidenceScopeById,
  restoreEvidenceAttachment,
  saveEvidenceActionPlan,
  softDeleteEvidenceAttachment,
  updateEvidence,
  updateEvidenceStatus,
} from "@/features/compliance/evidence/repository/evidence.repository";

type ActionResult = { ok: true; evidenceId?: string } | { ok: false; error: string };
type AttachmentSignedUrlResult = { ok: true; url: string } | { ok: false; error: string };
type AttachmentUploadResult = { ok: true; evidenceId: string } | { ok: false; error: string };
type AttachmentDeleteResult = { ok: true; evidenceId: string } | { ok: false; error: string };
type AttachmentRestoreResult = { ok: true; evidenceId: string } | { ok: false; error: string };

const EVIDENCE_STORAGE_BUCKET = "compliance-evidence";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

function success(evidenceId?: string): ActionResult {
  return { ok: true, evidenceId };
}

function failure(message: string): ActionResult {
  return { ok: false, error: message };
}

function sanitizeFileName(input: string): string {
  return input
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function buildStoragePath(input: { campusId: string; evidenceId: string; originalFileName: string }): string {
  const safeName = sanitizeFileName(input.originalFileName) || "attachment.bin";
  return `campus/${input.campusId}/evidence/${input.evidenceId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
}

export async function createEvidenceAction(input: EvidenceFormInput): Promise<ActionResult> {
  const parsed = evidenceFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid compliance evidence input.");
  if (parsed.data.officeId) {
    const officeIsValid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!officeIsValid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "compliance.evidence.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await createEvidence(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to create evidence.");
  if (result.evidenceId) {
    try {
      await writeAuditLog({
        eventType: "compliance.evidence_created",
        action: "create_evidence",
        entityType: "compliance_evidence",
        entityId: result.evidenceId,
        campusId: parsed.data.campusId,
        metadata: { title: parsed.data.title, indicatorId: parsed.data.indicatorId },
      });
    } catch (error) {
      console.error("audit_log_failed", error);
    }
  }
  revalidatePath("/compliance/evidence");
  if (result.evidenceId) revalidatePath(`/compliance/evidence/${result.evidenceId}`);
  return success(result.evidenceId ?? undefined);
}

export async function updateEvidenceAction(evidenceId: string, input: EvidenceFormInput): Promise<ActionResult> {
  const row = await getEvidenceMutationContext(evidenceId);
  if (!row) return failure("Evidence not found.");
  const ctx = await requirePermission({
    permission: "compliance.evidence.write",
    campusId: row.campusId,
    officeId: row.officeId,
  });
  if (row.status === "approved" && !isComplianceGlobalAdmin(ctx)) {
    return failure("Approved evidence is locked. Only central HR administrators may edit it.");
  }
  const parsed = evidenceFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid compliance evidence input.");
  if (parsed.data.officeId) {
    const officeIsValid = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
    if (!officeIsValid) return failure("Selected office does not belong to selected campus.");
  }
  await requirePermission({
    permission: "compliance.evidence.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });
  const result = await updateEvidence(evidenceId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update evidence.");
  try {
    await writeAuditLog({
      eventType: "compliance.evidence_updated",
      action: "update_evidence",
      entityType: "compliance_evidence",
      entityId: evidenceId,
      campusId: parsed.data.campusId,
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }
  revalidatePath("/compliance/evidence");
  revalidatePath(`/compliance/evidence/${evidenceId}`);
  return success(evidenceId);
}

export async function updateEvidenceStatusAction(evidenceId: string, input: StatusUpdateInput): Promise<ActionResult> {
  const parsed = statusUpdateSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid status update.");
  const normalizedRemarks = parsed.data.remarks?.trim() ?? "";
  if ((parsed.data.status === "approved" || parsed.data.status === "rejected") && normalizedRemarks.length === 0) {
    return failure("Remarks are required for approved/rejected decisions.");
  }
  const row = await getEvidenceMutationContext(evidenceId);
  if (!row) return failure("Evidence not found.");
  const permission =
    parsed.data.status === "approved" || parsed.data.status === "rejected"
      ? "compliance.review.write"
      : "compliance.evidence.write";
  const ctx = await requirePermission({
    permission,
    campusId: row.campusId,
    officeId: row.officeId,
  });
  const transition = assertValidEvidenceStatusTransition(row.status, parsed.data.status, isComplianceGlobalAdmin(ctx));
  if (!transition.ok) return failure(transition.error);
  const result = await updateEvidenceStatus({
    evidenceId,
    status: parsed.data.status,
    remarks: parsed.data.remarks,
  });
  if (!result.ok) return failure(result.error ?? "Failed to update evidence status.");
  try {
    await writeAuditLog({
      eventType: "compliance.evidence_status_updated",
      action: "update_evidence_status",
      entityType: "compliance_evidence",
      entityId: evidenceId,
      campusId: row.campusId,
      metadata: { status: parsed.data.status },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }
  revalidatePath("/compliance/evidence");
  revalidatePath(`/compliance/evidence/${evidenceId}`);
  revalidatePath("/compliance/dashboard");
  return success(evidenceId);
}

export async function addEvidenceAttachmentAction(input: EvidenceAttachmentInput): Promise<ActionResult> {
  const parsed = evidenceAttachmentSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid attachment input.");
  const scope = await getEvidenceScopeById(parsed.data.evidenceId);
  if (!scope) return failure("Evidence not found.");
  const context = await requirePermission({
    permission: "compliance.evidence.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const result = await addEvidenceAttachment({
    ...parsed.data,
    storageBucket: parsed.data.storageBucket ?? EVIDENCE_STORAGE_BUCKET,
    uploadedByUserId: context.appUserId,
  });
  if (!result.ok) return failure(result.error ?? "Failed to add attachment metadata.");
  try {
    await writeAuditLog({
      eventType: "compliance.attachment_added",
      action: "add_attachment",
      entityType: "compliance_evidence",
      entityId: parsed.data.evidenceId,
      campusId: scope.campusId,
      metadata: {
        fileName: parsed.data.fileName,
        fileType: parsed.data.fileType,
        storageBucket: parsed.data.storageBucket ?? EVIDENCE_STORAGE_BUCKET,
        storagePath: parsed.data.storagePath ?? null,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }
  revalidatePath(`/compliance/evidence/${parsed.data.evidenceId}`);
  return success(parsed.data.evidenceId);
}

export async function saveEvidenceActionPlanAction(input: EvidenceActionPlanInput): Promise<ActionResult> {
  const parsed = evidenceActionPlanSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid action plan input.");
  const scope = await getEvidenceScopeById(parsed.data.evidenceId);
  if (!scope) return failure("Evidence not found.");
  await requirePermission({
    permission: "compliance.evidence.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  // Due date must stay within the evidence reporting period (YYYY-MM).
  // This keeps action plans comparable and prevents “floating” due dates across periods.
  const period = await getEvidenceReportingPeriodById(parsed.data.evidenceId);
  if (period && !parsed.data.dueDate.startsWith(`${period}-`)) {
    return failure(`Due date must be within the evidence reporting period (${period}).`);
  }
  const result = await saveEvidenceActionPlan(parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to save action plan.");
  try {
    await writeAuditLog({
      eventType: "compliance.action_plan_saved",
      action: "save_action_plan",
      entityType: "compliance_evidence",
      entityId: parsed.data.evidenceId,
      campusId: scope.campusId,
      metadata: { status: parsed.data.status, dueDate: parsed.data.dueDate },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }
  revalidatePath(`/compliance/evidence/${parsed.data.evidenceId}`);
  revalidatePath("/compliance/dashboard");
  return success(parsed.data.evidenceId);
}

/** @deprecated Use `saveEvidenceActionPlanAction`. */
export const upsertEvidenceActionPlanAction = saveEvidenceActionPlanAction;

export async function uploadEvidenceAttachmentAction(
  evidenceId: string,
  formData: FormData,
): Promise<AttachmentUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file selected." };
  if (file.size <= 0) return { ok: false, error: "Selected file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File exceeds 20MB upload limit." };

  const scope = await getEvidenceScopeById(evidenceId);
  if (!scope) return { ok: false, error: "Evidence not found." };

  const context = await requirePermission({
    permission: "compliance.evidence.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const storagePath = buildStoragePath({
    campusId: scope.campusId,
    evidenceId,
    originalFileName: file.name,
  });

  const admin = createSupabaseAdminClient();
  const uploadResult = await admin.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadResult.error) {
    return { ok: false, error: uploadResult.error.message };
  }

  const attachmentResult = await addEvidenceAttachment({
    evidenceId,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    storageBucket: EVIDENCE_STORAGE_BUCKET,
    storagePath,
    uploadedByUserId: context.appUserId,
  });

  if (!attachmentResult.ok) {
    await admin.storage.from(EVIDENCE_STORAGE_BUCKET).remove([storagePath]);
    return { ok: false, error: attachmentResult.error ?? "Failed to save attachment record." };
  }

  try {
    await writeAuditLog({
      eventType: "compliance.attachment_uploaded",
      action: "upload_attachment",
      entityType: "compliance_evidence",
      entityId: evidenceId,
      campusId: scope.campusId,
      metadata: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        storageBucket: EVIDENCE_STORAGE_BUCKET,
        storagePath,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }

  revalidatePath(`/compliance/evidence/${evidenceId}`);
  return { ok: true, evidenceId };
}

export async function getEvidenceAttachmentSignedUrlAction(attachmentId: string): Promise<AttachmentSignedUrlResult> {
  const access = await getAttachmentAccessContext(attachmentId);
  if (!access) return { ok: false, error: "Attachment not found." };

  await requirePermission({
    permission: "compliance.evidence.read",
    campusId: access.campusId,
    officeId: access.officeId,
  });

  if (!access.storagePath) {
    return { ok: false, error: "Attachment does not have a storage object path." };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(access.storageBucket || EVIDENCE_STORAGE_BUCKET)
    .createSignedUrl(access.storagePath, 60 * 10);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? "Failed to generate signed URL." };
  }

  try {
    await writeAuditLog({
      eventType: "compliance.attachment_viewed",
      action: "view_attachment",
      entityType: "compliance_evidence",
      entityId: access.evidenceId,
      campusId: access.campusId,
      metadata: {
        attachmentId,
        storageBucket: access.storageBucket || EVIDENCE_STORAGE_BUCKET,
        storagePath: access.storagePath,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }
  return { ok: true, url: data.signedUrl };
}

export async function softDeleteEvidenceAttachmentAction(input: {
  attachmentId: string;
  deleteFromStorage: boolean;
}): Promise<AttachmentDeleteResult> {
  const access = await getAttachmentAccessContext(input.attachmentId);
  if (!access) return { ok: false, error: "Attachment not found." };

  const context = await requirePermission({
    permission: "compliance.evidence.write",
    campusId: access.campusId,
    officeId: access.officeId,
  });

  let storageDeleted = false;
  if (input.deleteFromStorage && access.storagePath) {
    const admin = createSupabaseAdminClient();
    const removeResult = await admin.storage
      .from(access.storageBucket || EVIDENCE_STORAGE_BUCKET)
      .remove([access.storagePath]);
    if (removeResult.error) {
      return { ok: false, error: `Failed to delete object from storage: ${removeResult.error.message}` };
    }
    storageDeleted = true;
  }

  const mutation = await softDeleteEvidenceAttachment({
    attachmentId: input.attachmentId,
    deletedByUserId: context.appUserId,
    storageDeleted,
  });
  if (!mutation.ok) return { ok: false, error: mutation.error };

  try {
    await writeAuditLog({
      eventType: "compliance.attachment_deleted",
      action: "delete_attachment",
      entityType: "compliance_evidence",
      entityId: access.evidenceId,
      campusId: access.campusId,
      metadata: {
        attachmentId: input.attachmentId,
        deleteFromStorage: input.deleteFromStorage,
        storageDeleted,
        storageBucket: access.storageBucket,
        storagePath: access.storagePath,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }

  revalidatePath(`/compliance/evidence/${access.evidenceId}`);
  return { ok: true, evidenceId: access.evidenceId };
}

export async function restoreEvidenceAttachmentAction(input: { attachmentId: string }): Promise<AttachmentRestoreResult> {
  const access = await getDeletedAttachmentAccessContext(input.attachmentId);
  if (!access) return { ok: false, error: "Deleted attachment not found." };
  if (access.storageDeletedAt) {
    return {
      ok: false,
      error: "This attachment cannot be restored because its storage object was permanently deleted.",
    };
  }

  await requirePermission({
    permission: "compliance.evidence.write",
    campusId: access.campusId,
    officeId: access.officeId,
  });

  const result = await restoreEvidenceAttachment({ attachmentId: input.attachmentId });
  if (!result.ok) return { ok: false, error: result.error };

  try {
    await writeAuditLog({
      eventType: "compliance.attachment_restored",
      action: "restore_attachment",
      entityType: "compliance_evidence",
      entityId: access.evidenceId,
      campusId: access.campusId,
      metadata: {
        attachmentId: input.attachmentId,
        fileName: access.fileName,
        storageBucket: access.storageBucket,
        storagePath: access.storagePath,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }

  revalidatePath(`/compliance/evidence/${access.evidenceId}`);
  return { ok: true, evidenceId: access.evidenceId };
}
