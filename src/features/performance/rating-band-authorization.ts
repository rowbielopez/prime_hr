import { redirect } from "next/navigation";
import type { AuthorizationContext } from "@/features/auth/types";
import { requirePermission } from "@/features/auth/server/require-permission";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";

const RATING_BAND_ADMIN_ROLES = new Set(["super_admin", "central_hr_admin"] as const);

export async function requireRatingBandAdminAccess(): Promise<AuthorizationContext> {
  const context = await requirePermission({ permission: "performance.finalize" });
  const allowed = context.roles.some((role) => RATING_BAND_ADMIN_ROLES.has(role as "super_admin" | "central_hr_admin"));
  if (!allowed) {
    redirect(buildForbiddenUrl("missing_permission"));
  }
  return context;
}

