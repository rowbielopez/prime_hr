import type { AuthorizationContext } from "@/features/auth/types";
import type { AppRole } from "@/lib/constants/roles";
import type { AppPermission } from "@/lib/rbac/permissions";
import {
  APP_ROUTE_DEFINITIONS,
  type AppModuleColor,
  type AppNavIconKey,
} from "@/components/foundation/routing/route-registry";

export type AppNavItem = {
  href: string;
  label: string;
  icon: AppNavIconKey;
  description?: string;
  isComingSoon?: boolean;
  requiredRoles?: AppRole[];
  requiredPermissions?: AppPermission[];
  moduleColor?: AppModuleColor;
  commandable?: boolean;
  quickCreateHref?: string;
  group?: string;
};

export type AppNavGroup = {
  title: string;
  items: AppNavItem[];
};

export const APP_NAV_GROUPS: AppNavGroup[] = (() => {
  const grouped = new Map<string, AppNavItem[]>();
  for (const route of APP_ROUTE_DEFINITIONS) {
    if (!route.navGroup || !route.navLabel || !route.icon) continue;
    const existing = grouped.get(route.navGroup) ?? [];
    existing.push({
      href: route.path,
      label: route.navLabel,
      icon: route.icon,
      description: route.navDescription,
      isComingSoon: route.isComingSoon,
      requiredRoles: route.requiredRoles,
      requiredPermissions: route.requiredPermissions,
      moduleColor: route.moduleColor,
      commandable: route.commandable ?? true,
      quickCreateHref: route.quickCreateHref,
      group: route.navGroup,
    });
    grouped.set(route.navGroup, existing);
  }

  return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
})();

function hasAnyRole(userRoles: AppRole[], requiredRoles: AppRole[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}

function hasAnyPermission(userPermissions: AppPermission[], requiredPermissions: AppPermission[]) {
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

function canSeeNavItem(context: AuthorizationContext, item: AppNavItem) {
  if (context.isSuperAdmin) return true;
  const passesRoles = !item.requiredRoles || hasAnyRole(context.roles, item.requiredRoles);
  const passesPermissions =
    !item.requiredPermissions || hasAnyPermission(context.permissions, item.requiredPermissions);
  return passesRoles && passesPermissions;
}

/** Builds sidebar nav groups from route registry + current authorization context. */
export function buildNavGroupsForContext(context: AuthorizationContext): AppNavGroup[] {
  return APP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(context, item)),
  })).filter((group) => group.items.length > 0);
}
