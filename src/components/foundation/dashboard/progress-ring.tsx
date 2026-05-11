"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ProgressRingProps = {
    /** Value in 0..1 (or 0..max if `max` is provided). */
    value: number;
    max?: number;
    /** Pixel size of the ring (square). */
    size?: number;
    /** Stroke width in px. */
    thickness?: number;
    /** Tone for the progress arc. */
    tone?: "primary" | "success" | "warning" | "danger" | "info";
    /** Inner content (number, icon, etc.). */
    children?: ReactNode;
    className?: string;
    ariaLabel?: string;
};

const toneStroke = {
    primary: "var(--primary)",
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    danger: "var(--destructive)",
    info: "var(--status-info)",
} as const;

/**
 * Compact circular progress ring. Use for goal/quota completion (training
 * compliance %, recruitment pipeline coverage) where a sparkline doesn't
 * fit the meaning.
 */
export function ProgressRing({
    value,
    max = 1,
    size = 64,
    thickness = 6,
    tone = "primary",
    children,
    className,
    ariaLabel,
}: ProgressRingProps) {
    const reduced = useReducedMotion();
    const ratio = Math.max(0, Math.min(1, value / max));
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - ratio);

    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ariaLabel ?? "Progress"}
            className={cn("relative inline-flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="var(--border)"
                    strokeOpacity={0.6}
                    strokeWidth={thickness}
                    fill="none"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={toneStroke[tone]}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={c}
                    initial={false}
                    animate={{ strokeDashoffset: offset }}
                    transition={
                        reduced
                            ? { duration: 0 }
                            : { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }
                    }
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
                {children ?? `${Math.round(ratio * 100)}%`}
            </div>
        </div>
    );
}
