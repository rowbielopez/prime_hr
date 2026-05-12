"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LandingNav() {
    const [scrolled, setScrolled] = useState(false);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <motion.header
            initial={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled
                    ? "glass-panel border-b border-border/50"
                    : "bg-transparent",
            )}
        >
            <div className="container mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-8">
                {/* Logo */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-premium-sm">
                        <svg viewBox="0 0 14 14" fill="none" className="w-4 h-4 text-primary-foreground">
                            <path d="M7 2L11 5.5V9L7 12L3 9V5.5L7 2Z" fill="currentColor" opacity="0.9" />
                            <path d="M7 4.5L9.5 6.5V8.5L7 10L4.5 8.5V6.5L7 4.5Z" fill="currentColor" opacity="0.4" />
                        </svg>
                    </div>
                    <div className="leading-none">
                        <div className="text-sm font-semibold text-foreground tracking-tight">CSU PRIME-HR</div>
                        <div className="text-[10px] text-muted-foreground hidden sm:block">Cagayan State University</div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="hidden md:flex items-center gap-1">
                    {[
                        { label: "Platform", href: "#about" },
                        { label: "Modules", href: "#features" },
                        { label: "PRIME-HRM", href: "#prime-hrm" },
                    ].map(({ label, href }) => (
                        <a
                            key={label}
                            href={href}
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-raised transition-all duration-150"
                        >
                            {label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <a
                    href="#sign-in"
                    className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all duration-200 hover:opacity-90 hover:-translate-y-px shadow-premium-sm flex-shrink-0"
                >
                    Sign In
                    <svg
                        viewBox="0 0 14 14"
                        fill="none"
                        className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                        <path
                            d="M2 7h10M8 3.5L11.5 7 8 10.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </a>
            </div>
        </motion.header>
    );
}
