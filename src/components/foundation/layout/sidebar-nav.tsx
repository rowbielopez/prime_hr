"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Pin, PinOff, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
    AppNavGroup,
    AppNavItem,
} from "@/components/foundation/layout/build-app-nav";
import { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";
import { navIconMap } from "@/components/foundation/routing/nav-visuals";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
    groups: AppNavGroup[];
    onNavigate?: () => void;
    collapsed?: boolean;
};

const PINS_KEY = "prime-hr.sidebar.pins.v1";
const GROUPS_KEY = "prime-hr.sidebar.groups.v1";

export function SidebarNav({
    groups,
    onNavigate,
    collapsed = false,
}: SidebarNavProps) {
    const pathname = usePathname();
    const reduced = useReducedMotion();
    const [pins, setPins] = useLocalStorage<string[]>(PINS_KEY, []);
    const [openGroups, setOpenGroups] = useLocalStorage<string[]>(
        GROUPS_KEY,
        groups
            .filter((group) => !group.defaultCollapsed)
            .map((group) => group.title),
    );

    const allItems = useMemo(
        () =>
            groups.flatMap((group) =>
                group.items.map((item) => ({ ...item, group: group.title })),
            ),
        [groups],
    );
    const itemsByHref = useMemo(() => {
        const map = new Map<string, AppNavItem & { group: string }>();
        for (const item of allItems) map.set(item.href, item);
        return map;
    }, [allItems]);

    const pinnedItems = useMemo(
        () =>
            pins
                .map((href) => itemsByHref.get(href))
                .filter((item): item is AppNavItem & { group: string } =>
                    Boolean(item),
                ),
        [pins, itemsByHref],
    );
    const pinnedSet = useMemo(() => new Set(pins), [pins]);

    const activeHref = useMemo(() => {
        const candidates = allItems
            .map((item) => item.href)
            .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
            .sort((a, b) => b.length - a.length);
        return candidates[0] ?? null;
    }, [allItems, pathname]);

    const activeGroupTitle =
        allItems.find((item) => item.href === activeHref)?.group ?? null;

    function togglePin(href: string) {
        setPins((prev) =>
            prev.includes(href)
                ? prev.filter((item) => item !== href)
                : [...prev, href],
        );
    }

    function toggleGroup(title: string) {
        setOpenGroups((prev) =>
            prev.includes(title)
                ? prev.filter((item) => item !== title)
                : [...prev, title],
        );
    }

    function renderItem(item: AppNavItem, opts?: { fromPinned?: boolean }) {
        const isActive = activeHref === item.href;
        const Icon = navIconMap[item.icon];
        const isPinned = pinnedSet.has(item.href);
        const showPinAffordance = !collapsed && !item.isComingSoon;

        const content = (
            <div
                className={cn(
                    "flex w-full min-w-0 items-center gap-2.5",
                    collapsed && "justify-center",
                )}
            >
                <Icon
                    className={cn(
                        "size-4 shrink-0 transition-colors duration-100",
                        isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover/item:text-foreground",
                    )}
                    aria-hidden
                />
                {collapsed ? (
                    <span className="sr-only">{item.label}</span>
                ) : (
                    <span className="min-w-0 flex-1 pr-6">
                        <span className="block truncate text-[13px] font-medium leading-5">
                            {item.label}
                        </span>
                        {item.description ? (
                            <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted-foreground">
                                {item.description}
                            </span>
                        ) : null}
                    </span>
                )}
                {item.isComingSoon && !collapsed ? (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                        Soon
                    </Badge>
                ) : null}
            </div>
        );

        if (item.isComingSoon) {
            return (
                <div
                    key={item.href}
                    role="link"
                    aria-disabled="true"
                    className={cn(
                        "group/item relative block cursor-not-allowed rounded-md border border-dashed border-border/60 px-2.5 py-1.5 text-muted-foreground/60",
                        collapsed && "px-2 py-2",
                    )}
                    title={`${item.label} - Module in progress`}
                >
                    {content}
                </div>
            );
        }

        return (
            <div
                key={`${opts?.fromPinned ? "pin-" : ""}${item.href}`}
                className="group/item relative"
            >
                {isActive ? (
                    <motion.span
                        layoutId="sidebar-active-rail"
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-foreground/70"
                        transition={
                            reduced
                                ? { duration: 0 }
                                : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }
                        }
                    />
                ) : null}
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                        "relative block rounded-md px-2.5 py-1.5 transition-colors duration-100 outline-none",
                        "hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/45",
                        collapsed && "px-2 py-2",
                        isActive ? "bg-accent text-foreground" : "text-muted-foreground",
                    )}
                >
                    {content}
                </Link>
                {showPinAffordance ? (
                    <button
                        type="button"
                        aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            togglePin(item.href);
                        }}
                        className={cn(
                            "absolute top-2 right-2 inline-flex size-5 items-center justify-center rounded text-muted-foreground/60 transition-all duration-100",
                            "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            isPinned
                                ? "opacity-100"
                                : "opacity-0 group-hover/item:opacity-60 group-focus-within/item:opacity-60",
                        )}
                    >
                        {isPinned ? (
                            <PinOff className="size-3" />
                        ) : (
                            <Pin className="size-3" />
                        )}
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <nav
            aria-label="Primary"
            className={cn("space-y-4", collapsed && "space-y-3")}
        >
            {pinnedItems.length > 0 ? (
                <section className="space-y-1" aria-label="Pinned modules">
                    {collapsed ? (
                        <div className="flex justify-center py-0.5" title="Pinned">
                            <Star className="size-3.5 text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between px-2.5 py-0.5">
                            <p className="text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                                Pinned
                            </p>
                            <span className="text-[10px] text-muted-foreground/70">
                                {pinnedItems.length}
                            </span>
                        </div>
                    )}
                    <div className="space-y-1">
                        {pinnedItems.map((item) => renderItem(item, { fromPinned: true }))}
                    </div>
                </section>
            ) : !collapsed ? (
                <p className="px-2.5 text-[11px] leading-4 text-muted-foreground/60">
                    Pin modules for quick access or press{" "}
                    <kbd className="font-mono text-[10px]">⌘K</kbd>
                </p>
            ) : null}

            {groups.map((group) => {
                const hasActiveItem = group.title === activeGroupTitle;
                const isOpen =
                    collapsed || hasActiveItem || openGroups.includes(group.title);

                return (
                    <section key={group.title} className="space-y-1">
                        {collapsed ? (
                            <div
                                className="mx-auto h-px w-6 bg-border/60"
                                aria-hidden="true"
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.title)}
                                aria-expanded={isOpen}
                                className="group/header flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                            >
                                <span className="flex-1 truncate text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase transition-colors duration-100 group-hover/header:text-foreground">
                                    {group.title}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        "size-3 text-muted-foreground/60 transition-transform duration-150",
                                        isOpen && "rotate-180",
                                    )}
                                />
                            </button>
                        )}

                        <AnimatePresence initial={false}>
                            {isOpen ? (
                                <motion.div
                                    initial={reduced ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                    transition={
                                        reduced
                                            ? { duration: 0 }
                                            : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }
                                    }
                                    className="overflow-hidden"
                                    suppressHydrationWarning
                                >
                                    <div className="space-y-1">
                                        {group.items.map((item) => renderItem(item))}
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </section>
                );
            })}
        </nav>
    );
}
