"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ActivityFeedItem = {
    id: string;
    /** Short summary line; usually starts with the actor. */
    title: ReactNode;
    /** Optional secondary description. */
    description?: ReactNode;
    /** Timestamp – string already formatted, or a Date. */
    timestamp: string | Date;
    /** Icon node rendered inside the dot. */
    icon?: ReactNode;
    /** Tone for the dot bullet. */
    tone?: "neutral" | "info" | "success" | "warning" | "danger";
    /** Optional href – when set, the row is a link. */
    href?: string;
};

export type ActivityFeedProps = {
    items: ReadonlyArray<ActivityFeedItem>;
    className?: string;
    /** Renders the dot timeline rail when true (default). */
    showRail?: boolean;
    /** Optional empty-state node. */
    emptyState?: ReactNode;
};

const toneClass = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-status-info/15 text-status-info",
    success: "bg-status-success/15 text-status-success",
    warning: "bg-status-warning/15 text-status-warning",
    danger: "bg-destructive/15 text-destructive",
} as const;

/**
 * Vertical activity timeline. Use for module dashboards (recent hires,
 * upcoming reviews, audit events). Items are not virtualised – cap to ~30
 * and link to the full audit page for the rest.
 */
export function ActivityFeed({
    items,
    className,
    showRail = true,
    emptyState,
}: ActivityFeedProps) {
    const reduced = useReducedMotion();
    if (items.length === 0 && emptyState) return <>{emptyState}</>;

    return (
        <ol className={cn("relative flex flex-col gap-4", className)}>
            {showRail ? (
                <span
                    aria-hidden
                    className="pointer-events-none absolute top-2 bottom-2 left-[11px] w-px bg-border/60"
                />
            ) : null}
            {items.map((item, idx) => {
                const tone = item.tone ?? "neutral";
                const ts =
                    typeof item.timestamp === "string"
                        ? item.timestamp
                        : item.timestamp.toLocaleString();
                const inner = (
                    <motion.div
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: reduced ? 0 : 0.22,
                            ease: [0.2, 0.8, 0.2, 1],
                            delay: reduced ? 0 : idx * 0.03,
                        }}
                        className="flex gap-3"
                    >
                        <span
                            className={cn(
                                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-panel shadow-premium-sm",
                                toneClass[tone],
                            )}
                            aria-hidden
                        >
                            {item.icon}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="text-sm font-medium leading-5 text-foreground">{item.title}</p>
                            {item.description ? (
                                <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                            ) : null}
                            <p className="text-[11px] text-muted-foreground/80">{ts}</p>
                        </div>
                    </motion.div>
                );
                return (
                    <li key={item.id}>
                        {item.href ? (
                            <a
                                href={item.href}
                                className="-m-1 block rounded-md p-1 transition-colors hover:bg-accent/40"
                            >
                                {inner}
                            </a>
                        ) : (
                            inner
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
