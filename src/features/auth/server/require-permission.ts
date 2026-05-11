import { redirect } from "next/navigation";
import type { AppPermission } from "@/lib/rbac/permissions";
import type { AuthorizationContext } from "@/features/auth/types";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { canAccessCampus, canAccessOffice, hasPermission } from "@/lib/rbac/scopes";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";

type PermissionCheckInput = {
  permission: AppPermission;
  campusId?: string | null;
  officeId?: string | null;
  redirectTo?: string;
};

export async function requirePermission(input: PermissionCheckInput): Promise<AuthorizationContext> {
  const context = await requireAuthorizedUser();
  if (!hasPermission(context, input.permission)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("missing_permission"));
  }
  if (!canAccessCampus(context, input.campusId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("campus_scope_denied"));
  }
  if (!canAccessOffice(context, input.officeId)) {
    redirect(input.redirectTo ?? buildForbiddenUrl("office_scope_denied"));
  }

  return context;
}

