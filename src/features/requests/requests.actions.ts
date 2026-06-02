"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { getMyEmployee } from "@/features/me/repository/me.repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { employeeRequestDraftFormSchema, employeeRequestFormSchema, employeeRequestModeSchema, type EmployeeRequestFormInput, type EmployeeRequestMode } from "@/features/requests/schemas/request.schema";
import { findSimilarActiveRequest, getEditableRequestScope } from "@/features/requests/repository/requests.repository";
import type { EmployeeRequestStatus } from "@/features/requests/types";

type ActionResult =
    | { ok: true; requestId?: string }
    | { ok: false; error: string; duplicateRequestId?: string };

const NO_EMPLOYEE_LINK_MESSAGE = "We could not find an employee profile linked to your account. Please contact HR.";
const VALIDATION_MESSAGE = "Please complete the required fields before submitting.";
const SUBMIT_ERROR_MESSAGE = "We could not submit your request right now. Please try again or contact HR.";
const DUPLICATE_MESSAGE = "You already have a similar request pending HR review.";

function failure(error: string, duplicateRequestId?: string): ActionResult {
    return { ok: false, error, duplicateRequestId };
}

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
    try {
        await writeAuditLog(input);
    } catch (error) {
        logServerError("audit_log_failed", error);
    }
}

async function getLinkedEmployeeContext() {
    const context = await requireAuthorizedUser();
    const me = await getMyEmployee(context.appUserId);
    if (!me?.employee) return null;
    return { appUserId: context.appUserId, employee: me.employee };
}

function buildStatus(mode: EmployeeRequestMode): EmployeeRequestStatus {
    return mode === "draft" ? "draft" : "submitted";
}

function buildRelatedModule(input: EmployeeRequestFormInput) {
    if (input.relatedModule) return input.relatedModule;
    if (input.requestType === "pds_update") return "pds";
    if (input.requestType === "service_record_correction") return "service_records";
    if (input.requestType === "document_request") return "documents";
    if (input.requestType === "certificate_request") return "certificates";
    if (input.requestType === "leave_related_request") return "leave";
    return null;
}

async function ensureNoDuplicate(employeeId: string, input: EmployeeRequestFormInput, excludeRequestId?: string) {
    const duplicate = await findSimilarActiveRequest(employeeId, { ...input, relatedModule: buildRelatedModule(input) }, excludeRequestId);
    if (!duplicate) return null;
    return duplicate.id;
}

export async function createEmployeeRequestAction(input: EmployeeRequestFormInput, mode: EmployeeRequestMode): Promise<ActionResult> {
    const parsedMode = employeeRequestModeSchema.safeParse(mode);
    if (!parsedMode.success) return failure(VALIDATION_MESSAGE);
    const schema = parsedMode.data === "draft" ? employeeRequestDraftFormSchema : employeeRequestFormSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) return failure(VALIDATION_MESSAGE);

    const linked = await getLinkedEmployeeContext();
    if (!linked) return failure(NO_EMPLOYEE_LINK_MESSAGE);

    const status = buildStatus(parsedMode.data);
    const relatedModule = buildRelatedModule(parsed.data);

    if (status === "submitted") {
        const duplicateId = await ensureNoDuplicate(linked.employee.id, { ...parsed.data, relatedModule });
        if (duplicateId) return failure(DUPLICATE_MESSAGE, duplicateId);
    }

    const submittedAt = status === "submitted" ? new Date().toISOString() : null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("employee_requests")
        .insert({
            employee_id: linked.employee.id,
            campus_id: linked.employee.campusId,
            office_id: linked.employee.officeId,
            request_type: parsed.data.requestType,
            subject: parsed.data.subject,
            description: parsed.data.description,
            field_to_correct: parsed.data.fieldToCorrect,
            current_value: parsed.data.currentValue,
            requested_value: parsed.data.requestedValue,
            related_module: relatedModule,
            status,
            submitted_at: submittedAt,
            created_by_user_id: linked.appUserId,
            updated_by_user_id: linked.appUserId,
        } as never)
        .select("id")
        .single();

    if (error || !data) return failure(SUBMIT_ERROR_MESSAGE);

    const requestId = (data as { id: string }).id;
    await safeAuditLog({
        eventType: status === "draft" ? "employee_request.draft_saved" : "employee_request.submitted",
        action: status === "draft" ? "save_employee_request_draft" : "submit_employee_request",
        entityType: "employee_requests",
        entityId: requestId,
        campusId: linked.employee.campusId,
        metadata: { requestType: parsed.data.requestType, status },
    });

    revalidatePath("/me/requests");
    return { ok: true, requestId };
}

export async function updateEmployeeRequestAction(
    requestId: string,
    input: EmployeeRequestFormInput,
    mode: EmployeeRequestMode
): Promise<ActionResult> {
    const parsedMode = employeeRequestModeSchema.safeParse(mode);
    if (!parsedMode.success) return failure(VALIDATION_MESSAGE);
    const schema = parsedMode.data === "draft" ? employeeRequestDraftFormSchema : employeeRequestFormSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) return failure(VALIDATION_MESSAGE);

    const linked = await getLinkedEmployeeContext();
    if (!linked) return failure(NO_EMPLOYEE_LINK_MESSAGE);

    const scope = await getEditableRequestScope(linked.employee.id, requestId);
    if (!scope) return failure("You do not have permission to view this request.");
    if (scope.status !== "draft" && scope.status !== "returned_for_revision") {
        return failure("Only draft or returned requests can be edited.");
    }

    const status = buildStatus(parsedMode.data);
    const relatedModule = buildRelatedModule(parsed.data);

    if (status === "submitted") {
        const duplicateId = await ensureNoDuplicate(linked.employee.id, { ...parsed.data, relatedModule }, requestId);
        if (duplicateId) return failure(DUPLICATE_MESSAGE, duplicateId);
    }

    const submittedAt = status === "submitted" ? new Date().toISOString() : null;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("employee_requests")
        .update({
            request_type: parsed.data.requestType,
            subject: parsed.data.subject,
            description: parsed.data.description,
            field_to_correct: parsed.data.fieldToCorrect,
            current_value: parsed.data.currentValue,
            requested_value: parsed.data.requestedValue,
            related_module: relatedModule,
            status,
            submitted_at: submittedAt,
            updated_by_user_id: linked.appUserId,
        } as never)
        .eq("id", requestId)
        .eq("employee_id", linked.employee.id);

    if (error) return failure(SUBMIT_ERROR_MESSAGE);

    await safeAuditLog({
        eventType: status === "draft" ? "employee_request.draft_updated" : "employee_request.submitted",
        action: status === "draft" ? "update_employee_request_draft" : "submit_employee_request_revision",
        entityType: "employee_requests",
        entityId: requestId,
        campusId: linked.employee.campusId,
        metadata: { requestType: parsed.data.requestType, status },
    });

    revalidatePath("/me/requests");
    return { ok: true, requestId };
}

export async function cancelEmployeeRequestAction(requestId: string): Promise<ActionResult> {
    const linked = await getLinkedEmployeeContext();
    if (!linked) return failure(NO_EMPLOYEE_LINK_MESSAGE);

    const scope = await getEditableRequestScope(linked.employee.id, requestId);
    if (!scope) return failure("You do not have permission to view this request.");
    if (scope.status !== "draft" && scope.status !== "submitted") {
        return failure("Only draft or submitted requests can be cancelled.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("employee_requests")
        .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_by_user_id: linked.appUserId,
        } as never)
        .eq("id", requestId)
        .eq("employee_id", linked.employee.id);

    if (error) return failure("We could not cancel your request right now. Please try again or contact HR.");

    await safeAuditLog({
        eventType: "employee_request.cancelled",
        action: "cancel_employee_request",
        entityType: "employee_requests",
        entityId: requestId,
        campusId: linked.employee.campusId,
        metadata: { previousStatus: scope.status },
    });

    revalidatePath("/me/requests");
    return { ok: true, requestId };
}
