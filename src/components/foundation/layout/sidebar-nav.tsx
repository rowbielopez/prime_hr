"use client";

import type { ComponentType } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  FileSearch,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  Pin,
  PinOff,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppNavGroup, AppNavItem } from "@/components/foundation/layout/build-app-nav";
import type { AppNavIconKey } from "@/components/foundation/routing/route-registry";
import { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  groups: AppNavGroup[];
  onNavigate?: () => void;
  collapsed?: boolean;
};

const PINS_KEY = "prime-hr.sidebar.pins.v1";

export function SidebarNav({ groups, onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [pins, setPins] = useLocalStorage<string[]>(PINS_KEY, []);

  const allItems = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))),
    [groups],
  );
  const itemsByHref = useMemo(() => {
    const m = new Map<string, AppNavItem & { group: string }>();
    for (const it of allItems) m.set(it.href, it);
    return m;
  }, [allItems]);

  const pinnedItems = useMemo(
    () =>
      pins
        .map((href) => itemsByHref.get(href))
        .filter((it): it is AppNavItem & { group: string } => Boolean(it)),
    [pins, itemsByHref],
  );
  const pinnedSet = useMemo(() => new Set(pins), [pins]);

  const iconClassName = "size-4 shrink-0 text-muted-foreground transition-colors";
  const activeMatchCandidates = allItems
    .map((it) => it.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);
  const activeHref = activeMatchCandidates[0] ?? null;

  const iconMap: Record<AppNavIconKey, ComponentType<{ className?: string }>> = {
    "layout-dashboard": LayoutDashboard,
    users: Users,
    "building-2": Building2,
    "shield-check": ShieldCheck,
    "file-search": FileSearch,
    "bar-chart-3": BarChart3,
    "user-round": UserRound,
    "briefcase-business": BriefcaseBusiness,
    "line-chart": LineChart,
    "graduation-cap": GraduationCap,
    wallet: Wallet,
    "heart-handshake": HeartHandshake,
    settings: Settings,
  };

  function togglePin(href: string) {
    setPins((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  }

  function renderItem(item: AppNavItem, opts?: { fromPinned?: boolean }) {
    const isActive = activeHref === item.href;
    const Icon = iconMap[item.icon];
    const isPinned = pinnedSet.has(item.href);
    const showPinAffordance = !collapsed && !item.isComingSoon;

    const content = (
      <div className="flex w-full min-w-0 items-center gap-2">
        <div className={cn("flex min-w-0 flex-1 items-center gap-2", collapsed && "justify-center")}>
          <Icon className={cn(iconClassName, isActive && "text-primary")} />
          {collapsed ? (
            <span className="sr-only">{item.label}</span>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{item.label}</p>
              {item.description ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          )}
        </div>
        {item.isComingSoon && !collapsed ? (
          <Badge variant="outline" className="text-[10px]">
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
            "block cursor-not-allowed rounded-lg border border-dashed border-border/70 px-3 py-2.5 opacity-80",
            collapsed && "px-2 py-3",
            "text-muted-foreground",
          )}
          title={collapsed ? `${item.label} - Module in progress` : "Module in progress"}
        >
          {content}
        </div>
      );
    }

    return (
      <div key={`${opts?.fromPinned ? "pin-" : ""}${item.href}`} className="group/item relative">
        <Link
          href={item.href}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "block rounded-lg border border-transparent px-3 py-2.5 transition-all duration-200",
            "hover:bg-surface-raised hover:text-foreground hover:shadow-premium-sm",
            collapsed && "px-2 py-3",
            isActive
              ? "border-primary/16 bg-primary/9 text-foreground shadow-premium-sm"
              : "text-muted-foreground",
          )}
        >
          {content}
        </Link>
        {showPinAffordance ? (
          <button
            type="button"
            aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(item.href);
            }}
            className={cn(
              "absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-opacity",
              "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isPinned ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100",
            )}
          >
            {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <nav aria-label="Primary" className={cn("space-y-6", collapsed && "space-y-4")}>
      {pinnedItems.length > 0 ? (
        <section className="space-y-1.5">
          {collapsed ? (
            <div className="mx-auto h-px w-7 bg-border" aria-hidden />
          ) : (
            <div className="flex items-center gap-1.5 px-3">
              <Star className="size-3 text-brand-gold" />
              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Pinned
              </p>
            </div>
          )}
          {pinnedItems.map((item) => renderItem(item, { fromPinned: true }))}
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.title} className="space-y-1.5">
          {collapsed ? (
            <div className="mx-auto h-px w-7 bg-border" aria-hidden="true" />
          ) : (
            <p className="px-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {group.title}
            </p>
          )}
          {group.items.map((item) => renderItem(item))}
        </section>
      ))}
    </nav>
  );
}


