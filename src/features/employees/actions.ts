"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { logServerError } from "@/lib/logging/server-logger";
import {
  employeeFormSchema,
  type EmployeeFormInput,
} from "@/features/employees/schemas/employee-form.schema";
import {
  employeeLoginEmailAssignmentSchema,
  type EmployeeLoginEmailAssignmentInput,
} from "@/features/employees/schemas/employee-email-assignment.schema";
import {
  archiveEmployee,
  createEmployee,
  findPossibleDuplicates,
  getEmployeeById,
  getEmployeeScopeById,
  softDeleteEmployee,
  updateEmployee,
  validateOfficeCampusScope,
} from "@/features/employees/repository/employees.repository";
import { requirePermission } from "@/features/auth/server/require-permission";
import { requireUserManagementPermission } from "@/features/admin/users/server/user-management-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PossibleDuplicateEmployee } from "@/features/employees/types";

type ActionResult =
  | { ok: true; employeeId?: string }
  | { ok: false; error: string };

type AssignEmployeeLoginEmailResult =
  | {
      ok: true;
      employeeId: string;
      email: string;
      linkedExistingAccount: boolean;
      needsFirstSignIn: boolean;
      accountIsActive: boolean | null;
    }
  | { ok: false; error: string };

function success(employeeId?: string): ActionResult {
  return { ok: true, employeeId };
}

function failure(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

type EmployeeAuditSnapshot = NonNullable<
  Awaited<ReturnType<typeof getEmployeeById>>
>;

function summarizeEmployeeUpdate(
  before: EmployeeAuditSnapshot | null,
  after: EmployeeAuditSnapshot | null,
) {
  const trackedFields: Array<keyof EmployeeAuditSnapshot> = [
    "campusId",
    "officeId",
    "positionTitle",
    "employmentStatus",
    "dateHired",
    "employmentType",
    "dateSeparated",
    "separationReason",
    "cabinetNo",
  ];
  const changedFields = trackedFields.filter(
    (field) => before?.[field] !== after?.[field],
  );

  return {
    changedFields,
    previousCampusId: before?.campusId ?? null,
    newCampusId: after?.campusId ?? null,
    previousOfficeId: before?.officeId ?? null,
    newOfficeId: after?.officeId ?? null,
    previousEmploymentStatus: before?.employmentStatus ?? null,
    newEmploymentStatus: after?.employmentStatus ?? null,
  };
}

export async function createEmployeeAction(
  input: EmployeeFormInput,
): Promise<ActionResult> {
  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ?? "Invalid employee input.",
    );
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
      logServerError("audit_log_failed", e);
    }
  }
  revalidatePath("/employees");
  if (result.employeeId) revalidatePath(`/employees/${result.employeeId}`);
  return success(result.employeeId ?? undefined);
}

export async function updateEmployeeAction(
  employeeId: string,
  input: EmployeeFormInput,
): Promise<ActionResult> {
  const existingScope = await getEmployeeScopeById(employeeId);
  if (!existingScope) return failure("Employee not found.");
  const context = await requirePermission({
    permission: "employee.records.write",
    campusId: existingScope.campusId,
    officeId: existingScope.officeId,
  });

  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ?? "Invalid employee input.",
    );
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

  // Super Admin gate: only super_admin may change the email field
  const newEmailNorm = parsed.data.email?.trim().toLowerCase() ?? null;
  const oldEmailNorm = before?.email ?? null;
  const emailChanging = newEmailNorm !== oldEmailNorm;
  if (emailChanging && !context.roles.includes("super_admin")) {
    return failure(
      "Only Super Admin users can update an employee's login email.",
    );
  }

  const result = await updateEmployee(
    employeeId,
    parsed.data,
    context.appUserId,
  );
  if (!result.ok) return failure(result.error ?? "Failed to update employee.");
  const after = await getEmployeeById(employeeId);
  try {
    await writeAuditLog({
      eventType: "employee.updated",
      action: "update_employee",
      entityType: "employees",
      entityId: employeeId,
      campusId: parsed.data.campusId,
      metadata: summarizeEmployeeUpdate(before, after),
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function archiveEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
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
      metadata: {
        previousEmploymentStatus: before?.employmentStatus ?? null,
        newEmploymentStatus: "separated",
        campusId: scope.campusId,
        officeId: scope.officeId,
      },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function softDeleteEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const before = await getEmployeeById(employeeId);
  const result = await softDeleteEmployee(employeeId);
  if (!result.ok)
    return failure(result.error ?? "Failed to remove employee record.");
  try {
    await writeAuditLog({
      eventType: "employee.soft_deleted",
      action: "soft_delete_employee",
      entityType: "employees",
      entityId: employeeId,
      campusId: scope.campusId,
      metadata: {
        previousEmploymentStatus: before?.employmentStatus ?? null,
        campusId: scope.campusId,
        officeId: scope.officeId,
      },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath("/employees");
  return success(employeeId);
}

type CheckDuplicatesResult =
  | { ok: true; duplicates: PossibleDuplicateEmployee[] }
  | { ok: false; error: string };

export async function checkDuplicateEmployeesAction(input: {
  employeeNo: string;
  email: string | null | undefined;
  firstName: string;
  lastName: string;
  birthDate: string | null | undefined;
  mobileNo: string | null | undefined;
}): Promise<CheckDuplicatesResult> {
  try {
    // Require at minimum read permission — duplicates check is read-only
    await requirePermission({ permission: "employee.records.read" });
    const duplicates = await findPossibleDuplicates(input);
    return { ok: true, duplicates };
  } catch {
    return { ok: false, error: "Could not check for duplicates." };
  }
}

export async function assignEmployeeLoginEmailAction(
  input: EmployeeLoginEmailAssignmentInput,
): Promise<AssignEmployeeLoginEmailResult> {
  const parsed = employeeLoginEmailAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ?? "Invalid email assignment input.",
    );
  }

  const scope = await getEmployeeScopeById(parsed.data.employeeId);
  if (!scope) return failure("Employee not found.");

  const context = await requireUserManagementPermission({
    campusId: scope.campusId,
    officeId: scope.officeId,
  });
  const admin = createSupabaseAdminClient();
  const normalizedEmail = parsed.data.email;

  const { data: duplicateEmployee, error: duplicateError } = await admin
    .from("employees")
    .select("id")
    .ilike("email", normalizedEmail)
    .is("deleted_at", null)
    .neq("id", parsed.data.employeeId)
    .maybeSingle();
  if (duplicateError)
    return failure(
      "We could not verify whether this email is already assigned.",
    );
  if (duplicateEmployee) {
    return failure(
      "This email is already assigned to another active employee.",
    );
  }

  const { data: linkedAccount, error: linkedAccountError } = await admin
    .from("app_users")
    .select("id, email")
    .eq("employee_id", parsed.data.employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (linkedAccountError)
    return failure("We could not verify the employee's linked account.");
  const typedLinkedAccount = linkedAccount as {
    id: string;
    email: string;
  } | null;
  if (
    typedLinkedAccount &&
    typedLinkedAccount.email.toLowerCase() !== normalizedEmail
  ) {
    return failure(
      "This employee is already linked to a different sign-in account. Change or unlink that account before assigning a new login email.",
    );
  }

  const { data: matchingAccount, error: matchingAccountError } = await admin
    .from("app_users")
    .select("id, employee_id, is_active, primary_campus_id")
    .eq("email", normalizedEmail)
    .is("deleted_at", null)
    .maybeSingle();
  if (matchingAccountError)
    return failure("We could not search for a matching sign-in account.");

  const typedMatchingAccount = matchingAccount as {
    id: string;
    employee_id: string | null;
    is_active: boolean;
    primary_campus_id: string | null;
  } | null;
  if (
    typedMatchingAccount?.employee_id &&
    typedMatchingAccount.employee_id !== parsed.data.employeeId
  ) {
    return failure(
      "The matching sign-in account is already linked to another employee.",
    );
  }

  const { error: updateEmployeeError } = await admin
    .from("employees")
    .update({
      email: normalizedEmail,
      updated_by_user_id: context.appUserId,
    } as never)
    .eq("id", parsed.data.employeeId)
    .is("deleted_at", null);
  if (updateEmployeeError) {
    return failure(
      updateEmployeeError.code === "23505"
        ? "This email is already assigned to another active employee."
        : "We could not assign the employee email. Please try again.",
    );
  }

  let linkedExistingAccount = false;
  if (typedMatchingAccount) {
    const { error: linkError } = await admin
      .from("app_users")
      .update({
        employee_id: parsed.data.employeeId,
        primary_campus_id:
          typedMatchingAccount.primary_campus_id ?? scope.campusId,
      } as never)
      .eq("id", typedMatchingAccount.id);
    if (linkError) {
      return failure(
        "The email was saved, but we could not link the matching sign-in account.",
      );
    }
    linkedExistingAccount = true;
  }

  await writeAuditLog({
    eventType: "employee.login_email_assigned",
    action: "assign_login_email",
    entityType: "employees",
    entityId: parsed.data.employeeId,
    campusId: scope.campusId,
    metadata: {
      email: normalizedEmail,
      linkedExistingAccount,
      needsFirstSignIn: !typedMatchingAccount,
    },
  }).catch((error) => logServerError("audit_log_failed", error));

  if (linkedExistingAccount) {
    await writeAuditLog({
      eventType: "employee.account_linked",
      action: "link_app_user",
      entityType: "employees",
      entityId: parsed.data.employeeId,
      campusId: scope.campusId,
      metadata: {
        appUserId: typedMatchingAccount?.id,
        linkMethod: "login_email_assignment",
      },
    }).catch((error) => logServerError("audit_log_failed", error));
  }

  revalidatePath("/admin/users");
  revalidatePath("/employees");
  revalidatePath(`/employees/${parsed.data.employeeId}`);

  return {
    ok: true,
    employeeId: parsed.data.employeeId,
    email: normalizedEmail,
    linkedExistingAccount,
    needsFirstSignIn: !typedMatchingAccount,
    accountIsActive: typedMatchingAccount?.is_active ?? null,
  };
}

export async function linkAppUserToEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const employee = await getEmployeeById(employeeId);
  if (!employee) return failure("Employee not found.");
  if (!employee.email)
    return failure(
      "This employee has no email address on record. Add an email before linking.",
    );

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  // Check if already linked
  const { data: alreadyLinked } = await supabase
    .from("app_users")
    .select("id")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (alreadyLinked)
    return failure("This employee is already linked to an account.");

  // Find a matching app user by email
  const { data: matchingUser, error: matchErr } = await supabase
    .from("app_users")
    .select("id, employee_id")
    .eq("email", employee.email.trim().toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (matchErr) return failure("Failed to search for matching account.");
  if (!matchingUser)
    return failure(
      "No system account was found for this employee email. Ask the employee to open the login page and sign in with their Google account once; they will see an access pending message, which is normal. After that, their system account will be created and you can link it here.",
    );

  const typedUser = matchingUser as { id: string; employee_id: string | null };
  if (typedUser.employee_id && typedUser.employee_id !== employeeId) {
    return failure(
      "That account is already linked to a different employee record.",
    );
  }

  const { error: updateErr } = await supabase
    .from("app_users")
    .update({ employee_id: employeeId } as never)
    .eq("id", typedUser.id);

  if (updateErr)
    return failure(
      "We could not link the sign-in account. Please verify the employee account settings and try again.",
    );

  try {
    await writeAuditLog({
      eventType: "employee.account_linked",
      action: "link_app_user",
      entityType: "employees",
      entityId: employeeId,
      campusId: scope.campusId,
      metadata: { appUserId: typedUser.id, linkMethod: "employee_email_match" },
    });
  } catch (e) {
    logServerError("audit_log_failed", e);
  }
  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function relinkAppUserByEmailAction(
  employeeId: string,
  newEmail: string,
): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const trimmedEmail = newEmail.trim().toLowerCase();
  if (!trimmedEmail) return failure("Email address is required.");

  // Use the admin client to bypass RLS — we need to read and write another
  // user's app_users record, which the server-side RLS policy would block.
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createSupabaseAdminClient();

  const { data: targetUser, error: findErr } = await adminClient
    .from("app_users")
    .select("id, employee_id")
    .eq("email", trimmedEmail)
    .is("deleted_at", null)
    .maybeSingle();

  if (findErr) return failure("Failed to search for the account.");
  if (!targetUser)
    return failure(
      "No system account was found for that email. " +
        "Ask the person to sign in with their Google account once, or go to Admin -> Users -> Provision Account to create their account manually. Then come back here to link it.",
    );

  const typedTarget = targetUser as { id: string; employee_id: string | null };
  if (typedTarget.employee_id && typedTarget.employee_id !== employeeId) {
    return failure(
      "That account is already linked to a different employee record.",
    );
  }

  // Clear the old link (any app_user previously pointing to this employee)
  await adminClient
    .from("app_users")
    .update({ employee_id: null } as never)
    .eq("employee_id", employeeId)
    .neq("id", typedTarget.id);

  const { error: updateErr } = await adminClient
    .from("app_users")
    .update({ employee_id: employeeId } as never)
    .eq("id", typedTarget.id);

  if (updateErr)
    return failure(
      "We could not update the linked sign-in account. Please verify the employee account settings.",
    );

  await writeAuditLog({
    eventType: "employee.account_relinked",
    action: "relink_app_user",
    entityType: "employees",
    entityId: employeeId,
    campusId: scope.campusId,
    metadata: { appUserId: typedTarget.id, linkMethod: "manual_email_relink" },
  }).catch((e) => logServerError("audit_log_failed", e));

  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}

export async function unlinkAppUserFromEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
  const scope = await getEmployeeScopeById(employeeId);
  if (!scope) return failure("Employee not found.");
  await requirePermission({
    permission: "employee.records.write",
    campusId: scope.campusId,
    officeId: scope.officeId,
  });

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("app_users")
    .update({ employee_id: null } as never)
    .eq("employee_id", employeeId);

  if (error)
    return failure(
      "We could not unlink the sign-in account. Please try again or contact your System Administrator.",
    );

  await writeAuditLog({
    eventType: "employee.account_unlinked",
    action: "unlink_app_user",
    entityType: "employees",
    entityId: employeeId,
    campusId: scope.campusId,
    metadata: {},
  }).catch((e) => logServerError("audit_log_failed", e));

  revalidatePath(`/employees/${employeeId}`);
  return success(employeeId);
}
