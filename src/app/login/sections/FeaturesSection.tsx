"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";
import {
    Users,
    ShieldCheck,
    Briefcase,
    GraduationCap,
    TrendingUp,
    Award,
    BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";
import { cn } from "@/lib/utils";

interface Feature {
    icon: LucideIcon;
    name: string;
    description: string;
    colorVar: string;
    bgClass: string;
    textClass: string;
}

const features: Feature[] = [
    {
        icon: Users,
        name: "Employee Management",
        description:
            "Comprehensive employee records, plantilla positions, organizational charts, and service histories for the entire university.",
        colorVar: "--module-people",
        bgClass: "bg-module-people/10",
        textClass: "text-module-people",
    },
    {
        icon: ShieldCheck,
        name: "PRIME-HRM Compliance",
        description:
            "Track PRIME-HRM indicators, manage evidence submissions, and maintain audit-ready compliance across all HR sub-systems.",
        colorVar: "--module-compliance",
        bgClass: "bg-module-compliance/10",
        textClass: "text-module-compliance",
    },
    {
        icon: Briefcase,
        name: "Recruitment & Selection",
        description:
            "End-to-end recruitment workflows — from vacancy posting and applicant screening to ranking, interviews, and final selection.",
        colorVar: "--module-recruitment",
        bgClass: "bg-module-recruitment/10",
        textClass: "text-module-recruitment",
    },
    {
        icon: GraduationCap,
        name: "Learning & Development",
        description:
            "Training program management, learning nominations, individual development plans, and organization-wide L&D tracking.",
        colorVar: "--module-learning",
        bgClass: "bg-module-learning/10",
        textClass: "text-module-learning",
    },
    {
        icon: TrendingUp,
        name: "Performance Management",
        description:
            "IPCR-aligned performance monitoring, target-setting, periodic evaluation, and performance rating workflows.",
        colorVar: "--module-performance",
        bgClass: "bg-module-performance/10",
        textClass: "text-module-performance",
    },
    {
        icon: Award,
        name: "Rewards & Recognition",
        description:
            "Recognition programs, service awards, incentive tracking, and outstanding employee management aligned with CSC policy.",
        colorVar: "--module-rewards",
        bgClass: "bg-module-rewards/10",
        textClass: "text-module-rewards",
    },
    {
        icon: BarChart3,
        name: "Analytics & Reports",
        description:
            "Real-time dashboards, cross-module analytics, and audit-ready reports to support data-driven HR decision-making.",
        colorVar: "--brand-maroon",
        bgClass: "bg-brand-maroon/10",
        textClass: "text-brand-maroon",
    },
];

export function FeaturesSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useMotionPreference();

    return (
        <section id="features" ref={ref} className="py-24 lg:py-32 bg-surface-panel">
            <div className="container mx-auto px-6 lg:px-12">
                {/* Section header */}
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={reduceMotion ? undefined : scrollRevealVariants}
                    transition={scrollRevealTransition}
                    className="max-w-2xl mb-14"
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-maroon mb-4">
                        Core Modules
                    </p>
                    <h2 className="text-4xl lg:text-[3rem] font-semibold tracking-tight text-foreground leading-[1.08]">
                        Every HR workflow,{" "}
                        <span className="text-muted-foreground font-normal">fully integrated.</span>
                    </h2>
                    <p className="mt-5 text-muted-foreground text-lg leading-[1.7]">
                        Seven purpose-built modules covering the complete HR lifecycle — from hiring to
                        retirement, from compliance to recognition.
                    </p>
                </motion.div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {features.map((feature, i) => {
                        const Icon = feature.icon;
                        const isLast = i === features.length - 1;
                        return (
                            <motion.div
                                key={feature.name}
                                initial="hidden"
                                animate={isInView ? "visible" : "hidden"}
                                variants={reduceMotion ? undefined : scrollRevealVariants}
                                transition={{ ...scrollRevealTransition, delay: i * 0.055 }}
                                whileHover={
                                    reduceMotion
                                        ? undefined
                                        : { y: -5, transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } }
                                }
                                className={cn(
                                    "group relative rounded-2xl border border-border bg-surface-panel p-6 cursor-default overflow-hidden transition-shadow duration-200 hover:shadow-hover-lift",
                                    isLast && "sm:col-span-2 lg:col-span-1",
                                )}
                            >
                                {/* Hover gradient overlay */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                                    style={{
                                        background: `radial-gradient(ellipse at top left, color-mix(in oklab, var(${feature.colorVar}) 7%, transparent), transparent 65%)`,
                                    }}
                                />

                                {/* Icon circle */}
                                <div
                                    className={cn(
                                        "relative w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110",
                                        feature.bgClass,
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", feature.textClass)} />
                                </div>

                                {/* Text */}
                                <h3 className="relative font-semibold text-foreground text-[0.9rem] mb-2">
                                    {feature.name}
                                </h3>
                                <p className="relative text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Bottom accent line */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: `var(${feature.colorVar})` }}
                                />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
