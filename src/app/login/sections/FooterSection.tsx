export function FooterSection() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-surface-panel border-t border-border">
            <div className="container mx-auto px-6 lg:px-12 py-14 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 pb-10 border-b border-border">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-premium-sm">
                                <svg
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    className="w-3.5 h-3.5 text-primary-foreground"
                                >
                                    <path
                                        d="M7 2L11 5.5V9L7 12L3 9V5.5L7 2Z"
                                        fill="currentColor"
                                        opacity="0.9"
                                    />
                                    <path
                                        d="M7 4.5L9.5 6.5V8.5L7 10L4.5 8.5V6.5L7 4.5Z"
                                        fill="currentColor"
                                        opacity="0.35"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-foreground tracking-tight">
                                CSU PRIME-HR
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
                            A modern HRIS and PRIME-HRM support platform for Cagayan State University
                            — digitizing HR excellence across all campuses.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-maroon/25 bg-brand-maroon/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon" />
                            <span className="text-[10px] font-semibold text-brand-maroon tracking-wider uppercase">
                                PRIME-HRM Aligned
                            </span>
                        </div>
                    </div>

                    {/* Modules */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-5">
                            Core Modules
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                "Employee Management",
                                "PRIME-HRM Compliance",
                                "Recruitment & Selection",
                                "Learning & Development",
                                "Performance Management",
                                "Rewards & Recognition",
                                "Analytics & Reports",
                            ].map((item) => (
                                <li key={item}>
                                    <span className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-default">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-5">
                            Support
                        </h4>
                        <ul className="space-y-2.5 mb-6">
                            <li>
                                <span className="text-sm text-muted-foreground">Central HR Office</span>
                            </li>
                            <li>
                                <span className="text-sm text-muted-foreground">
                                    HRMO — Cagayan State University
                                </span>
                            </li>
                            <li>
                                <span className="text-sm text-muted-foreground font-medium">
                                    hr-support@csu.edu.ph
                                </span>
                            </li>
                        </ul>
                        <div className="p-3.5 rounded-xl bg-surface-inset border border-border">
                            <div className="text-xs text-muted-foreground">
                                For technical support, contact your
                            </div>
                            <div className="text-xs font-medium text-foreground mt-0.5">
                                Campus HR Officer or MIS Office
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        © {year} Cagayan State University. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        CSU PRIME-HR · PRIME-HRM Digital Platform · v1.0
                    </p>
                </div>
            </div>
        </footer>
    );
}
