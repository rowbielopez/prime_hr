"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";
import { buildPageBreadcrumb } from "@/components/foundation/page/breadcrumbs";
import type { PageHeaderBreadcrumbItem } from "@/components/foundation/page/page-header";
import { cn } from "@/lib/utils";

export type BreadcrumbsProps = {
    /** Explicit items – when omitted, builds from `usePathname()`. */
    items?: ReadonlyArray<PageHeaderBreadcrumbItem>;
    className?: string;
    /** Render the leading home icon (default true). */
    showHome?: boolean;
    /** Optional className for the active (last) crumb. */
    activeClassName?: string;
};

/**
 * Standalone breadcrumb component. Use directly inside page chrome when the
 * full `PageHeader` is not rendered (e.g. inside `StickyPageHeader` or split
 * inspector layouts). For top-level pages prefer `PageHeader` which already
 * embeds breadcrumbs.
 */
export function Breadcrumbs({
    items,
    className,
    showHome = true,
    activeClassName,
}: BreadcrumbsProps) {
    const pathname = usePathname();
    const resolved = items ?? buildPageBreadcrumb(pathname ?? "/");
    if (resolved.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {resolved.map((item, idx) => {
                    const isLast = idx === resolved.length - 1;
                    const isFirst = idx === 0;
                    const labelNode: ReactNode =
                        isFirst && showHome ? (
                            <span className="inline-flex items-center gap-1">
                                <Home className="size-3" aria-hidden />
                                <span>{item.label}</span>
                            </span>
                        ) : (
                            <span>{item.label}</span>
                        );

                    return (
                        <Fragment key={`${item.label}-${idx}`}>
                            <li
                                className={cn(
                                    "inline-flex items-center",
                                    isLast && cn("font-medium text-foreground", activeClassName),
                                )}
                            >
                                {item.href && !isLast ? (
                                    <Link
                                        href={item.href}
                                        className="rounded transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                                    >
                                        {labelNode}
                                    </Link>
                                ) : (
                                    <span aria-current={isLast ? "page" : undefined}>{labelNode}</span>
                                )}
                            </li>
                            {!isLast ? (
                                <li aria-hidden className="text-muted-foreground/60">
                                    <ChevronRight className="size-3" />
                                </li>
                            ) : null}
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}
