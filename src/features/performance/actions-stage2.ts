"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { performanceRecordDraftSchema, performanceReviewDecisionSchema, type PerformanceRecordDraftInput, type PerformanceReviewDecisionInput } from "@/features/performance/schemas/record-form.schema";
import { addPerformanceReview, createPerformanceRecordForEmployee, getPerformanceRecordScopeById, updatePerformanceRecordDraft, updatePerformanceRecordStatus } from "@/features/performance/repository/records.repository";
import { getEmployeeById } from "@/features/employees/repository/employees.repository";
import { getPerformanceCycleById } from "@/features/performance/repository/cycles.repository";

type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

function enforceReviewerAssignment(input: {
  reviewerEmployeeId: string;
  assignedReviewerEmployeeId: string | null;
  assignedSupervisorEmployeeId: string | null;
}): ActionResult | null {
  if (input.assignedReviewerEmployeeId) {
    if (input.assignedReviewerEmployeeId !== input.reviewerEmployeeId) {
      return fail("This record is assigned to a different reviewer.");
    }
    return null;
  }
  if (input.assignedSupervisorEmployeeId && input.assignedSupervisorEmployeeId !== input.reviewerEmployeeId) {
    return fail("Only the assigned supervisor can review this record.");
  }
  return null;
}

export async function savePerformanceRecordDraftAction(recordId: string, input: PerformanceRecordDraftInput): Promise<ActionResult> {
  const parsed = performanceRecordDraftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid performance record.");
  const context = await requireAuthorizedUser();
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) return fail("No linked employee profile.");
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  if (scope.employee_id !== employeeId) return fail("You can only edit your own record.");
  await requirePermission({ permission: "performance.write", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  if (!["draft", "needs_revision"].includes(scope.status)) return fail("Only draft or revision records can be edited.");
  const result = await updatePerformanceRecordDraft(recordId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to save draft.");
  revalidatePath("/performance/my");
  revalidatePath(`/performance/my/${recordId}`);
  return { ok: true };
}

export async function submitPerformanceRecordAction(recordId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) return fail("No linked employee profile.");
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  if (scope.employee_id !== employeeId) return fail("You can only submit your own record.");
  await requirePermission({ permission: "performance.write", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  if (!["draft", "needs_revision"].includes(scope.status)) return fail("Only draft or revision records can be submitted.");
  const result = await updatePerformanceRecordStatus(recordId, "submitted");
  if (!result.ok) return fail(result.error ?? "Failed to submit record.");
  revalidatePath("/performance/my");
  revalidatePath(`/performance/my/${recordId}`);
  revalidatePath("/performance/reviews");
  return { ok: true };
}

export async function startPerformanceReviewAction(recordId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const reviewerEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!reviewerEmployeeId) return fail("No linked employee profile.");
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  await requirePermission({ permission: "performance.review", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  const assignmentError = enforceReviewerAssignment({
    reviewerEmployeeId,
    assignedReviewerEmployeeId: scope.reviewer_employee_id,
    assignedSupervisorEmployeeId: scope.supervisor_employee_id,
  });
  if (assignmentError) return assignmentError;
  if (scope.status !== "submitted") return fail("Only submitted records can move into review.");
  const result = await updatePerformanceRecordStatus(recordId, "under_review");
  if (!result.ok) return fail(result.error ?? "Failed to start review.");
  revalidatePath("/performance/reviews");
  revalidatePath(`/performance/reviews/${recordId}`);
  revalidatePath("/performance/records");
  return { ok: true };
}

export async function decidePerformanceReviewAction(recordId: string, input: PerformanceReviewDecisionInput): Promise<ActionResult> {
  const parsed = performanceReviewDecisionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid review decision.");
  const context = await requireAuthorizedUser();
  const reviewerEmployeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!reviewerEmployeeId) return fail("No linked employee profile.");
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  await requirePermission({ permission: "performance.review", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  const assignmentError = enforceReviewerAssignment({
    reviewerEmployeeId,
    assignedReviewerEmployeeId: scope.reviewer_employee_id,
    assignedSupervisorEmployeeId: scope.supervisor_employee_id,
  });
  if (assignmentError) return assignmentError;
  if (!["submitted", "under_review"].includes(scope.status)) return fail("Record is not pending review.");
  if (scope.status === "submitted") {
    const mark = await updatePerformanceRecordStatus(recordId, "under_review");
    if (!mark.ok) return fail(mark.error ?? "Failed to mark record under review.");
  }
  const reviewResult = await addPerformanceReview(recordId, reviewerEmployeeId, parsed.data);
  if (!reviewResult.ok) return fail(reviewResult.error ?? "Failed to save review.");
  const nextStatus =
    parsed.data.decision === "approve" ? "approved" : parsed.data.decision === "reject" ? "rejected" : "needs_revision";
  const statusResult = await updatePerformanceRecordStatus(recordId, nextStatus);
  if (!statusResult.ok) return fail(statusResult.error ?? "Failed to update status.");
  revalidatePath("/performance/reviews");
  revalidatePath(`/performance/reviews/${recordId}`);
  revalidatePath("/performance/my");
  revalidatePath("/performance/records");
  revalidatePath("/performance/dashboard");
  return { ok: true };
}

export async function createMyPerformanceRecordAction(cycleId: string): Promise<{ ok: true; recordId: string } | { ok: false; error: string }> {
  const context = await requireAuthorizedUser();
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) return { ok: false, error: "No linked employee profile." };
  const cycle = await getPerformanceCycleById(cycleId, context);
  if (!cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "active") return { ok: false, error: "Only active cycles can receive new performance records." };
  await requirePermission({ permission: "performance.write", campusId: cycle.campusId ?? undefined, officeId: cycle.officeId ?? undefined });
  const employee = await getEmployeeById(employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };
  const result = await createPerformanceRecordForEmployee({
    cycleId,
    employeeId,
    campusId: employee.campusId,
    officeId: employee.officeId,
  });
  if (!result.ok || !result.recordId) return { ok: false, error: result.error ?? "Failed to create record." };
  revalidatePath("/performance/my");
  return { ok: true, recordId: result.recordId };
}

export async function savePerformanceRecordDraftHrAction(recordId: string, input: PerformanceRecordDraftInput): Promise<ActionResult> {
  const parsed = performanceRecordDraftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid performance record.");
  await requireAuthorizedUser();
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  await requirePermission({ permission: "performance.write", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  if (!["draft", "needs_revision"].includes(scope.status)) return fail("Only draft or revision records can be edited.");
  const result = await updatePerformanceRecordDraft(recordId, parsed.data);
  if (!result.ok) return fail(result.error ?? "Failed to save draft.");
  revalidatePath("/performance/records");
  revalidatePath(`/performance/records/${recordId}`);
  revalidatePath("/performance/my");
  revalidatePath(`/performance/my/${recordId}`);
  return { ok: true };
}

export async function submitPerformanceRecordHrAction(recordId: string): Promise<ActionResult> {
  const scope = await getPerformanceRecordScopeById(recordId);
  if (!scope) return fail("Record not found.");
  await requirePermission({ permission: "performance.write", campusId: scope.campus_id, officeId: scope.office_id ?? undefined });
  if (!["draft", "needs_revision"].includes(scope.status)) return fail("Only draft or revision records can be submitted.");
  const result = await updatePerformanceRecordStatus(recordId, "submitted");
  if (!result.ok) return fail(result.error ?? "Failed to submit record.");
  revalidatePath("/performance/records");
  revalidatePath(`/performance/records/${recordId}`);
  revalidatePath("/performance/reviews");
  revalidatePath("/performance/my");
  revalidatePath(`/performance/my/${recordId}`);
  revalidatePath("/performance/dashboard");
  return { ok: true };
}

export async function createHrPerformanceRecordAction(
  employeeId: string,
  cycleId: string
): Promise<{ ok: true; recordId: string } | { ok: false; error: string }> {
  const context = await requireAuthorizedUser();
  const cycle = await getPerformanceCycleById(cycleId, context);
  if (!cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "active") return { ok: false, error: "Only active cycles can receive new performance records." };
  await requirePermission({ permission: "performance.write", campusId: cycle.campusId ?? undefined, officeId: cycle.officeId ?? undefined });
  const employee = await getEmployeeById(employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };
  const result = await createPerformanceRecordForEmployee({
    cycleId,
    employeeId,
    campusId: employee.campusId,
    officeId: employee.officeId,
  });
  if (!result.ok || !result.recordId) return { ok: false, error: result.error ?? "Failed to create record." };
  revalidatePath("/performance/records");
  revalidatePath("/performance/cycles");
  revalidatePath(`/performance/cycles/${cycleId}`);
  revalidatePath("/performance/dashboard");
  return { ok: true, recordId: result.recordId };
}
