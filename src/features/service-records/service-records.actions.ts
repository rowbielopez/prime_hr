"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { requirePermission } from "@/features/auth/server/require-permission";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import { getEmployeeScopeById } from "@/features/employees/repository/employees.repository";
import { serviceRecordEntrySchema, type ServiceRecordEntryInput } from "@/features/service-records/schemas/service-record.schema";
import {
    archiveServiceRecord,
    createServiceRecord,
    findCurrentServiceRecord,
    findOverlappingServiceRecords,
    getServiceRecordScopeById,
    updateServiceRecord,
} from "@/features/service-records/repository/service-records.repository";
import type { ServiceRecordArchiveResult, ServiceRecordMutationResult } from "@/features/service-records/types";

async function safeAuditLog(input: Parameters<typeof writeAuditLog>[0]) {
    try {
        await writeAuditLog(input);
    } catch (error) {
        console.error("audit_log_failed", error);
    }
}

function friendlyDbError(error: string | undefined, fallback: string) {
    if (!error) return fallback;
    if (error.includes("uq_employee_service_records_one_current_active")) {
        return "This employee already has a current service record.";
    }
    if (error.includes("employee_service_records_period_chk")) {
        return "Date To cannot be earlier than Date From.";
    }
    if (error.includes("monthly_salary")) {
        return "Salary cannot be negative.";
    }
    return fallback;
}

async function authorizeEmployeeWrite(employeeId: string) {
    const scope = await getEmployeeScopeById(employeeId);
    if (!scope) return { ok: false as const, error: "Employee not found." };
    const context = await requirePermission({
        permission: "employee.records.write",
        campusId: scope.campusId,
        officeId: scope.officeId,
    });
    return { ok: true as const, context, scope };
}

export async function createServiceRecordAction(input: ServiceRecordEntryInput): Promise<ServiceRecordMutationResult> {
    const parsed = serviceRecordEntrySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid service record entry." };

    const authorized = await authorizeEmployeeWrite(parsed.data.employeeId);
    if (!authorized.ok) return { ok: false, error: authorized.error };

    if (parsed.data.campusId !== authorized.scope.campusId) {
        return { ok: false, error: "Selected campus does not match the employee record." };
    }
    if (parsed.data.officeId) {
        const validOffice = await officeBelongsToCampus({ officeId: parsed.data.officeId, campusId: parsed.data.campusId });
        if (!validOffice) return { ok: false, error: "Selected office does not belong to the selected campus." };
    }

    if (parsed.data.isCurrent) {
        const current = await findCurrentServiceRecord(parsed.data.employeeId);
        if (current) return { ok: false, error: "This employee already has a current service record. Archive or end the previous current entry first." };
    }

    const overlaps = await findOverlappingServiceRecords({ employeeId: parsed.data.employeeId, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo ?? null });
    if (overlaps.length > 0 && !parsed.data.allowOverlap) {
        return { ok: false, error: "This service period overlaps with an existing service record. Please review before saving." };
    }

    const created = await createServiceRecord(parsed.data, authorized.context.appUserId);
    if (!created.ok || !created.id) return { ok: false, error: friendlyDbError(created.error, "Failed to save service record entry.") };

    await safeAuditLog({
        eventType: "employee.service_record_created",
        action: "create_service_record",
        entityType: "employee_service_records",
        entityId: created.id,
        campusId: parsed.data.campusId,
        metadata: { employeeId: parsed.data.employeeId, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo ?? null, isCurrent: parsed.data.isCurrent },
    });

    revalidatePath("/service-records");
    revalidatePath(`/service-records/${parsed.data.employeeId}`);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    revalidatePath("/me/service-record");
    return { ok: true, id: created.id, warning: overlaps.length > 0 ? "Saved with overlapping dates after HR confirmation." : undefined };
}

export async function updateServiceRecordAction(recordId: string, input: ServiceRecordEntryInput): Promise<ServiceRecordMutationResult> {
    const existingScope = await getServiceRecordScopeById(recordId);
    if (!existingScope) return { ok: false, error: "Service record entry not found." };
    const authorized = await authorizeEmployeeWrite(existingScope.employeeId);
    if (!authorized.ok) return { ok: false, error: authorized.error };

    const parsed = serviceRecordEntrySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid service record entry." };
    if (parsed.data.employeeId !== existingScope.employeeId) {
        return { ok: false, error: "Service record employee cannot be changed." };
    }
    if (parsed.data.isCurrent) {
        const current = await findCurrentServiceRecord(parsed.data.employeeId, recordId);
        if (current) return { ok: false, error: "This employee already has another current service record." };
    }
    const overlaps = await findOverlappingServiceRecords({ employeeId: parsed.data.employeeId, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo ?? null, excludeId: recordId });
    if (overlaps.length > 0 && !parsed.data.allowOverlap) {
        return { ok: false, error: "This service period overlaps with an existing service record. Please review before saving." };
    }

    const updated = await updateServiceRecord(recordId, parsed.data, authorized.context.appUserId);
    if (!updated.ok) return { ok: false, error: friendlyDbError(updated.error, "Failed to update service record entry.") };

    await safeAuditLog({
        eventType: "employee.service_record_updated",
        action: "update_service_record",
        entityType: "employee_service_records",
        entityId: recordId,
        campusId: parsed.data.campusId,
        metadata: { employeeId: parsed.data.employeeId, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo ?? null, isCurrent: parsed.data.isCurrent },
    });

    revalidatePath("/service-records");
    revalidatePath(`/service-records/${parsed.data.employeeId}`);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    revalidatePath("/me/service-record");
    return { ok: true, id: recordId, warning: overlaps.length > 0 ? "Saved with overlapping dates after HR confirmation." : undefined };
}

export async function archiveServiceRecordAction(recordId: string): Promise<ServiceRecordArchiveResult> {
    const scope = await getServiceRecordScopeById(recordId);
    if (!scope) return { ok: false, error: "Service record entry not found." };
    const authorized = await authorizeEmployeeWrite(scope.employeeId);
    if (!authorized.ok) return { ok: false, error: authorized.error };

    const archived = await archiveServiceRecord(recordId, authorized.context.appUserId);
    if (!archived.ok) return { ok: false, error: friendlyDbError(archived.error, "Failed to archive service record entry.") };

    await safeAuditLog({
        eventType: "employee.service_record_archived",
        action: "archive_service_record",
        entityType: "employee_service_records",
        entityId: recordId,
        campusId: scope.campusId,
        metadata: { employeeId: scope.employeeId },
    });

    revalidatePath("/service-records");
    revalidatePath(`/service-records/${scope.employeeId}`);
    revalidatePath(`/employees/${scope.employeeId}`);
    revalidatePath("/me/service-record");
    return { ok: true };
}