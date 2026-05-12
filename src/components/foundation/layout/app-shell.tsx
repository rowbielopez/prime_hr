"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/foundation/command/command-palette";
import type { AppNavGroup } from "@/components/foundation/layout/build-app-nav";
import { SidebarNav } from "@/components/foundation/layout/sidebar-nav";
import { TopHeader } from "@/components/foundation/layout/top-header";
import { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";
import { MotionPage } from "@/components/foundation/motion/motion-primitives";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  navGroups: AppNavGroup[];
  headerTitle?: string;
  headerSubtitle?: string;
  headerActions?: ReactNode;
};

function ShellBrand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="relative flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-premium-sm ring-1 ring-primary/15">
        <span className="text-sm font-semibold">PH</span>
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-brand-gold" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">CSU PRIME-HR</p>
        <p className="truncate text-xs text-muted-foreground">
          Executive HR workspace
        </p>
      </div>
    </div>
  );
}

function CollapsedBrand() {
  return (
    <div className="flex justify-center">
      <div
        className="relative flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-premium-sm ring-1 ring-primary/15"
        title="CSU PRIME-HR"
      >
        <span className="text-sm font-semibold">PH</span>
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-brand-gold" />
      </div>
    </div>
  );
}

export function AppShell({
  children,
  navGroups,
  headerTitle = "CSU PRIME-HR",
  headerSubtitle = "Secure, role-based, multi-campus administration",
  headerActions,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    "prime-hr.sidebar.collapsed.v1",
    false,
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const commandItems = useMemo(
    () => navGroups.flatMap((group) => group.items),
    [navGroups],
  );

  function handleNavigate() {
    setMobileOpen(false);
    setCommandOpen(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-surface-canvas">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "hidden border-r premium-border bg-surface-glass/88 shadow-premium-sm backdrop-blur-2xl transition-[width] duration-300 ease-[var(--motion-ease)] md:flex md:flex-col",
            sidebarCollapsed ? "w-[5.5rem]" : "w-[21.5rem]",
          )}
        >
          <div className="px-4 py-5">
            {sidebarCollapsed ? <CollapsedBrand /> : <ShellBrand />}
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            <SidebarNav groups={navGroups} collapsed={sidebarCollapsed} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader
            title={headerTitle}
            subtitle={headerSubtitle}
            actions={headerActions}
            sidebarCollapsed={sidebarCollapsed}
            onOpenMobileNav={() => setMobileOpen(true)}
            onToggleSidebar={() =>
              setSidebarCollapsed((collapsed) => !collapsed)
            }
            onOpenCommand={() => setCommandOpen(true)}
          />
          <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <MotionPage>{children}</MotionPage>
            </div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="glass-panel w-[21rem] border-r premium-border p-0"
        >
          <div className="px-4 py-5">
            <ShellBrand />
          </div>
          <Separator />
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            <SidebarNav groups={navGroups} onNavigate={handleNavigate} />
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
