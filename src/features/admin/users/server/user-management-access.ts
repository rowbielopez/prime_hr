import { redirect } from "next/navigation";
import type { AuthorizationContext } from "@/features/auth/types";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { hasPermission } from "@/lib/rbac/scopes";

/** Central HR admins manage users across all campuses/offices; campus-scoped HR uses normal scopes. */
export function userMgmtCanAccessCampus(
  context: AuthorizationContext,
  campusId: string | null | undefined,
): boolean {
  if (!campusId) return true;
  if (context.isSuperAdmin) return true;
  if (context.roles.includes("central_hr_admin")) return true;
  return context.campusScopes.includes(campusId);
}

export function userMgmtCanAccessOffice(
  context: AuthorizationContext,
  campusId: string | null | undefined,
  officeId: string | null | undefined,
): boolean {
  if (!officeId) return true;
  if (context.isSuperAdmin) return true;
  if (context.roles.includes("central_hr_admin")) return true;
  if (
    hasPermission(context, "admin.campus.users.write") &&
    userMgmtCanAccessCampus(context, campusId)
  )
    return true;
  return context.officeScopes.includes(officeId);
}

function hasUserManagementWritePermission(
  context: AuthorizationContext,
): boolean {
  return (
    hasPermission(context, "admin.users.write") ||
    hasPermission(context, "admin.campus.users.write")
  );
}

export async function requireUserManagementPermission(input: {
  campusId?: string | null;
  officeId?: string | null;
  redirectTo?: string;
}): Promise<AuthorizationContext> {
  const context = await requireAuthorizedUser({
    onUnauthorizedRedirectTo: input.redirectTo,
  });
  if (!hasUserManagementWritePermission(context)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("missing_permission"));
  }
  if (!userMgmtCanAccessCampus(context, input.campusId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("campus_scope_denied"));
  }
  if (!userMgmtCanAccessOffice(context, input.campusId, input.officeId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("office_scope_denied"));
  }
  return context;
}

export function getUserManagementMutationBlockedReason(
  context: AuthorizationContext,
  targetRoleCode: string | null,
  newRoleCode: string | null,
): string | null {
  if (targetRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can change users who currently hold the super administrator role.";
  }
  if (newRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can assign the super administrator role.";
  }
  if (
    newRoleCode === "central_hr_admin" &&
    !context.isSuperAdmin &&
    !context.roles.includes("central_hr_admin")
  ) {
    return "Only central HR administrators can assign the central HR administrator role.";
  }
  if (
    !hasPermission(context, "admin.users.write") &&
    (newRoleCode === "super_admin" || newRoleCode === "central_hr_admin")
  ) {
    return "Campus administrators can only assign campus-scoped roles.";
  }
  return null;
}

export function getToggleAccessBlockedReason(
  context: AuthorizationContext,
  targetRoleCode: string | null,
): string | null {
  if (targetRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can change access for users who hold the super administrator role.";
  }
  return null;
}
