"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { employeeFormSchema, type EmployeeFormInput } from "@/features/employees/schemas/employee-form.schema";
import {
  archiveEmployee,
  createEmployee,
  getEmployeeById,
  getEmployeeScopeById,
  softDeleteEmployee,
  updateEmployee,
  validateOfficeCampusScope,
} from "@/features/employees/repository/employees.repository";
import { requirePermission } from "@/features/auth/server/require-permission";

type ActionResult = { ok: true; employeeId?: string } | { ok: false; error: string };

function success(employeeId?: string): ActionResult {
  return { ok: true, employeeId };
}

function failure(message: string): ActionResult {
  return { ok: false, error: message };
}

export async function createEmployeeAction(input: EmployeeFormInput): Promise<ActionResult> {
  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid employee input.");
  if (parsed.data.officeId) {
    const officeMatchesCampus = await validateOfficeCampusScope({
      officeId: parsed.data.officeId,
      campusId: parsed.data.campusId,
    });
    if (!officeMatchesCampus) {
      return failure("Selected office does not belong to the selected campus.");
    }
  }
  const context = await requirePermission({
    permission: "employee.records.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });

  const result = await createEmployee(parsed.data, context.appUserId);
  if (!result.ok) return failure(result.error ?? "Failed to create employee.");
  if (result.employeeId) {
    try {
      await writeAuditLog({
        eventType: "employee.created",
        action: "create_employee",
        entityType: "employees",
        entityId: result.employeeId,
        campusId: parsed.data.campusId,
        metadata: {
          employeeNo: parsed.data.employeeNo,
          campusId: parsed.data.campusId,
          employmentStatus: parsed.data.employmentStatus,
        },
      });
    } catch (e) {
      console.error("audit_log_failed", e);
    }
  }
  revalidatePath("/employees");
  if (result.employeeId) revalidatePath(`/employees/${result.employeeId}`);
  return success(result.employeeId ?? undefined);
}

export async function updateEmployeeAction(employeeId: string, input: EmployeeFormInput): Promise<ActionResult> {
  const existingScope = await getEmployeeScopeById(employeeId);
  if (!existingScope) return failure("Employee not found.");
  const context = await requirePermission({
    permission: "employee.records.write",
    campusId: existingScope.campusId,
    officeId: existingScope.officeId,
  });

  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid employee input.");
  if (parsed.data.officeId) {
    const officeMatchesCampus = await validateOfficeCampusScope({
      officeId: parsed.data.officeId,
      campusId: parsed.data.campusId,
    });
    if (!officeMatchesCampus) {
      return failure("Selected office does not belong to the selected campus.");
    }
  }
  await requirePermission({
    permission: "employee.records.write",
    campusId: parsed.data.campusId,
    officeId: parsed.data.officeId,
  });

  const before = await getEmployeeById(employeeId);
  const result = await updateEmployee(employeeId, parsed.data, context.appUserId);
  if (!result.ok) return failure(result.error ?? "Failed to update employee.");
  const after = await getEmployeeById(employeeId);
  try {
    await writeAuditLog({
      eventType: "employee.updated",
      action: "update_employee",
      entityType: "employees",
      entityId: employeeId,
      campusId: parsed.data.campusId,
      metadata: { before, after },
    });
  } catch (e) {
    console.error("audit_log_failed", e);
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function archiveEmployeeAction(employeeId: string): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const before = await getEmployeeById(employeeId);
  const result = await archiveEmployee(employeeId);
  if (!result.ok) return failure(result.error ?? "Failed to archive employee.");
  try {
    await writeAuditLog({
      eventType: "employee.archived",
      action: "archive_employee",
      entityType: "employees",
      entityId: employeeId,
      campusId: scope.campusId,
      metadata: { before, employmentStatus: "separated" },
    });
  } catch (e) {
    console.error("audit_log_failed", e);
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function softDeleteEmployeeAction(employeeId: string): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const before = await getEmployeeById(employeeId);
  const result = await softDeleteEmployee(employeeId);
  if (!result.ok) return failure(result.error ?? "Failed to remove employee record.");
  try {
    await writeAuditLog({
      eventType: "employee.soft_deleted",
      action: "soft_delete_employee",
      entityType: "employees",
      entityId: employeeId,
      campusId: scope.campusId,
      metadata: { before },
    });
  } catch (e) {
    console.error("audit_log_failed", e);
  }
  revalidatePath("/employees");
  return success(employeeId);
}
