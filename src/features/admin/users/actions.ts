"use server";

import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/db/types";
import { writeAuditLog } from "@/features/audit/server/write-audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { userManagementSchema, type UserManagementInput } from "@/features/admin/users/schemas/user-management.schema";
import { officeBelongsToCampus } from "@/features/admin/organization/repository/scope.repository";
import {
  getToggleAccessBlockedReason,
  getUserManagementMutationBlockedReason,
  requireUserManagementPermission,
} from "@/features/admin/users/server/user-management-access";
import { searchEmployeesForLinking } from "@/features/admin/users/repository/users.repository";
import type { EmployeeSearchResult } from "@/features/admin/users/types";

type ActionResult = { ok: true } | { ok: false; error: string };

function success(): ActionResult {
  return { ok: true };
}

function failure(message: string): ActionResult {
  return { ok: false, error: message };
}

type ManagedUserState = {
  userId: string;
  status: "active" | "inactive" | "suspended";
  isActive: boolean;
  primaryCampusId: string | null;
  primaryOfficeId: string | null;
  roleId: string | null;
  roleCode: string | null;
  campusId: string | null;
  officeId: string | null;
};

async function getRoleCode(roleId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("roles").select("code").eq("id", roleId).maybeSingle();
  if (error || !data) return null;
  return (data as { code: string }).code;
}

async function loadManagedUserState(userId: string): Promise<ManagedUserState | null> {
  const supabase = await createSupabaseServerClient();
  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, status, is_active, primary_campus_id, primary_office_id")
    .eq("id", userId)
    .maybeSingle();
  if (!appUser) return null;

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("id, role_id, campus_id, effective_from, effective_to, created_at, role:roles(code)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const resolvedRole =
    ((userRole as Array<{
      id: string;
      role_id: string;
      campus_id: string | null;
      effective_from: string | null;
      effective_to: string | null;
      created_at: string;
      role: { code: string } | Array<{ code: string }> | null;
    }> | null) ?? []
    ).find((row) => {
      const fromOk = !row.effective_from || row.effective_from <= today;
      const toOk = !row.effective_to || row.effective_to >= today;
      return fromOk && toOk;
    }) ?? null;

  const roleId = resolvedRole?.role_id ?? null;
  const campusId = resolvedRole?.campus_id ?? null;
  const roleCode = (() => {
    const roleData = resolvedRole?.role;
    if (!roleData) return null;
    return Array.isArray(roleData) ? (roleData[0]?.code ?? null) : roleData.code;
  })();

  let officeId: string | null = null;
  if (resolvedRole) {
    const { data: officeData } = await supabase
      .from("user_role_offices")
      .select("office_id")
      .eq("user_role_id", resolvedRole.id)
      .maybeSingle();
    officeId = (officeData as { office_id: string } | null)?.office_id ?? null;
  }

  const typedAppUser = appUser as {
    id: string;
    status: "active" | "inactive" | "suspended";
    is_active: boolean;
    primary_campus_id: string | null;
    primary_office_id: string | null;
  };
  return {
    userId: typedAppUser.id,
    status: typedAppUser.status,
    isActive: typedAppUser.is_active,
    primaryCampusId: typedAppUser.primary_campus_id,
    primaryOfficeId: typedAppUser.primary_office_id,
    roleId,
    roleCode,
    campusId,
    officeId,
  };
}

export async function updateUserManagementAction(input: UserManagementInput): Promise<ActionResult> {
  const parsed = userManagementSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid user management input");

  const supabase = await createSupabaseServerClient();
  const payload = parsed.data;
  const beforeState = await loadManagedUserState(payload.userId);
  if (!beforeState) return failure("User not found.");

  const context = await requireUserManagementPermission({
    campusId: beforeState.campusId ?? beforeState.primaryCampusId,
    officeId: beforeState.officeId ?? beforeState.primaryOfficeId,
  });

  const roleCode = await getRoleCode(payload.roleId);
  if (!roleCode) return failure("Selected role is invalid");

  const governance = getUserManagementMutationBlockedReason(context, beforeState.roleCode, roleCode);
  if (governance) return failure(governance);

  const isGlobalRole = roleCode === "super_admin" || roleCode === "central_hr_admin";
  if (!isGlobalRole && !payload.campusId) {
    return failure("Campus is required for the selected role.");
  }
  if (isGlobalRole && payload.campusId) {
    return failure("Global roles cannot have campus scope.");
  }
  if (payload.officeId && !payload.campusId) {
    return failure("Office assignment requires campus scope.");
  }
  if (payload.officeId && payload.campusId) {
    const officeMatchesCampus = await officeBelongsToCampus({
      officeId: payload.officeId,
      campusId: payload.campusId,
    });
    if (!officeMatchesCampus) {
      return failure("Selected office does not belong to the selected campus.");
    }
  }

  await requireUserManagementPermission({
    campusId: isGlobalRole ? null : payload.campusId,
    officeId: payload.officeId,
  });

  const appUserStatus: "active" | "inactive" = payload.isActive ? "active" : "inactive";
  const rpcArgs: Database["public"]["Functions"]["apply_user_management_bundle"]["Args"] = {
    p_target_user_id: payload.userId,
    p_is_active: payload.isActive,
    p_status: appUserStatus,
    p_primary_campus_id: isGlobalRole ? null : payload.campusId,
    p_primary_office_id: payload.officeId ?? null,
    p_role_id: payload.roleId,
    p_role_campus_id: isGlobalRole ? null : payload.campusId,
    p_office_id: payload.officeId ?? null,
  };
  const { error: rpcError } = await supabase.rpc(
    "apply_user_management_bundle",
    // PostgREST client RPC typing does not resolve custom Database.Functions entries in this project setup.
    rpcArgs as never
  );
  if (rpcError) return failure(rpcError.message);

  const afterState = await loadManagedUserState(payload.userId);
  try {
    await writeAuditLog({
      eventType: "admin.user_management_updated",
      action: "update_user_management",
      entityType: "app_users",
      entityId: payload.userId,
      campusId: afterState?.campusId ?? payload.campusId,
      metadata: {
        before: beforeState,
        after: afterState,
      },
    });
  } catch (error) {
    console.error("audit_log_failed", error);
  }

  revalidatePath("/admin/users");
  return success();
}

export async function toggleUserAccessAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const beforeState = await loadManagedUserState(userId);
  if (!beforeState) return failure("User not found.");
  const context = await requireUserManagementPermission({
    campusId: beforeState.campusId ?? beforeState.primaryCampusId,
    officeId: beforeState.officeId ?? beforeState.primaryOfficeId,
  });
  const blocked = getToggleAccessBlockedReason(context, beforeState.roleCode);
  if (blocked) return failure(blocked);
  const { error } = await supabase
    .from("app_users")
    .update({ is_active: isActive, status: isActive ? "active" : "inactive" } as never)
    .eq("id", userId);
  if (error) return failure(error.message);

  const afterState = await loadManagedUserState(userId);
  try {
    await writeAuditLog({
      eventType: "admin.user_access_toggled",
      action: "toggle_user_access",
      entityType: "app_users",
      entityId: userId,
      campusId: afterState?.campusId ?? beforeState?.campusId,
      metadata: {
        before: beforeState,
        after: afterState,
        requested_active_state: isActive,
      },
    });
  } catch (auditError) {
    console.error("audit_log_failed", auditError);
  }

  revalidatePath("/admin/users");
  return success();
}

export async function relinkEmployeeAction(userId: string, employeeId: string | null): Promise<ActionResult> {
  if (!userId) return failure("Invalid user ID.");

  const supabase = await createSupabaseServerClient();
  const beforeState = await loadManagedUserState(userId);
  if (!beforeState) return failure("User not found.");

  await requireUserManagementPermission({
    campusId: beforeState.campusId ?? beforeState.primaryCampusId,
    officeId: beforeState.officeId ?? beforeState.primaryOfficeId,
  });

  // Fetch current employee_id for audit log
  const { data: appUserRow } = await supabase
    .from("app_users")
    .select("employee_id")
    .eq("id", userId)
    .maybeSingle();
  const previousEmployeeId = (appUserRow as { employee_id: string | null } | null)?.employee_id ?? null;

  const { error } = await supabase
    .from("app_users")
    .update({ employee_id: employeeId } as never)
    .eq("id", userId);
  if (error) return failure(error.message);

  await writeAuditLog({
    eventType: "admin.user_employee_relinked",
    action: "relink_employee",
    entityType: "app_users",
    entityId: userId,
    campusId: beforeState.primaryCampusId,
    metadata: {
      before_employee_id: previousEmployeeId,
      after_employee_id: employeeId,
    },
  }).catch(() => undefined);

  revalidatePath("/admin/users");
  return success();
}

export async function searchEmployeesAction(query: string): Promise<EmployeeSearchResult[]> {
  await requireUserManagementPermission({ campusId: null, officeId: null });
  return searchEmployeesForLinking(query);
}

/**
 * Manually provisions an app_users record for a person who has signed in with
 * Google at least once (so an auth.users row exists) but whose provisioning
 * failed or who needs to be created before their first successful sign-in.
 *
 * The function looks up the auth user by email via the secure RPC, then creates
 * the app_users row in "inactive / needs activation" state. After this, the admin
 * can assign a role and activate the account on the same Users page.
 */
export async function manualProvisionUserAction(email: string): Promise<ActionResult> {
  const context = await requireUserManagementPermission({ campusId: null, officeId: null });
  if (!context.isSuperAdmin && !context.roles.includes("central_hr_admin")) {
    return failure("Only super administrators or central HR administrators can manually provision accounts.");
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return failure("A valid email address is required.");
  }

  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  // Check if already provisioned
  const { data: existing } = await supabase
    .from("app_users")
    .select("id, email")
    .eq("email", trimmedEmail)
    .maybeSingle();

  if (existing) {
    return failure(`An account for "${trimmedEmail}" already exists in the system. Find it in the Users table below.`);
  }

  // Look up the Supabase auth user by iterating auth.admin.listUsers.
  // We do NOT rely on the get_auth_user_id_by_email RPC (migration 0050)
  // because that migration may not yet be applied to the remote DB.
  let foundAuthUserId: string | null = null;
  let page = 1;
  const PER_PAGE = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (listError) {
      return failure(`Failed to search auth accounts: ${listError.message}`);
    }
    const match = listData.users.find((u) => u.email?.toLowerCase() === trimmedEmail);
    if (match) {
      foundAuthUserId = match.id;
      break;
    }
    const pagination = listData as unknown as { nextPage: number | null };
    if (!pagination.nextPage) break;
    page++;
  }

  if (!foundAuthUserId) {
    return failure(
      `No Google sign-in account found for "${trimmedEmail}". ` +
      `The person must open the login page and click "Continue with CSU Google Account" once — ` +
      `even if they see an error. That registers their Google account. ` +
      `Then use this button again.`
    );
  }

  // Find matching employee by email
  const { data: empData } = await admin
    .from("employees")
    .select("id, campus_id, office_id")
    .eq("email", trimmedEmail)
    .is("deleted_at", null)
    .limit(1);

  const emp = (empData ?? [])[0] as { id: string; campus_id: string; office_id: string | null } | undefined;

  const { data: createdUser, error: insertError } = await admin
    .from("app_users")
    .insert({
      auth_user_id: foundAuthUserId,
      email: trimmedEmail,
      status: "inactive",
      is_active: false,
      employee_id: emp?.id ?? null,
      primary_campus_id: emp?.campus_id ?? null,
      // Do NOT set primary_office_id: the validate_app_user_office_scope trigger
      // would raise if the employee's office_id has a campus mismatch or is stale.
      // The admin can configure the office assignment after activation.
      primary_office_id: null,
    } as never)
    .select("id")
    .single();

  if (insertError || !createdUser) {
    console.error("[manualProvision] insert failed:", insertError);
    return failure(insertError?.message ?? "Failed to create account record.");
  }

  await writeAuditLog({
    eventType: "admin.user_manually_provisioned",
    action: "manual_provision",
    entityType: "app_users",
    entityId: (createdUser as { id: string }).id,
    metadata: { email: trimmedEmail, matched_employee_id: emp?.id ?? null },
  }).catch(() => undefined);

  revalidatePath("/admin/users");
  return success();
}

