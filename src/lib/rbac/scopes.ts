import type { AuthorizationContext } from "@/features/auth/types";
import type { AppPermission } from "@/lib/rbac/permissions";

export function hasPermission(context: AuthorizationContext, permission: AppPermission): boolean {
  return context.permissions.includes(permission);
}

export function canAccessCampus(context: AuthorizationContext, campusId: string | null | undefined): boolean {
  if (!campusId) return true;
  if (context.isSuperAdmin) return true;
  return context.campusScopes.includes(campusId);
}

export function canAccessOffice(context: AuthorizationContext, officeId: string | null | undefined): boolean {
  if (!officeId) return true;
  if (context.isSuperAdmin) return true;
  return context.officeScopes.includes(officeId);
}

export function hasScopedPermission(input: {
  context: AuthorizationContext;
  permission: AppPermission;
  campusId?: string | null;
  officeId?: string | null;
}): boolean {
  const { context, permission, campusId, officeId } = input;
  return hasPermission(context, permission) && canAccessCampus(context, campusId) && canAccessOffice(context, officeId);
}

