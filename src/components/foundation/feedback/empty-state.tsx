import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, className, icon }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-surface-panel p-8 text-center shadow-premium-sm",
        className,
      )}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden />
      <div className="mx-auto flex min-h-48 max-w-md flex-col items-center justify-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl border premium-border bg-surface-inset text-muted-foreground shadow-premium-sm">
          {icon ?? <SearchX className="size-5" aria-hidden />}
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

