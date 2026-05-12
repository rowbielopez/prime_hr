"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Database, GitBranch, LineChart } from "lucide-react";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";

const pillars = [
    {
        icon: Database,
        title: "Centralized Records",
        description:
            "A single source of truth for all employee data — contracts, qualifications, service history, and compliance documents, accessible across every campus.",
    },
    {
        icon: GitBranch,
        title: "Process Automation",
        description:
            "Eliminate manual paperwork and redundant workflows. Automate approvals, notifications, and status transitions across all HR modules.",
    },
    {
        icon: LineChart,
        title: "Data-Driven Decisions",
        description:
            "Real-time dashboards and audit-ready reports that transform HR data into actionable intelligence for university leadership.",
    },
];

export function TransformSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useReducedMotion();

    return (
        <section ref={ref} className="py-24 lg:py-32 bg-surface-inset">
            <div className="container mx-auto px-6 lg:px-12">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={reduceMotion ? undefined : scrollRevealVariants}
                    transition={scrollRevealTransition}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-maroon mb-4">
                        Digital Transformation
                    </p>
                    <h2 className="text-4xl lg:text-[3rem] font-semibold tracking-tight text-foreground leading-[1.08]">
                        Digital-first HR for <span className="text-brand-maroon">CSU</span>
                    </h2>
                    <p className="mt-5 text-muted-foreground text-lg leading-[1.7]">
                        PRIME-HR replaces fragmented manual processes with a unified digital framework
                        — reducing errors, saving time, and ensuring full institutional accountability.
                    </p>
                </motion.div>

                {/* Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
                    {pillars.map(({ icon: Icon, title, description }, i) => (
                        <motion.div
                            key={title}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                            variants={reduceMotion ? undefined : scrollRevealVariants}
                            transition={{ ...scrollRevealTransition, delay: i * 0.11 }}
                            className="flex flex-col items-center text-center gap-5"
                        >
                            {/* Icon container */}
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-brand-maroon/10 border border-brand-maroon/20 flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-brand-maroon" />
                                </div>
                                {/* Connector line (desktop only, between pillars) */}
                                {i < pillars.length - 1 && (
                                    <div className="hidden md:block absolute top-1/2 left-full w-[calc(100%_+_4rem)] h-px bg-gradient-to-r from-border to-transparent -translate-y-1/2 translate-x-4 pointer-events-none" />
                                )}
                            </div>

                            {/* Step number */}
                            <div className="text-[10px] font-semibold tracking-[0.16em] uppercase text-brand-maroon/60">
                                Step {String(i + 1).padStart(2, "0")}
                            </div>

                            <div>
                                <h3 className="font-semibold text-foreground text-lg mb-3">{title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
