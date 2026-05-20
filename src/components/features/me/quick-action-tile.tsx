import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    href: string;
    title: string;
    description: string;
    icon: LucideIcon;
    accentClassName?: string;
    disabled?: boolean;
};

export function QuickActionTile({ href, title, description, icon: Icon, accentClassName, disabled }: Props) {
    const content = (
        <div
            className={cn(
                "group/tile flex h-full flex-col gap-3 rounded-lg border border-border/70 bg-card p-4 text-left shadow-premium-sm transition",
                disabled ? "cursor-not-allowed opacity-60" : "hover:border-border hover:shadow-md",
            )}
        >
            <div
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border",
                    accentClassName ?? "bg-muted text-foreground border-border/60",
                )}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{description}</p>
            </div>
            {!disabled ? (
                <div className="mt-auto flex items-center gap-1 text-xs font-medium text-muted-foreground transition group-hover/tile:text-foreground">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
            ) : (
                <div className="mt-auto text-xs font-medium text-muted-foreground">Coming soon</div>
            )}
        </div>
    );

    if (disabled) {
        return <div aria-disabled>{content}</div>;
    }
    return <Link href={href}>{content}</Link>;
}
