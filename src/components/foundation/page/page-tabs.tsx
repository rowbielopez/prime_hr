"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PageTabItem = {
    id: string;
    label: ReactNode;
    /** Render as a link – when set, the tab uses `next/link`. */
    href?: string;
    /** Optional small badge/count displayed next to the label. */
    badge?: ReactNode;
    disabled?: boolean;
};

export type PageTabsProps = {
    tabs: ReadonlyArray<PageTabItem>;
    activeId: string;
    onChange?: (id: string) => void;
    className?: string;
    /** Aria label for the tablist; defaults to "Page sections". */
    ariaLabel?: string;
};

/**
 * In-page tabs with an animated underline that slides between the active
 * trigger. Use for sub-routes inside a feature (e.g. employee profile
 * sections). For sub-pages prefer `href`; for in-place views prefer
 * `onChange`.
 */
export function PageTabs({
    tabs,
    activeId,
    onChange,
    className,
    ariaLabel = "Page sections",
}: PageTabsProps) {
    const reduced = useReducedMotion();
    const listRef = useRef<HTMLDivElement>(null);
    const triggerRefs = useRef<Record<string, HTMLElement | null>>({});
    const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        const list = listRef.current;
        const active = triggerRefs.current[activeId];
        if (!list || !active) return;
        const listRect = list.getBoundingClientRect();
        const rect = active.getBoundingClientRect();
        setIndicator({ left: rect.left - listRect.left, width: rect.width });
    }, [activeId, tabs]);

    return (
        <div
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            className={cn(
                "relative inline-flex items-center gap-1 border-b border-border/70",
                className,
            )}
        >
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;
                const sharedClass = cn(
                    "relative inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    tab.disabled && "pointer-events-none opacity-50",
                    "focus-visible:bg-accent",
                );
                const setRef = (node: HTMLElement | null) => {
                    triggerRefs.current[tab.id] = node;
                };
                const content = (
                    <>
                        <span>{tab.label}</span>
                        {tab.badge != null ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {tab.badge}
                            </span>
                        ) : null}
                    </>
                );

                if (tab.href) {
                    return (
                        <Link
                            key={tab.id}
                            ref={setRef as (n: HTMLAnchorElement | null) => void}
                            href={tab.href}
                            role="tab"
                            aria-selected={isActive}
                            aria-disabled={tab.disabled}
                            className={sharedClass}
                        >
                            {content}
                        </Link>
                    );
                }

                return (
                    <button
                        key={tab.id}
                        ref={setRef as (n: HTMLButtonElement | null) => void}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-disabled={tab.disabled}
                        onClick={() => onChange?.(tab.id)}
                        className={sharedClass}
                    >
                        {content}
                    </button>
                );
            })}
            {indicator ? (
                <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-primary"
                    initial={false}
                    animate={{ left: indicator.left, width: indicator.width }}
                    transition={
                        reduced
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 32, mass: 0.7 }
                    }
                />
            ) : null}
        </div>
    );
}
