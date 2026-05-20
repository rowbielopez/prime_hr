"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StickyPageHeaderProps = {
    children: ReactNode;
    className?: string;
    /** Additional classes when the header is in its scrolled/elevated state. */
    scrolledClassName?: string;
    /** Vertical pixel offset before the elevated style is applied. */
    threshold?: number;
};

/**
 * Sticky page header wrapper. Becomes elevated (subtle border + shadow) once
 * the user scrolls past `threshold`. Uses an IntersectionObserver-style
 * sentinel rather than scroll listeners to avoid jank.
 */
export function StickyPageHeader({
    children,
    className,
    scrolledClassName,
    threshold = 8,
}: StickyPageHeaderProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const obs = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) setScrolled(!entry.isIntersecting);
            },
            { rootMargin: `-${threshold}px 0px 0px 0px`, threshold: 0 },
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [threshold]);

    return (
        <>
            <div ref={sentinelRef} aria-hidden className="h-px w-full" />
            <div
                data-scrolled={scrolled || undefined}
                className={cn(
                    "sticky top-0 z-30 -mx-2 -mt-2 bg-surface-canvas/94 px-2 pt-2 pb-3 backdrop-blur-md transition-all duration-150",
                    scrolled
                        ? cn(
                            "border-b premium-border shadow-[0_1px_0_color-mix(in_oklab,var(--border)_62%,transparent)]",
                            scrolledClassName,
                        )
                        : "border-b border-transparent",
                    className,
                )}
            >
                {children}
            </div>
        </>
    );
}
