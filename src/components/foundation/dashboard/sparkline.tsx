"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type SparklineProps = {
    /** Numeric series. Each value is a single point. */
    data: ReadonlyArray<number>;
    /** Visual tone / colour bucket (defaults to `1`). */
    tone?: 1 | 2 | 3 | 4 | 5;
    /** Pixel height – defaults to 32. */
    height?: number;
    /** Pixel width – defaults to 100% of the parent. */
    width?: number | string;
    className?: string;
    ariaLabel?: string;
};

const toneVar = {
    1: "var(--spark-1)",
    2: "var(--spark-2)",
    3: "var(--spark-3)",
    4: "var(--spark-4)",
    5: "var(--spark-5)",
} as const;

/**
 * Tiny inline area chart for trend hints inside KPI cards and lists. Keeps
 * the same axis-less visual everywhere and uses the sparkline palette.
 */
export function Sparkline({
    data,
    tone = 1,
    height = 32,
    width = "100%",
    className,
    ariaLabel = "Trend",
}: SparklineProps) {
    const series = data.map((value, idx) => ({ idx, value }));
    const id = `spark-${tone}`;
    return (
        <div
            role="img"
            aria-label={ariaLabel}
            className={cn("inline-flex", className)}
            style={{ width, height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 1, bottom: 1, left: 0, right: 0 }}>
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={toneVar[tone]} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={toneVar[tone]} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={toneVar[tone]}
                        strokeWidth={1.5}
                        fill={`url(#${id})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
