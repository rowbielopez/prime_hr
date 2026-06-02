import { getPageMeta } from "@/components/foundation/page/breadcrumbs";
import type { PageMeta } from "@/components/foundation/page/breadcrumbs";
import type { AuthorizationContext } from "@/features/auth/types";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import { buildForbiddenUrl } from "@/features/auth/auth-errors";
import type { AppPermission } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/scopes";
import { redirect } from "next/navigation";

type WithProtectedPageMetaInput = {
  pathname: string;
  permission?: AppPermission;
  permissions?: AppPermission[];
};

type ProtectedPageMetaResult = {
  context: AuthorizationContext;
  pageMeta: PageMeta;
};

export async function withProtectedPageMeta(
  input: WithProtectedPageMetaInput,
): Promise<ProtectedPageMetaResult> {
  const context = await resolveProtectedContext(input);

  return {
    context,
    pageMeta: getPageMeta(input.pathname),
  };
}

async function resolveProtectedContext(
  input: WithProtectedPageMetaInput,
): Promise<AuthorizationContext> {
  if (input.permission) {
    return requirePermission({ permission: input.permission });
  }
  const context = await requireAuthorizedUser();
  if (
    input.permissions?.length &&
    !input.permissions.some((permission) => hasPermission(context, permission))
  ) {
    redirect(buildForbiddenUrl("missing_permission"));
  }
  return context;
}
