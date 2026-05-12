"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Clock, Command, Plus, Search, Star } from "lucide-react";
import type { AppNavItem } from "@/components/foundation/layout/build-app-nav";
import { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";
import {
  moduleAccentClass,
  navIconMap,
  resolveModuleColor,
} from "@/components/foundation/routing/nav-visuals";
import type { AppModuleColor } from "@/components/foundation/routing/route-registry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AppNavItem[];
  onNavigate?: () => void;
};

type CommandEntry = {
  key: string;
  href: string;
  label: string;
  description?: string;
  group: string;
  icon: ReactNode;
  moduleColor: AppModuleColor;
  keywords: string;
  isQuickCreate?: boolean;
};

const RECENTS_KEY = "prime-hr.command.recents.v1";
const PINS_KEY = "prime-hr.sidebar.pins.v1";
const RECENT_LIMIT = 6;

export function CommandPalette({
  open,
  onOpenChange,
  items,
  onNavigate,
}: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel premium-border max-h-[min(42rem,92vh)] max-w-2xl gap-0 overflow-hidden border p-0 shadow-premium-lg">
        {open ? (
          <CommandPaletteBody
            items={items}
            onClose={() => onOpenChange(false)}
            onNavigate={onNavigate}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CommandPaletteBody({
  items,
  onClose,
  onNavigate,
}: {
  items: AppNavItem[];
  onClose: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useLocalStorage<string[]>(RECENTS_KEY, []);
  const [pins] = useLocalStorage<string[]>(PINS_KEY, []);
  const listRef = useRef<HTMLDivElement>(null);

  // Build a flat list of commandable entries.
  const allEntries = useMemo<CommandEntry[]>(() => {
    const entries: CommandEntry[] = [];
    for (const item of items) {
      if (item.commandable === false || item.isComingSoon) continue;
      const Icon = navIconMap[item.icon];
      const moduleColor = resolveModuleColor(item.href, item.moduleColor);
      entries.push({
        key: `nav:${item.href}`,
        href: item.href,
        label: item.label,
        description: item.description,
        group: item.group ?? "Navigation",
        icon: <Icon className="size-3.5" />,
        moduleColor,
        keywords: `${item.keywords?.join(" ") ?? ""} ${item.href}`,
      });
      if (item.quickCreateHref) {
        entries.push({
          key: `qc:${item.quickCreateHref}`,
          href: item.quickCreateHref,
          label: `New ${item.label}`,
          description: `Quick create in ${item.label}`,
          group: "Quick Create",
          icon: <Plus className="size-3.5" />,
          moduleColor,
          keywords: `new create add ${item.keywords?.join(" ") ?? ""} ${item.quickCreateHref}`,
          isQuickCreate: true,
        });
      }
    }
    return entries;
  }, [items]);

  // Filter & group.
  const groupedSections = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      const sections: Array<{ heading: string; entries: CommandEntry[] }> = [];

      const pinnedEntries = pins
        .map((href) =>
          allEntries.find((e) => e.href === href && !e.isQuickCreate),
        )
        .filter((e): e is CommandEntry => Boolean(e));
      if (pinnedEntries.length > 0) {
        sections.push({ heading: "Pinned", entries: pinnedEntries });
      }

      const recentEntries = recents
        .map((href) => allEntries.find((e) => e.href === href))
        .filter((e): e is CommandEntry => Boolean(e));
      if (recentEntries.length > 0) {
        sections.push({ heading: "Recent", entries: recentEntries });
      }

      const quickCreate = allEntries.filter((e) => e.isQuickCreate).slice(0, 6);
      if (quickCreate.length > 0) {
        sections.push({ heading: "Quick Create", entries: quickCreate });
      }

      // Group navigation entries by their navGroup.
      const navByGroup = new Map<string, CommandEntry[]>();
      for (const e of allEntries) {
        if (e.isQuickCreate) continue;
        const arr = navByGroup.get(e.group) ?? [];
        arr.push(e);
        navByGroup.set(e.group, arr);
      }
      for (const [heading, entries] of navByGroup) {
        sections.push({ heading, entries: entries.slice(0, 8) });
      }
      return sections;
    }

    const matched = allEntries.filter((e) => {
      const hay =
        `${e.label} ${e.description ?? ""} ${e.href} ${e.keywords}`.toLowerCase();
      return hay.includes(q);
    });
    const byGroup = new Map<string, CommandEntry[]>();
    for (const e of matched) {
      const arr = byGroup.get(e.group) ?? [];
      arr.push(e);
      byGroup.set(e.group, arr);
    }
    return Array.from(byGroup.entries()).map(([heading, entries]) => ({
      heading,
      entries,
    }));
  }, [allEntries, query, recents, pins]);

  // Flat list for keyboard navigation.
  const flatEntries = useMemo(
    () => groupedSections.flatMap((s) => s.entries),
    [groupedSections],
  );

  // Clamp active index when the result list shrinks (e.g. typing narrows it).
  const safeActiveIndex =
    flatEntries.length === 0
      ? 0
      : Math.min(activeIndex, flatEntries.length - 1);

  // Scroll active into view (DOM read/write only — no setState).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${safeActiveIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex]);

  function navigateTo(entry: CommandEntry) {
    setRecents((prev) =>
      [entry.href, ...prev.filter((h) => h !== entry.href)].slice(
        0,
        RECENT_LIMIT,
      ),
    );
    onClose();
    onNavigate?.();
    router.push(entry.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatEntries.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const base = Math.min(i, flatEntries.length - 1);
        return (base + 1) % flatEntries.length;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const base = Math.min(i, flatEntries.length - 1);
        return (base - 1 + flatEntries.length) % flatEntries.length;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatEntries[safeActiveIndex];
      if (target) navigateTo(target);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  let runningIndex = -1;

  return (
    <>
      <DialogHeader className="premium-border border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Command className="size-4" />
          </div>
          <div>
            <DialogTitle>PRIME-HR Spotlight</DialogTitle>
            <DialogDescription>
              Navigate, create, and search PRIME-HR without breaking flow.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="premium-border border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, workflows, and quick actions"
            className="h-11 border-0 bg-surface-inset pl-9 shadow-none focus-visible:ring-2"
            autoFocus
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[26rem] overflow-y-auto p-2 [scrollbar-width:thin]"
      >
        {groupedSections.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">No matching commands</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a module name, workflow, or page keyword.
            </p>
          </div>
        ) : (
          groupedSections.map((section) => (
            <div key={section.heading} className="mb-2 last:mb-0">
              <SectionHeading heading={section.heading} />
              <div className="space-y-0.5">
                {section.entries.map((entry) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === safeActiveIndex;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      data-command-index={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigateTo(entry)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 outline-none",
                        isActive
                          ? "bg-surface-panel text-foreground shadow-premium-sm ring-1 ring-foreground/5"
                          : "hover:bg-surface-raised",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                            entry.isQuickCreate
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : moduleAccentClass[entry.moduleColor],
                          )}
                          aria-hidden
                        >
                          {entry.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {entry.label}
                          </span>
                          {entry.description ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {entry.description}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="hidden items-center gap-1 sm:inline-flex">
                          <span className="rounded-full border border-border/70 bg-surface-inset px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {entry.group}
                          </span>
                          <kbd className="rounded border border-border/70 bg-surface-inset px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Enter
                          </kbd>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="premium-border flex items-center justify-between gap-2 border-t bg-surface-inset/40 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <KbdHint label="Up/Down">Navigate</KbdHint>
          <KbdHint label="Enter">Open</KbdHint>
          <KbdHint label="esc">Close</KbdHint>
        </div>
        <span>
          {flatEntries.length} result{flatEntries.length === 1 ? "" : "s"}
        </span>
      </div>
    </>
  );
}

function SectionHeading({ heading }: { heading: string }) {
  const icon =
    heading === "Pinned" ? (
      <Star className="size-3 text-brand-gold" />
    ) : heading === "Recent" ? (
      <Clock className="size-3" />
    ) : heading === "Quick Create" ? (
      <Plus className="size-3" />
    ) : null;
  return (
    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {icon}
      <span>{heading}</span>
    </div>
  );
}

function KbdHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded border border-border/70 bg-surface-panel px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {label}
      </kbd>
      <span>{children}</span>
    </span>
  );
}
