"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SuccessStateProps = {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
};

/**
 * Confirmation surface for completed flows (submitted application, finalised
 * record). Subtle motion plays once on mount.
 */
export function SuccessState({
    title = "All set",
    description,
    action,
    className,
    compact,
}: SuccessStateProps) {
    const reduced = useReducedMotion();
    return (
        <div
            role="status"
            className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border border-status-success/30 bg-status-success/5 text-center",
                compact ? "px-4 py-6" : "px-6 py-10",
                className,
            )}
        >
            <motion.span
                initial={reduced ? false : { scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex size-10 items-center justify-center rounded-full bg-status-success/15 text-status-success"
            >
                <CheckCircle2 className="size-5" />
            </motion.span>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {description ? (
                    <p className="max-w-md text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {action ? <div className="mt-1">{action}</div> : null}
        </div>
    );
}
