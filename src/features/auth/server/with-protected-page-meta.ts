import { getPageMeta } from "@/components/foundation/page/breadcrumbs";
import type { PageMeta } from "@/components/foundation/page/breadcrumbs";
import type { AuthorizationContext } from "@/features/auth/types";
import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { requirePermission } from "@/features/auth/server/require-permission";
import type { AppPermission } from "@/lib/rbac/permissions";

type WithProtectedPageMetaInput = {
  pathname: string;
  permission?: AppPermission;
};

type ProtectedPageMetaResult = {
  context: AuthorizationContext;
  pageMeta: PageMeta;
};

export async function withProtectedPageMeta(input: WithProtectedPageMetaInput): Promise<ProtectedPageMetaResult> {
  const context = input.permission
    ? await requirePermission({ permission: input.permission })
    : await requireAuthorizedUser();

  return {
    context,
    pageMeta: getPageMeta(input.pathname),
  };
}

