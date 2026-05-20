"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";

interface CountUpProps {
    target: number;
    suffix?: string;
    isInView: boolean;
}

function CountUp({ target, suffix = "", isInView }: CountUpProps) {
    const [count, setCount] = useState(0);
    const reduceMotion = useMotionPreference();

    useEffect(() => {
        if (!isInView) return;
        if (reduceMotion) {
            startTransition(() => setCount(target));
            return;
        }
        let current = 0;
        const steps = 55;
        const duration = 1400;
        const increment = target / steps;
        const intervalMs = duration / steps;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, intervalMs);
        return () => clearInterval(timer);
    }, [isInView, target, reduceMotion]);

    return (
        <>
            {count}
            {suffix}
        </>
    );
}

const stats = [
    {
        value: 7,
        suffix: "",
        label: "Core HR Modules",
        description: "End-to-end workflows in one system",
    },
    {
        value: 100,
        suffix: "%",
        label: "PRIME-HRM Aligned",
        description: "Full compliance framework support",
    },
    {
        value: 10,
        suffix: "+",
        label: "CSU Campuses",
        description: "University-wide coverage",
    },
    {
        value: 97,
        suffix: "%",
        label: "Digitized Processes",
        description: "Paperless HR operations",
    },
];

export function IntroSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useMotionPreference();

    return (
        <section id="about" ref={ref} className="py-24 lg:py-32 bg-surface-canvas">
            <div className="container mx-auto px-6 lg:px-12">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={reduceMotion ? undefined : scrollRevealVariants}
                    transition={scrollRevealTransition}
                    className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-maroon mb-4">
                        The Platform
                    </p>
                    <h2 className="text-4xl lg:text-[3rem] font-semibold tracking-tight text-foreground leading-[1.08]">
                        One platform.{" "}
                        <span className="text-muted-foreground font-normal">Every HR workflow.</span>
                        <br />
                        All campuses.
                    </h2>
                    <p className="mt-6 text-muted-foreground text-lg leading-[1.7] max-w-2xl mx-auto">
                        CSU PRIME-HR consolidates human resource management into a single, intelligent
                        platform — streamlining processes, ensuring compliance, and empowering every HR
                        stakeholder across the university.
                    </p>
                </motion.div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {stats.map(({ value, suffix, label, description }, i) => (
                        <motion.div
                            key={label}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                            variants={reduceMotion ? undefined : scrollRevealVariants}
                            transition={{ ...scrollRevealTransition, delay: i * 0.09 }}
                            className="apple-panel rounded-2xl border border-border p-6 lg:p-8"
                        >
                            <div className="text-4xl lg:text-5xl font-semibold text-brand-maroon tracking-tight leading-none">
                                <CountUp target={value} suffix={suffix} isInView={isInView} />
                            </div>
                            <div className="mt-3 font-medium text-foreground text-sm">{label}</div>
                            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {description}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
