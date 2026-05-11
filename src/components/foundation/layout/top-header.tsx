"use client";

import type { ReactNode } from "react";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/foundation/theme/theme-toggle";

type TopHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebarCollapsed?: boolean;
  onOpenMobileNav?: () => void;
  onToggleSidebar?: () => void;
  onOpenCommand?: () => void;
};

export function TopHeader({
  title,
  subtitle,
  actions,
  sidebarCollapsed,
  onOpenMobileNav,
  onToggleSidebar,
  onOpenCommand,
}: TopHeaderProps) {
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="apple-toolbar sticky top-0 z-30 border-b premium-border">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <SidebarIcon className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{title ?? "CSU PRIME-HR"}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-10 min-w-[18rem] cursor-pointer items-center gap-2 rounded-lg border premium-border bg-surface-panel/76 px-3 text-sm text-muted-foreground shadow-premium-sm transition-all hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search or run command</span>
          <kbd className="rounded-md border premium-border bg-surface-inset px-1.5 py-0.5 text-[11px] text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
        <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenCommand} aria-label="Open command center">
          <Search className="size-4" />
        </Button>
        <ThemeToggle />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Open notifications">
          <Bell className="size-4" />
        </Button>
        {actions ? <Separator orientation="vertical" className="hidden h-7 md:block" /> : null}
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

