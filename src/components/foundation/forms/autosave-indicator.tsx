"use client";

import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type AutosaveIndicatorProps = {
    status: AutosaveStatus;
    /** Timestamp of the last successful save; rendered relative if provided. */
    savedAt?: Date | null;
    /** Optional retry handler shown when status is `error`. */
    onRetry?: () => void;
    className?: string;
};

const labels: Record<AutosaveStatus, string> = {
    idle: "All changes saved",
    saving: "Saving…",
    saved: "Saved",
    error: "Couldn’t save changes",
};

/**
 * Compact autosave status pill. Pair with a debounced submit hook on long
 * forms (employee profile, performance record, evidence intake).
 */
export function AutosaveIndicator({
    status,
    savedAt,
    onRetry,
    className,
}: AutosaveIndicatorProps) {
    const reduced = useReducedMotion();
    const time = savedAt ? formatRelative(savedAt) : null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "inline-flex items-center gap-2 text-xs font-medium",
                status === "error" ? "text-destructive" : "text-muted-foreground",
                className,
            )}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={status}
                    initial={reduced ? false : { opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: 2 }}
                    transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                    className="inline-flex items-center gap-1.5"
                    suppressHydrationWarning
                >
                    {status === "saving" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : status === "saved" || status === "idle" ? (
                        <Check className="size-3.5 text-status-success" />
                    ) : (
                        <AlertTriangle className="size-3.5" />
                    )}
                    <span>{labels[status]}</span>
                </motion.span>
            </AnimatePresence>
            {status !== "saving" && time ? (
                <span className="text-muted-foreground/80">· {time}</span>
            ) : null}
            {status === "error" && onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    className="ml-1 inline-flex items-center gap-1 rounded-md border border-destructive/40 px-1.5 py-0.5 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                    <RefreshCw className="size-3" /> Retry
                </button>
            ) : null}
        </div>
    );
}

function formatRelative(date: Date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 5) return "just now";
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}
