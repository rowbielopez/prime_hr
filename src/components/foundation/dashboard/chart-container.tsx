"use client";

import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type ChartContainerProps = {
    /** Recharts chart element (e.g. `<LineChart>`, `<BarChart>`, etc.). */
    children: React.ReactElement;
    /** Fixed pixel height – defaults to 220. */
    height?: number;
    /** Optional title rendered above the chart. */
    title?: ReactNode;
    /** Optional description displayed under the title. */
    description?: ReactNode;
    /** Optional toolbar slot (filters, range pickers). */
    toolbar?: ReactNode;
    className?: string;
    /** Optional aria-label for screen readers when the chart has no title. */
    ariaLabel?: string;
};

/**
 * Themed wrapper around `recharts.ResponsiveContainer` providing a
 * consistent header/toolbar/aria contract. Dark-mode aware via CSS tokens
 * applied through Tailwind utility classes inside child components.
 */
export function ChartContainer({
    children,
    height = 220,
    title,
    description,
    toolbar,
    className,
    ariaLabel,
}: ChartContainerProps) {
    return (
        <div
            role="figure"
            aria-label={typeof title === "string" ? title : ariaLabel}
            className={cn("flex flex-col gap-3", className)}
        >
            {(title || description || toolbar) ? (
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title ? (
                            <p className="text-sm font-semibold text-foreground">{title}</p>
                        ) : null}
                        {description ? (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        ) : null}
                    </div>
                    {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
                </div>
            ) : null}
            <div style={{ height }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
