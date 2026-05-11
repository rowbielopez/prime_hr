import type { AuthorizationContext } from "@/features/auth/types";

export function isComplianceGlobalAdmin(context: AuthorizationContext): boolean {
  return context.isSuperAdmin || context.roles.includes("central_hr_admin");
}
