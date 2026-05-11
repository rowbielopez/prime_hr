"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import { hasPermission } from "@/lib/rbac/scopes";
import { ensureCanSubmitNomination } from "@/features/learning/requests/server/nomination-access";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import {
  trainingNominationFormSchema,
  trainingRequestFormSchema,
  trainingRequestReviewSchema,
  type TrainingNominationFormInput,
  type TrainingRequestFormInput,
  type TrainingRequestReviewInput,
} from "@/features/learning/requests/schemas/request-form.schema";
import {
  createNominationRequest,
  createSelfTrainingRequest,
  getTrainingRequestScopeById,
  updateTrainingRequestReview,
  withdrawTrainingRequest,
} from "@/features/learning/requests/repository/requests.repository";
import { getEmployeeIdForAppUser, getLinkedEmployeeCampus } from "@/features/learning/server/employee-link";

type ActionResult = { ok: true; requestId?: string } | { ok: false; error: string };

function success(requestId?: string): ActionResult {
  return { ok: true, requestId };
}

function failure(error: string): ActionResult {
  return { ok: false, error };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("audit_log_failed", error);
  }
}

export async function createTrainingRequestAction(input: TrainingRequestFormInput): Promise<ActionResult> {
  const parsed = trainingRequestFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid request.");
  const context = await requireAuthorizedUser();
  if (!hasPermission(context, "learning.access")) {
    return failure("Not allowed.");
  }
  const link = await getLinkedEmployeeCampus(context.appUserId);
  if (!link) return failure("Your account must be linked to an employee profile to submit requests.");
  if (link.campusId !== parsed.data.campusId) {
    return failure("Request campus must match your assigned campus.");
  }
  const result = await createSelfTrainingRequest(link.employeeId, link.employeeId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to submit request.");
  if (result.requestId) {
    await safeAuditLog({
      eventType: "learning.request_submitted",
      action: "create_training_request",
      entityType: "ld_training_requests",
      entityId: result.requestId,
      campusId: parsed.data.campusId,
    });
  }
  revalidatePath("/learning/my-requests");
  revalidatePath("/learning/requests");
  return success(result.requestId ?? undefined);
}

export async function createNominationAction(input: TrainingNominationFormInput): Promise<ActionResult> {
  const parsed = trainingNominationFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid nomination.");
  const context = await requireAuthorizedUser();
  ensureCanSubmitNomination(context, parsed.data.campusId);
  const subject = await getEmployeeById(parsed.data.subjectEmployeeId);
  if (!subject) return failure("Employee not found.");
  if (subject.campusId !== parsed.data.campusId) {
    return failure("Selected employee must belong to the chosen campus.");
  }
  const submittedById = await getEmployeeIdForAppUser(context.appUserId);
  const result = await createNominationRequest(parsed.data.subjectEmployeeId, submittedById, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to submit nomination.");
  if (result.requestId) {
    await safeAuditLog({
      eventType: "learning.nomination_submitted",
      action: "create_training_nomination",
      entityType: "ld_training_requests",
      entityId: result.requestId,
      campusId: parsed.data.campusId,
      metadata: { subjectEmployeeId: parsed.data.subjectEmployeeId },
    });
  }
  revalidatePath("/learning/requests");
  revalidatePath("/learning/my-requests");
  return success(result.requestId ?? undefined);
}

export async function reviewTrainingRequestAction(requestId: string, input: TrainingRequestReviewInput): Promise<ActionResult> {
  const parsed = trainingRequestReviewSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid review.");
  const scope = await getTrainingRequestScopeById(requestId);
  if (!scope) return failure("Request not found.");
  await requirePermission({ permission: "learning.write", campusId: scope.campusId });
  const result = await updateTrainingRequestReview(requestId, parsed.data);
  if (!result.ok) return failure(result.error ?? "Failed to update request.");
  revalidatePath("/learning/requests");
  revalidatePath(`/learning/requests/${requestId}`);
  return success(requestId);
}

export async function withdrawTrainingRequestAction(requestId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) return failure("No employee profile linked.");
  const result = await withdrawTrainingRequest(requestId, employeeId);
  if (!result.ok) return failure(result.error ?? "Failed to withdraw request.");
  revalidatePath("/learning/my-requests");
  revalidatePath("/learning/requests");
  return success(requestId);
}
