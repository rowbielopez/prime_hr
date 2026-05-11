import { redirect } from "next/navigation";
import type { AuthorizationContext } from "@/features/auth/types";
import { requireAuth } from "@/features/auth/server/require-auth";
import { resolveAuthorizationContext } from "@/features/auth/server/resolve-authorization-context";
import { buildForbiddenUrl, buildLoginUrl } from "@/features/auth/auth-errors";

type RequireAuthorizedUserOptions = {
  onUnauthenticatedRedirectTo?: string;
  onUnauthorizedRedirectTo?: string;
};

export async function requireAuthorizedUser(
  options: RequireAuthorizedUserOptions = {}
): Promise<AuthorizationContext> {
  const authUser = await requireAuth(options.onUnauthenticatedRedirectTo ?? buildLoginUrl());
  const context = await resolveAuthorizationContext(authUser);

  if (!context) {
    redirect(options.onUnauthorizedRedirectTo ?? buildForbiddenUrl("unauthorized_access"));
  }

  return context;
}

