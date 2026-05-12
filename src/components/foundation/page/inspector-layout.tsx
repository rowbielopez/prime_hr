"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type InspectorLayoutProps = {
    /** Primary content (list, form, dashboard). */
    children: ReactNode;
    /** Inspector content – when null/undefined the panel is collapsed. */
    inspector?: ReactNode;
    /** Title shown in the inspector header. */
    inspectorTitle?: ReactNode;
    /** Optional close handler – renders an `X` close button when provided. */
    onClose?: () => void;
    className?: string;
    /** Inspector width preset. */
    inspectorWidth?: "sm" | "md" | "lg";
};

const widthClass = {
    sm: "lg:w-80",
    md: "lg:w-96",
    lg: "lg:w-[28rem]",
} as const;

/**
 * Two-pane layout: main content on the left, inspector drawer on the right.
 * On large screens the inspector docks beside the main content; on smaller
 * viewports it overlays the page.
 */
export function InspectorLayout({
    children,
    inspector,
    inspectorTitle,
    onClose,
    className,
    inspectorWidth = "md",
}: InspectorLayoutProps) {
    const reduced = useReducedMotion();
    const open = Boolean(inspector);

    return (
        <div className={cn("relative flex flex-col gap-4 lg:flex-row lg:items-start", className)}>
            <div className="min-w-0 flex-1">{children}</div>
            <AnimatePresence initial={false}>
                {open ? (
                    <motion.aside
                        key="inspector"
                        initial={reduced ? false : { opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
                        transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        suppressHydrationWarning
                        className={cn(
                            "sticky top-4 hidden shrink-0 self-start rounded-xl border border-border/70 bg-surface-panel shadow-premium-sm lg:block",
                            widthClass[inspectorWidth],
                        )}
                        aria-label="Inspector"
                    >
                        <InspectorChrome title={inspectorTitle} onClose={onClose}>
                            {inspector}
                        </InspectorChrome>
                    </motion.aside>
                ) : null}
            </AnimatePresence>
            {/* Mobile overlay */}
            <AnimatePresence>
                {open ? (
                    <motion.div
                        key="mobile-inspector"
                        initial={reduced ? false : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                        transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        suppressHydrationWarning
                        className="fixed inset-x-2 bottom-2 z-40 max-h-[80vh] overflow-hidden rounded-xl border border-border/80 bg-surface-panel shadow-premium-lg lg:hidden"
                    >
                        <InspectorChrome title={inspectorTitle} onClose={onClose}>
                            <div className="max-h-[60vh] overflow-y-auto">{inspector}</div>
                        </InspectorChrome>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function InspectorChrome({
    title,
    onClose,
    children,
}: {
    title?: ReactNode;
    onClose?: () => void;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col">
            {(title || onClose) ? (
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                    {title ? (
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                    ) : <span />}
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close inspector"
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <span aria-hidden>✕</span>
                        </button>
                    ) : null}
                </div>
            ) : null}
            <div className="px-4 py-4">{children}</div>
        </div>
    );
}
