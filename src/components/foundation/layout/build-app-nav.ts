import type { AuthorizationContext } from "@/features/auth/types";
import type { AppRole } from "@/lib/constants/roles";
import type { AppPermission } from "@/lib/rbac/permissions";
import {
  APP_ROUTE_DEFINITIONS,
  type AppModuleColor,
  type AppNavIconKey,
} from "@/components/foundation/routing/route-registry";
import { resolveModuleColor } from "@/components/foundation/routing/nav-visuals";

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
  keywords?: string[];
};

export type AppNavGroup = {
  title: string;
  description: string;
  icon: AppNavIconKey;
  moduleColor: AppModuleColor;
  defaultCollapsed?: boolean;
  items: AppNavItem[];
};

type WorkspaceNavSection = Omit<AppNavGroup, "items"> & {
  match: (item: AppNavItem) => boolean;
};

const WORKSPACE_NAV_SECTIONS: WorkspaceNavSection[] = [
  {
    title: "My Workspace",
    description: "Your profile, PDS, documents, and account",
    icon: "user-round",
    moduleColor: "people",
    match: (item) => item.href === "/me" || item.href.startsWith("/me/"),
  },
  {
    title: "Command Center",
    description: "Overview, alerts, and operational pulse",
    icon: "layout-dashboard",
    moduleColor: "platform",
    match: (item) =>
      item.href === "/dashboard" ||
      item.href === "/notifications" ||
      item.href === "/activity",
  },
  {
    title: "People Operations",
    description: "Employees, campuses, offices, and structure",
    icon: "users",
    moduleColor: "people",
    match: (item) =>
      item.href.startsWith("/employees") ||
      item.href.startsWith("/pds") ||
      item.href.startsWith("/requests") ||
      item.href.includes("campus") ||
      item.href.includes("offices"),
  },
  {
    title: "PRIME-HRM Governance",
    description: "Compliance, evidence, readiness, and audit",
    icon: "shield-check",
    moduleColor: "compliance",
    match: (item) =>
      item.href.startsWith("/compliance") || item.href.startsWith("/audit"),
  },
  {
    title: "Talent Pipeline",
    description: "Vacancies, applicants, ranking, and appointments",
    icon: "briefcase-business",
    moduleColor: "recruitment",
    match: (item) => item.href.startsWith("/recruitment"),
  },
  {
    title: "Growth & Performance",
    description: "Learning, competencies, evaluations, and ratings",
    icon: "line-chart",
    moduleColor: "performance",
    match: (item) =>
      item.href.startsWith("/learning") || item.href.startsWith("/performance"),
  },
  {
    title: "Recognition",
    description: "Awards, nominations, and recognition history",
    icon: "heart-handshake",
    moduleColor: "rewards",
    match: (item) => item.href.startsWith("/rewards"),
  },
  {
    title: "Insights",
    description: "Reports, dashboards, exports, and analytics",
    icon: "bar-chart-3",
    moduleColor: "platform",
    defaultCollapsed: true,
    match: (item) => item.href.startsWith("/reports"),
  },
  {
    title: "System",
    description: "Users, roles, settings, and platform controls",
    icon: "settings",
    moduleColor: "platform",
    defaultCollapsed: true,
    match: (item) =>
      item.href.startsWith("/admin") || item.href.startsWith("/settings"),
  },
];

export const APP_NAV_GROUPS: AppNavGroup[] = (() => {
  const grouped = new Map<string, AppNavItem[]>();
  for (const route of APP_ROUTE_DEFINITIONS) {
    if (!route.navGroup || !route.navLabel || !route.icon) continue;
    const item: AppNavItem = {
      href: route.path,
      label: route.navLabel,
      icon: route.icon,
      description: route.navDescription,
      isComingSoon: route.isComingSoon,
      requiredRoles: route.requiredRoles,
      requiredPermissions: route.requiredPermissions,
      moduleColor: resolveModuleColor(route.path, route.moduleColor),
      commandable: route.commandable ?? true,
      quickCreateHref: route.quickCreateHref,
      group: route.navGroup,
      keywords: [
        route.pageLabel,
        route.pageTitle,
        route.breadcrumbHint,
        route.navGroup,
      ].filter((value): value is string => Boolean(value)),
    };
    const section = WORKSPACE_NAV_SECTIONS.find((candidate) =>
      candidate.match(item),
    );
    const groupTitle = section?.title ?? route.navGroup;
    const existing = grouped.get(groupTitle) ?? [];
    existing.push({ ...item, group: groupTitle });
    grouped.set(groupTitle, existing);
  }

  const byTitle = new Map(
    WORKSPACE_NAV_SECTIONS.map((section) => [section.title, section]),
  );
  return Array.from(grouped.entries()).map(([title, items]) => {
    const section = byTitle.get(title);
    return {
      title,
      description: section?.description ?? "Workspace pages and workflows",
      icon: section?.icon ?? "layout-dashboard",
      moduleColor: section?.moduleColor ?? "platform",
      defaultCollapsed: section?.defaultCollapsed,
      items,
    };
  });
})();

function hasAnyRole(userRoles: AppRole[], requiredRoles: AppRole[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}

function hasAnyPermission(
  userPermissions: AppPermission[],
  requiredPermissions: AppPermission[],
) {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

function canSeeNavItem(context: AuthorizationContext, item: AppNavItem) {
  if (context.isSuperAdmin) return true;
  const passesRoles =
    !item.requiredRoles || hasAnyRole(context.roles, item.requiredRoles);
  const passesPermissions =
    !item.requiredPermissions ||
    hasAnyPermission(context.permissions, item.requiredPermissions);
  return passesRoles && passesPermissions;
}

/** Builds sidebar nav groups from route registry + current authorization context. */
export function buildNavGroupsForContext(
  context: AuthorizationContext,
): AppNavGroup[] {
  return APP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(context, item)),
  })).filter((group) => group.items.length > 0);
}
