"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";
import { Check } from "lucide-react";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";

const areas = [
    {
        name: "Strategic Human Resource Management",
        description:
            "Institutional workforce planning, HR analytics, plantilla management, and policy frameworks.",
    },
    {
        name: "Performance Management & Rewards",
        description:
            "IPCR-aligned evaluations, incentive programs, awards, and recognition system digitalization.",
    },
    {
        name: "Learning & Development",
        description:
            "Training needs analysis, program management, nomination workflows, and individual development plans.",
    },
    {
        name: "Employee Relations",
        description:
            "Grievance tracking, welfare programs, leave management, and workplace relations documentation.",
    },
    {
        name: "HR Efficiency & Effectiveness",
        description:
            "Process digitalization, evidence management, compliance reporting, and institutional HR metrics.",
    },
];

export function PrimeHrmSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useMotionPreference();

    return (
        <section
            id="prime-hrm"
            ref={ref}
            className="py-24 lg:py-32 relative overflow-hidden"
            style={{ background: "oklch(0.11 0.018 22)" }}
        >
            {/* Texture */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                }}
            />
            {/* Ambient glow */}
            <div
                className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle, oklch(0.39 0.13 25 / 0.28), transparent 70%)",
                }}
            />

            <div className="relative z-10 container mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
                    {/* Left: header + badges */}
                    <motion.div
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={scrollRevealTransition}
                    >
                        <p
                            className="text-xs font-semibold uppercase tracking-[0.18em] mb-4"
                            style={{ color: "var(--brand-gold)" }}
                        >
                            PRIME-HRM Framework
                        </p>
                        <h2 className="text-4xl lg:text-[3rem] font-semibold tracking-tight leading-[1.08] text-white mb-6">
                            Built for PRIME-HRM{" "}
                            <span style={{ color: "var(--brand-gold)" }}>Excellence</span>
                        </h2>
                        <p className="text-white/65 text-lg leading-[1.72] mb-10">
                            CSU PRIME-HR is purpose-built around the Civil Service Commission&apos;s
                            PRIME-HRM framework — digitizing every HR sub-system, tracking compliance
                            evidence, and generating audit-ready documentation for all five areas.
                        </p>

                        {/* Level badges */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div
                                className="px-5 py-3 rounded-xl border border-white/15"
                                style={{ background: "oklch(1 0 0 / 0.07)" }}
                            >
                                <div className="text-white text-2xl font-bold leading-none">Level IV</div>
                                <div className="text-white/50 text-[11px] mt-1">PRIME-HRM Target</div>
                            </div>
                            <div
                                className="px-5 py-3 rounded-xl border border-white/15"
                                style={{ background: "oklch(1 0 0 / 0.07)" }}
                            >
                                <div className="text-2xl font-bold leading-none" style={{ color: "var(--brand-gold)" }}>
                                    5
                                </div>
                                <div className="text-white/50 text-[11px] mt-1">HR Sub-Systems</div>
                            </div>
                            <div
                                className="px-5 py-3 rounded-xl border border-white/15"
                                style={{ background: "oklch(1 0 0 / 0.07)" }}
                            >
                                <div className="text-white text-2xl font-bold leading-none">CSC</div>
                                <div className="text-white/50 text-[11px] mt-1">Aligned Framework</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: compliance area list */}
                    <div className="flex flex-col gap-3">
                        {areas.map(({ name, description }, i) => (
                            <motion.div
                                key={name}
                                initial="hidden"
                                animate={isInView ? "visible" : "hidden"}
                                variants={reduceMotion ? undefined : scrollRevealVariants}
                                transition={{ ...scrollRevealTransition, delay: 0.1 + i * 0.07 }}
                                className="flex items-start gap-4 rounded-xl p-4 border border-white/10"
                                style={{ background: "oklch(1 0 0 / 0.05)" }}
                            >
                                <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--brand-gold) 20%, transparent)" }}>
                                    <Check className="w-3 h-3" style={{ color: "var(--brand-gold)" }} />
                                </div>
                                <div>
                                    <div className="font-medium text-white text-sm">{name}</div>
                                    <div className="text-white/55 text-xs mt-1 leading-relaxed">{description}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
