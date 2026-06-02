"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requirePermission } from "@/features/auth/server/require-permission";
import { getEmployeeRequestReviewDetail, getEmployeeRequestReviewScope } from "@/features/requests/repository/requests.repository";
import { HR_REQUEST_TRANSITIONS, type EmployeeRequestReviewDetail, type EmployeeRequestStatus } from "@/features/requests/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };
type DetailActionResult = { ok: true; detail: EmployeeRequestReviewDetail } | { ok: false; error: string };

const REVIEW_ERROR_MESSAGE = "We could not update this request right now. Please try again.";
const PERMISSION_ERROR_MESSAGE = "You do not have permission to review this request.";
const COMPLETED_ERROR_MESSAGE = "This request has already been completed.";
const INVALID_STATUS_MESSAGE = "Please select a valid status.";

const requestIdSchema = z.string().uuid();
const reviewDecisionSchema = z.object({
    requestId: z.string().uuid(),
    hrRemarks: z.string().trim().max(3000, "Keep HR remarks under 3,000 characters.").optional().nullable(),
    internalNotes: z.string().trim().max(3000, "Keep internal notes under 3,000 characters.").optional().nullable(),
});

type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

function normalizeOptionalText(input: string | null | undefined) {
    const value = input?.trim();
    return value ? value : null;
}

function failure(error: string): ActionResult {
    return { ok: false, error };
}

function detailFailure(error: string): DetailActionResult {
    return { ok: false, error };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
    try {
        await writeAuditLog(input);
    } catch (error) {
        logServerError("audit_log_failed", error);
    }
}

function canTransition(fromStatus: EmployeeRequestStatus, toStatus: EmployeeRequestStatus) {
    return HR_REQUEST_TRANSITIONS[fromStatus].includes(toStatus);
}

async function applyReviewTransition(input: {
    requestId: string;
    toStatus: EmployeeRequestStatus;
    hrRemarks?: string | null;
    internalNotes?: string | null;
}): Promise<ActionResult> {
    const scope = await getEmployeeRequestReviewScope(input.requestId);
    if (!scope) return failure(PERMISSION_ERROR_MESSAGE);

    await requirePermission({
        permission: "employee.requests.review.write",
        campusId: scope.campusId,
        officeId: scope.officeId,
    });

    if (scope.status === "completed") return failure(COMPLETED_ERROR_MESSAGE);
    if (!canTransition(scope.status, input.toStatus)) return failure(INVALID_STATUS_MESSAGE);

    const now = new Date().toISOString();
    const supabase = await createSupabaseServerClient();
    const context = await requirePermission({
        permission: "employee.requests.review.write",
        campusId: scope.campusId,
        officeId: scope.officeId,
    });

    const updatePayload: Record<string, string | null> = {
        status: input.toStatus,
        reviewed_at: now,
        reviewed_by_user_id: context.appUserId,
        updated_by_user_id: context.appUserId,
    };

    const remarks = normalizeOptionalText(input.hrRemarks);
    const internalNotes = normalizeOptionalText(input.internalNotes);
    if (remarks !== null) updatePayload.hr_remarks = remarks;
    if (internalNotes !== null) updatePayload.internal_notes = internalNotes;
    if (input.toStatus === "completed") updatePayload.completed_at = now;

    const { data, error } = await supabase
        .from("employee_requests")
        .update(updatePayload as never)
        .eq("id", scope.id)
        .eq("status", scope.status)
        .select("id")
        .maybeSingle();

    if (error || !data) return failure(REVIEW_ERROR_MESSAGE);

    const { error: historyError } = await supabase.from("employee_request_status_history").insert({
        request_id: scope.id,
        employee_id: scope.employeeId,
        campus_id: scope.campusId,
        office_id: scope.officeId,
        from_status: scope.status,
        to_status: input.toStatus,
        remarks,
        internal_notes: internalNotes,
        actor_user_id: context.appUserId,
    } as never);

    if (historyError) return failure(REVIEW_ERROR_MESSAGE);

    await safeAuditLog({
        eventType: "employee_request.review_status_changed",
        action: "review_employee_request",
        entityType: "employee_requests",
        entityId: scope.id,
        campusId: scope.campusId,
        metadata: {
            requestType: scope.requestType,
            previousStatus: scope.status,
            nextStatus: input.toStatus,
        },
    });

    revalidatePath("/requests/review");
    revalidatePath("/me/requests");
    revalidatePath(`/employees/${scope.employeeId}`);
    return { ok: true };
}

export async function startEmployeeRequestReviewAction(requestId: string): Promise<ActionResult> {
    const parsed = requestIdSchema.safeParse(requestId);
    if (!parsed.success) return failure(INVALID_STATUS_MESSAGE);
    const result = await applyReviewTransition({ requestId: parsed.data, toStatus: "under_review" });
    if (!result.ok) return result;
    return { ok: true };
}

export async function getEmployeeRequestReviewDetailAction(requestId: string): Promise<DetailActionResult> {
    const parsed = requestIdSchema.safeParse(requestId);
    if (!parsed.success) return detailFailure(PERMISSION_ERROR_MESSAGE);

    const scope = await getEmployeeRequestReviewScope(parsed.data);
    if (!scope) return detailFailure(PERMISSION_ERROR_MESSAGE);

    await requirePermission({
        permission: "employee.requests.review.read",
        campusId: scope.campusId,
        officeId: scope.officeId,
    });

    const detail = await getEmployeeRequestReviewDetail(parsed.data);
    if (!detail) return detailFailure(PERMISSION_ERROR_MESSAGE);
    return { ok: true, detail };
}

export async function approveEmployeeRequestAction(input: ReviewDecisionInput): Promise<ActionResult> {
    const parsed = reviewDecisionSchema.safeParse(input);
    if (!parsed.success) return failure(INVALID_STATUS_MESSAGE);
    return applyReviewTransition({ ...parsed.data, toStatus: "approved" });
}

export async function rejectEmployeeRequestAction(input: ReviewDecisionInput): Promise<ActionResult> {
    const parsed = reviewDecisionSchema.safeParse(input);
    if (!parsed.success) return failure(INVALID_STATUS_MESSAGE);
    const remarks = normalizeOptionalText(parsed.data.hrRemarks);
    if (!remarks) return failure("Please add HR remarks before rejecting this request.");
    return applyReviewTransition({ ...parsed.data, hrRemarks: remarks, toStatus: "rejected" });
}

export async function returnEmployeeRequestForRevisionAction(input: ReviewDecisionInput): Promise<ActionResult> {
    const parsed = reviewDecisionSchema.safeParse(input);
    if (!parsed.success) return failure(INVALID_STATUS_MESSAGE);
    const remarks = normalizeOptionalText(parsed.data.hrRemarks);
    if (!remarks) return failure("Please explain what the employee needs to revise.");
    return applyReviewTransition({ ...parsed.data, hrRemarks: remarks, toStatus: "returned_for_revision" });
}

export async function completeEmployeeRequestAction(input: ReviewDecisionInput): Promise<ActionResult> {
    const parsed = reviewDecisionSchema.safeParse(input);
    if (!parsed.success) return failure(INVALID_STATUS_MESSAGE);
    return applyReviewTransition({ ...parsed.data, toStatus: "completed" });
}