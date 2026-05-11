import type { AuthorizationContext } from "@/features/auth/types";
import { hasPermission } from "@/lib/rbac/scopes";

/** Campus HR / central HR, or office unit heads nominating within scope. */
export function canSubmitTrainingNomination(context: AuthorizationContext): boolean {
  if (hasPermission(context, "learning.write")) return true;
  if (hasPermission(context, "learning.read") && context.roles.includes("office_unit_head")) return true;
  return false;
}
