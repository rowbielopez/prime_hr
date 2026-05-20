"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { scrollRevealVariants, scrollRevealTransition } from "@/components/foundation/motion/presets";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";

export function CtaSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useMotionPreference();

    return (
        <section ref={ref} className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(140deg, oklch(0.38 0.14 24) 0%, oklch(0.26 0.10 22) 60%, oklch(0.14 0.06 20) 100%)",
                }}
            />
            {/* Dot texture */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, oklch(1 0 0 / 0.06) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                }}
            />
            {/* Glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[80px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse, oklch(0.6 0.14 24 / 0.3), transparent 70%)",
                }}
            />

            <div className="relative z-10 container mx-auto px-6 lg:px-12 text-center">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
                    <motion.p
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={scrollRevealTransition}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50"
                    >
                        Get Started
                    </motion.p>

                    <motion.h2
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={{ ...scrollRevealTransition, delay: 0.07 }}
                        className="text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.08]"
                    >
                        Ready to modernize CSU&apos;s HR?
                    </motion.h2>

                    <motion.p
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={{ ...scrollRevealTransition, delay: 0.14 }}
                        className="text-white/70 text-lg leading-[1.7]"
                    >
                        Sign in with your authorized CSU Google Workspace account to access the
                        platform. Authentication is validated against your assigned role, campus, and
                        office.
                    </motion.p>

                    <motion.div
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={{ ...scrollRevealTransition, delay: 0.21 }}
                        className="flex flex-col sm:flex-row gap-3 pt-2"
                    >
                        <a
                            href="#sign-in"
                            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-brand-maroon font-semibold text-sm hover:bg-white/95 transition-all duration-200 shadow-premium-lg hover:-translate-y-0.5 cursor-pointer"
                        >
                            Sign In with CSU Account
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </a>
                    </motion.div>

                    <motion.p
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        variants={reduceMotion ? undefined : scrollRevealVariants}
                        transition={{ ...scrollRevealTransition, delay: 0.28 }}
                        className="text-white/40 text-xs"
                    >
                        Restricted to authorized @csu.edu.ph accounts
                    </motion.p>
                </div>
            </div>
        </section>
    );
}
