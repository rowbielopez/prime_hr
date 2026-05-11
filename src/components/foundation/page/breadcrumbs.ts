import type { PageHeaderBreadcrumbItem } from "@/components/foundation/page/page-header";
import {
  APP_ROUTE_BY_PATH,
  normalizeRoutePath,
} from "@/components/foundation/routing/route-registry";

function toTitleCase(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRouteMetadata(pathname: string) {
  return APP_ROUTE_BY_PATH.get(normalizeRoutePath(pathname));
}

export function buildPageBreadcrumb(pathname: string): PageHeaderBreadcrumbItem[] {
  const normalizedPath = normalizeRoutePath(pathname);
  const segments = normalizedPath.split("/").filter(Boolean);
  const breadcrumbs: PageHeaderBreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];

  if (segments.length === 0 || normalizedPath === "/dashboard") {
    breadcrumbs.push({ label: "Dashboard" });
    return breadcrumbs;
  }

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const routeMeta = getRouteMetadata(currentPath);
    const label = routeMeta?.pageLabel ?? toTitleCase(segment);

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

export type PageMeta = {
  title: string;
  subtitle?: string;
  breadcrumb: PageHeaderBreadcrumbItem[];
};

export function getPageMeta(pathname: string): PageMeta {
  const normalizedPath = normalizeRoutePath(pathname);
  const metadata = getRouteMetadata(normalizedPath);

  if (metadata?.pageTitle) {
    return {
      title: metadata.pageTitle,
      subtitle: metadata.pageSubtitle,
      breadcrumb: buildPageBreadcrumb(normalizedPath),
    };
  }

  const lastSegment = normalizedPath.split("/").filter(Boolean).pop();
  return {
    title: lastSegment ? toTitleCase(lastSegment) : "Dashboard",
    subtitle: undefined,
    breadcrumb: buildPageBreadcrumb(normalizedPath),
  };
}

