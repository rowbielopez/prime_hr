export function CareersHero({ count }: { count: number }) {
    return (
        <section className="relative overflow-hidden">
            {/* Background gradient matching CSU maroon branding */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(140deg, oklch(0.35 0.12 22) 0%, oklch(0.22 0.09 20) 60%, oklch(0.14 0.05 20) 100%)",
                }}
            />
            {/* Dot grid texture */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, oklch(1 0 0 / 0.08) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />
            {/* Ambient glow */}
            <div
                className="absolute -top-20 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
                style={{
                    background: "radial-gradient(circle, oklch(0.55 0.13 22 / 0.25), transparent 70%)",
                }}
            />

            <div className="relative z-10 container mx-auto px-6 lg:px-12 py-20 lg:py-28">
                <div className="max-w-3xl flex flex-col gap-6">
                    {/* Eyebrow */}
                    <span className="inline-flex w-fit items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase border border-white/20 text-white/70 bg-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Now Hiring
                    </span>

                    {/* Headline */}
                    <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">
                        Join Cagayan State University
                    </h1>
                    <p className="text-base lg:text-lg text-white/60 max-w-xl leading-relaxed">
                        Explore career opportunities across all CSU campuses. No account required — apply directly
                        from this page.
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-6 pt-2">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white tabular-nums">{count}</span>
                            <span className="text-xs text-white/50 uppercase tracking-wide mt-0.5">
                                {count === 1 ? "Open Position" : "Open Positions"}
                            </span>
                        </div>
                        <div className="w-px bg-white/10 self-stretch" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white">∞</span>
                            <span className="text-xs text-white/50 uppercase tracking-wide mt-0.5">
                                Career Pathways
                            </span>
                        </div>
                        <div className="w-px bg-white/10 self-stretch" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white">0</span>
                            <span className="text-xs text-white/50 uppercase tracking-wide mt-0.5">
                                Account Needed
                            </span>
                        </div>
                    </div>

                    {/* CTA */}
                    <a
                        href="#positions"
                        className="inline-flex w-fit items-center gap-2 mt-2 px-5 py-2.5 rounded-lg bg-white text-[oklch(0.3_0.1_22)] text-sm font-semibold transition-opacity hover:opacity-90"
                    >
                        View open positions
                        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
                            <path d="M7 2v10M3.5 8.5L7 12l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
