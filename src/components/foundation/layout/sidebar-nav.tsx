"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Pin, PinOff, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  AppNavGroup,
  AppNavItem,
} from "@/components/foundation/layout/build-app-nav";
import { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";
import {
  moduleAccentClass,
  moduleRailClass,
  navIconMap,
  resolveModuleColor,
} from "@/components/foundation/routing/nav-visuals";
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
    const moduleColor = resolveModuleColor(item.href, item.moduleColor);
    const isPinned = pinnedSet.has(item.href);
    const showPinAffordance = !collapsed && !item.isComingSoon;

    const content = (
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5",
          collapsed && "justify-center",
        )}
      >
        <span
          className={cn(
            "relative flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
            isActive
              ? moduleAccentClass[moduleColor]
              : "border-transparent bg-transparent text-muted-foreground group-hover/item:bg-surface-raised",
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
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
            "group/item relative block cursor-not-allowed rounded-xl border border-dashed border-border/70 px-2 py-2 text-muted-foreground/78",
            collapsed && "px-1.5 py-2.5",
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
            className={cn(
              "absolute top-2 bottom-2 left-0 w-1 rounded-full",
              moduleRailClass[moduleColor],
            )}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }
            }
          />
        ) : null}
        <Link
          href={item.href}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative block rounded-xl border border-transparent px-2 py-2 transition-all duration-200 outline-none",
            "hover:bg-surface-raised hover:text-foreground hover:shadow-premium-sm focus-visible:ring-2 focus-visible:ring-ring/50",
            collapsed && "px-1.5 py-2.5",
            isActive
              ? "bg-surface-panel text-foreground shadow-premium-sm ring-1 ring-foreground/5"
              : "text-muted-foreground",
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
              "absolute top-2.5 right-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
              "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isPinned
                ? "opacity-100"
                : "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100",
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
      className={cn("space-y-5", collapsed && "space-y-3")}
    >
      {pinnedItems.length > 0 ? (
        <section className="space-y-1.5" aria-label="Pinned modules">
          {collapsed ? (
            <div
              className="mx-auto flex size-8 items-center justify-center rounded-lg bg-brand-gold/12 text-brand-gold"
              title="Pinned"
            >
              <Star className="size-4" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5">
                <Star className="size-3.5 text-brand-gold" />
                <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Pinned
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {pinnedItems.length}
              </span>
            </div>
          )}
          <div className="space-y-1">
            {pinnedItems.map((item) => renderItem(item, { fromPinned: true }))}
          </div>
        </section>
      ) : !collapsed ? (
        <div className="rounded-2xl border premium-border bg-surface-panel/70 p-3 shadow-premium-sm">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Fast paths live here
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                Pin high-frequency modules or press Ctrl K.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {groups.map((group) => {
        const GroupIcon = navIconMap[group.icon];
        const hasActiveItem = group.title === activeGroupTitle;
        const isOpen =
          collapsed || hasActiveItem || openGroups.includes(group.title);

        return (
          <section key={group.title} className="space-y-1.5">
            {collapsed ? (
              <div
                className="mx-auto h-px w-8 bg-border/80"
                aria-hidden="true"
              />
            ) : (
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={isOpen}
                className="group flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                    moduleAccentClass[group.moduleColor],
                  )}
                >
                  <GroupIcon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold tracking-[0.08em] text-foreground uppercase">
                    {group.title}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {group.description}
                  </span>
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {group.items.length}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
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
