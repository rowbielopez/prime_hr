"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkline, type SparklineProps } from "./sparkline";

export type AnimatedMetricCardProps = {
    label: ReactNode;
    /** Numeric value – animated when it changes. */
    value: number;
    /** Optional unit suffix (e.g. "%", "hrs"). */
    unit?: string;
    /** Number of decimals to format the value with. */
    decimals?: number;
    /** Trend delta in % vs the comparison period. */
    delta?: number;
    /** Override delta direction – defaults to `Math.sign(delta)`. */
    trend?: "up" | "down" | "flat";
    /** Inline sparkline data. */
    spark?: ReadonlyArray<number>;
    sparkTone?: SparklineProps["tone"];
    /** Footnote / context line. */
    caption?: ReactNode;
    className?: string;
    /** When true, larger values count as worse (e.g. attrition). */
    invertTrend?: boolean;
};

/**
 * KPI card with count-up motion on `value` change and a tone-aware delta
 * pill. Falls back to a static value when reduced motion is requested.
 */
export function AnimatedMetricCard({
    label,
    value,
    unit,
    decimals = 0,
    delta,
    trend,
    spark,
    sparkTone = 1,
    caption,
    className,
    invertTrend,
}: AnimatedMetricCardProps) {
    const reduced = useReducedMotion();
    const valueRef = useCountUp(value, { disabled: reduced ?? false, decimals });
    const direction =
        trend ?? (delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat");
    const goodDirection = invertTrend ? "down" : "up";
    const tone =
        direction === "flat"
            ? "neutral"
            : direction === goodDirection
                ? "positive"
                : "negative";

    return (
        <div
            className={cn(
                "apple-panel group relative flex flex-col gap-3 rounded-lg border premium-border p-4 transition-shadow hover-lift",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                {delta != null ? (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                            tone === "positive" && "bg-status-success/12 text-status-success",
                            tone === "negative" && "bg-destructive/12 text-destructive",
                            tone === "neutral" && "bg-muted text-muted-foreground",
                        )}
                    >
                        {direction === "up" ? (
                            <ArrowUpRight className="size-3" />
                        ) : direction === "down" ? (
                            <ArrowDownRight className="size-3" />
                        ) : (
                            <Minus className="size-3" />
                        )}
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                ) : null}
            </div>

            <div className="flex items-end justify-between gap-3">
                <motion.p
                    className="font-heading text-3xl font-semibold leading-none tabular-nums text-foreground"
                    aria-live="polite"
                >
                    <span ref={valueRef}>{value.toFixed(decimals)}</span>
                    {unit ? (
                        <span className="ml-1 text-base font-medium text-muted-foreground">
                            {unit}
                        </span>
                    ) : null}
                </motion.p>
                {spark && spark.length > 1 ? (
                    <Sparkline data={spark} tone={sparkTone} height={36} width={92} />
                ) : null}
            </div>

            {caption ? (
                <p className="text-xs leading-5 text-muted-foreground">{caption}</p>
            ) : null}
        </div>
    );
}

/**
 * Animates a number from its previous render to the new target by writing
 * directly to a DOM ref – avoids per-frame React renders and complies with
 * the `react-hooks/set-state-in-effect` rule.
 */
function useCountUp(
    value: number,
    opts: { disabled?: boolean; duration?: number; decimals?: number },
) {
    const { disabled = false, duration = 600, decimals = 0 } = opts;
    const ref = useRef<HTMLSpanElement>(null);
    const fromRef = useRef<number>(value);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const node = ref.current;
        const from = fromRef.current;
        const to = value;
        if (disabled || !node || from === to) {
            if (node) node.textContent = to.toFixed(decimals);
            fromRef.current = to;
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = from + (to - from) * eased;
            if (node) node.textContent = current.toFixed(decimals);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, [value, disabled, duration, decimals]);

    return ref;
}
