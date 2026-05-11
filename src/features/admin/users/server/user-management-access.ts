import { redirect } from "next/navigation";
import type { AuthorizationContext } from "@/features/auth/types";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { hasPermission } from "@/lib/rbac/scopes";

/** Central HR admins manage users across all campuses/offices; campus-scoped HR uses normal scopes. */
export function userMgmtCanAccessCampus(
  context: AuthorizationContext,
  campusId: string | null | undefined
): boolean {
  if (!campusId) return true;
  if (context.isSuperAdmin) return true;
  if (context.roles.includes("central_hr_admin")) return true;
  return context.campusScopes.includes(campusId);
}

export function userMgmtCanAccessOffice(
  context: AuthorizationContext,
  officeId: string | null | undefined
): boolean {
  if (!officeId) return true;
  if (context.isSuperAdmin) return true;
  if (context.roles.includes("central_hr_admin")) return true;
  return context.officeScopes.includes(officeId);
}

export async function requireUserManagementPermission(input: {
  campusId?: string | null;
  officeId?: string | null;
  redirectTo?: string;
}): Promise<AuthorizationContext> {
  const context = await requireAuthorizedUser({
    onUnauthorizedRedirectTo: input.redirectTo,
  });
  if (!hasPermission(context, "admin.users.write")) {
    redirect(input.redirectTo ?? buildForbiddenUrl("missing_permission"));
  }
  if (!userMgmtCanAccessCampus(context, input.campusId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("campus_scope_denied"));
  }
  if (!userMgmtCanAccessOffice(context, input.officeId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("office_scope_denied"));
  }
  return context;
}

export function getUserManagementMutationBlockedReason(
  context: AuthorizationContext,
  targetRoleCode: string | null,
  newRoleCode: string | null
): string | null {
  if (targetRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can change users who currently hold the super administrator role.";
  }
  if (newRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can assign the super administrator role.";
  }
  return null;
}

export function getToggleAccessBlockedReason(
  context: AuthorizationContext,
  targetRoleCode: string | null
): string | null {
  if (targetRoleCode === "super_admin" && !context.isSuperAdmin) {
    return "Only a super administrator can change access for users who hold the super administrator role.";
  }
  return null;
}
