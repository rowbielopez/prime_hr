import { redirect } from "next/navigation";
import type { AuthorizationContext } from "@/features/auth/types";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import { canAccessCampus } from "@/lib/rbac/scopes";
import { canSubmitTrainingNomination } from "@/features/learning/requests/nomination-guards";

export function ensureCanSubmitNomination(context: AuthorizationContext, campusId: string) {
  if (!canSubmitTrainingNomination(context)) {
    redirect(buildForbiddenUrl("missing_permission"));
  }
  if (!canAccessCampus(context, campusId)) {
    redirect(buildForbiddenUrl("campus_scope_denied"));
  }
}
