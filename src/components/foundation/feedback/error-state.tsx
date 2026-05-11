"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorStateProps = {
    title?: ReactNode;
    description?: ReactNode;
    /** Optional retry handler – renders a primary button. */
    onRetry?: () => void;
    retryLabel?: string;
    /** Additional action (e.g. "Contact support") rendered as ghost button. */
    secondaryAction?: ReactNode;
    className?: string;
    /** Compact variant for inline panels. */
    compact?: boolean;
};

/**
 * Full-width error placeholder for failed loads. Use inside a panel/card
 * boundary; pair with `EmptyState` for empty data and `Skeleton` for
 * pending data.
 */
export function ErrorState({
    title = "Something went wrong",
    description = "We couldn’t load this content. Please try again.",
    onRetry,
    retryLabel = "Try again",
    secondaryAction,
    className,
    compact,
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 text-center",
                compact ? "px-4 py-6" : "px-6 py-10",
                className,
            )}
        >
            <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
            </span>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="max-w-md text-sm text-muted-foreground">{description}</p>
            </div>
            {(onRetry || secondaryAction) ? (
                <div className="mt-1 flex items-center gap-2">
                    {onRetry ? (
                        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                            <RefreshCw className="size-3.5" />
                            {retryLabel}
                        </Button>
                    ) : null}
                    {secondaryAction}
                </div>
            ) : null}
        </div>
    );
}
