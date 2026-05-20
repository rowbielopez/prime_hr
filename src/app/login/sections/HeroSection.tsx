"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMotionPreference } from "@/app/login/hooks/use-motion-preference";
import { ArrowRight, Users, BarChart3, ShieldCheck } from "lucide-react";
import {
    staggerContainerVariants,
    staggerItemVariants,
    premiumSpring,
    premiumTransition,
} from "@/components/foundation/motion/presets";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
    onSignIn: () => void;
    isLoading: boolean;
}

const mockRows = [
    { label: "Employee Records", width: "85%" },
    { label: "Compliance Documents", width: "72%" },
    { label: "Training Completions", width: "91%" },
];

const mockBars = [35, 55, 42, 78, 58, 90, 64];

export function HeroSection({ onSignIn, isLoading }: HeroSectionProps) {
    const reduceMotion = useMotionPreference();

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden">
            {/* ── Background ── */}
            <div className="absolute inset-0 bg-surface-canvas" />

            {/* Dot grid */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, color-mix(in oklab, var(--border) 80%, transparent) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                    opacity: 0.45,
                }}
            />

            {/* Ambient glow — maroon */}
            <div
                className="absolute -top-24 -right-24 w-[680px] h-[680px] rounded-full blur-[120px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle, color-mix(in oklab, var(--brand-maroon) 22%, transparent), transparent 70%)",
                }}
            />
            {/* Ambient glow — gold */}
            <div
                className="absolute bottom-16 right-1/3 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle, color-mix(in oklab, var(--brand-gold) 18%, transparent), transparent 70%)",
                }}
            />

            {/* ── Content ── */}
            <div className="relative z-10 container mx-auto px-6 lg:px-12 pt-28 pb-16 lg:pt-36">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-14 lg:gap-20 items-center">

                    {/* Left column */}
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={reduceMotion ? undefined : staggerContainerVariants}
                        className="flex flex-col gap-7"
                    >
                        {/* Eyebrow badge */}
                        <motion.div
                            variants={reduceMotion ? undefined : staggerItemVariants}
                            transition={premiumTransition}
                        >
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase border border-brand-maroon/25 text-brand-maroon bg-brand-maroon/5">
                                <Image
                                    src="/600x600 CSU Logo.png"
                                    alt="Cagayan State University logo"
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                />
                                Cagayan State University · PRIME-HRM
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            variants={reduceMotion ? undefined : staggerItemVariants}
                            transition={premiumTransition}
                            className="text-[2.6rem] lg:text-[3.4rem] xl:text-[4rem] font-semibold tracking-[-0.03em] text-foreground leading-[1.07]"
                        >
                            Transforming Human Resource{" "}
                            <span className="text-brand-maroon">Management</span> for a Smarter CSU
                        </motion.h1>

                        {/* Sub */}
                        <motion.p
                            variants={reduceMotion ? undefined : staggerItemVariants}
                            transition={premiumTransition}
                            className="text-[1.05rem] text-muted-foreground leading-[1.72] max-w-[520px]"
                        >
                            A centralized HRIS platform powering PRIME-HRM excellence, digital
                            compliance tracking, and intelligent workforce management across all
                            CSU campuses.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            variants={reduceMotion ? undefined : staggerItemVariants}
                            transition={premiumTransition}
                            className="flex flex-col sm:flex-row gap-3 pt-1"
                        >
                            <button
                                onClick={onSignIn}
                                disabled={isLoading}
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-premium-md hover:shadow-premium-lg hover:-translate-y-0.5 hover:opacity-95"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                        Redirecting...
                                    </>
                                ) : (
                                    <>
                                        Sign In with CSU Account
                                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                            <a
                                href="#features"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground/80 font-medium text-sm hover:bg-surface-raised hover:text-foreground transition-all duration-200 cursor-pointer"
                            >
                                Explore Modules
                            </a>
                        </motion.div>

                        {/* Trust note */}
                        <motion.p
                            variants={reduceMotion ? undefined : staggerItemVariants}
                            transition={premiumTransition}
                            className="text-xs text-muted-foreground/60"
                        >
                            Restricted to authorized @csu.edu.ph accounts · Role-verified access
                        </motion.p>
                    </motion.div>

                    {/* ── Right column: faux dashboard ── */}
                    <motion.div
                        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ ...premiumSpring, delay: 0.28 }}
                        className="relative hidden lg:flex items-center justify-center"
                    >
                        {/* Dashboard card */}
                        <div className="relative w-full max-w-[400px] rounded-2xl border border-border bg-surface-panel shadow-premium-lg overflow-hidden">
                            {/* Browser chrome bar */}
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface-inset">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-brand-gold/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-success/50" />
                                </div>
                                <div className="flex-1 h-5 rounded-md bg-surface-panel/80 flex items-center px-2.5">
                                    <span className="text-[10px] text-muted-foreground/70 font-mono">
                                        prime-hr.csu.edu.ph
                                    </span>
                                </div>
                            </div>

                            {/* Dashboard body */}
                            <div className="p-5">
                                {/* Page header row */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="text-xs font-semibold text-foreground">HR Overview</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Academic Year 2025–2026
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold">
                                        97% Compliant
                                    </div>
                                </div>

                                {/* Stat tiles */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {[
                                        { label: "Employees", val: "284", color: "text-module-people", bg: "bg-module-people/10" },
                                        { label: "Pending", val: "12", color: "text-status-warning", bg: "bg-status-warning/10" },
                                        { label: "Modules", val: "7", color: "text-brand-maroon", bg: "bg-brand-maroon/10" },
                                    ].map(({ label, val, color, bg }) => (
                                        <div key={label} className={cn("rounded-xl p-3", bg)}>
                                            <div className={cn("text-xl font-bold leading-none", color)}>{val}</div>
                                            <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress rows */}
                                <div className="space-y-2.5 mb-4">
                                    {mockRows.map(({ label, width }) => (
                                        <div key={label} className="flex items-center gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-surface-inset flex-shrink-0" />
                                            <div className="flex-1">
                                                <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                                                <div className="h-1.5 rounded-full bg-surface-inset overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-brand-maroon/45"
                                                        style={{ width }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mini bar chart */}
                                <div className="flex items-end gap-1 h-10">
                                    {mockBars.map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-sm"
                                            style={{
                                                height: `${h}%`,
                                                background:
                                                    i === 5
                                                        ? "var(--brand-maroon)"
                                                        : "color-mix(in oklab, var(--brand-maroon) 28%, transparent)",
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Floating chip — compliance */}
                        <motion.div
                            animate={
                                reduceMotion
                                    ? undefined
                                    : {
                                        y: [-5, 5, -5],
                                        transition: { repeat: Infinity, duration: 3.8, ease: "easeInOut" },
                                    }
                            }
                            className="absolute -left-12 top-[18%] glass-panel rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-premium-md"
                        >
                            <div className="w-7 h-7 rounded-full bg-module-compliance/15 flex items-center justify-center flex-shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-module-compliance" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-foreground leading-none">
                                    PRIME-HRM Ready
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">Compliance tracking</div>
                            </div>
                        </motion.div>

                        {/* Floating chip — employees */}
                        <motion.div
                            animate={
                                reduceMotion
                                    ? undefined
                                    : {
                                        y: [5, -5, 5],
                                        transition: { repeat: Infinity, duration: 4.6, ease: "easeInOut" },
                                    }
                            }
                            className="absolute -right-10 top-[32%] glass-panel rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-premium-md"
                        >
                            <div className="w-7 h-7 rounded-full bg-module-people/15 flex items-center justify-center flex-shrink-0">
                                <Users className="w-3.5 h-3.5 text-module-people" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-foreground leading-none">
                                    284 Active Records
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">University workforce</div>
                            </div>
                        </motion.div>

                        {/* Floating chip — analytics */}
                        <motion.div
                            animate={
                                reduceMotion
                                    ? undefined
                                    : {
                                        y: [0, 7, 0],
                                        transition: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
                                    }
                            }
                            className="absolute -right-6 bottom-[18%] glass-panel rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-premium-md"
                        >
                            <div className="w-7 h-7 rounded-full bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-3.5 h-3.5 text-brand-gold" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-foreground leading-none">Live Analytics</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">Real-time insights</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none"
            >
                <div className="text-[9px] font-medium tracking-[0.22em] uppercase text-muted-foreground/40">
                    Scroll
                </div>
                <motion.div
                    animate={
                        reduceMotion
                            ? undefined
                            : { y: [0, 4, 0], opacity: [0.35, 0.7, 0.35] }
                    }
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    className="w-4 h-4 text-muted-foreground/35"
                >
                    <svg viewBox="0 0 16 16" fill="none">
                        <path
                            d="M8 3v10M4 9l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </motion.div>
            </motion.div>
        </section>
    );
}
