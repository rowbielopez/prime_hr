"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";

const stats = [
    {
        value: "10+",
        label: "CSU Campuses",
        description: "System-wide coverage",
    },
    {
        value: "7",
        label: "HR Modules",
        description: "Fully integrated",
    },
    {
        value: "5",
        label: "PRIME-HRM Areas",
        description: "All sub-systems covered",
    },
    {
        value: "24/7",
        label: "Cloud Available",
        description: "Access anywhere, anytime",
    },
];

export function StatsSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useMotionPreference();

    return (
        <section ref={ref} className="py-16 lg:py-20 bg-surface-canvas border-y border-border">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
                    {stats.map(({ value, label, description }, i) => (
                        <motion.div
                            key={label}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                            variants={reduceMotion ? undefined : scrollRevealVariants}
                            transition={{ ...scrollRevealTransition, delay: i * 0.08 }}
                            className="flex flex-col items-center text-center px-6 py-8 lg:py-4"
                        >
                            <div className="text-4xl lg:text-5xl font-semibold text-brand-maroon tracking-tight leading-none">
                                {value}
                            </div>
                            <div className="mt-2.5 font-medium text-foreground text-sm">{label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{description}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
