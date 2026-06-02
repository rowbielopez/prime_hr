import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Careers — CSU PRIME-HR",
    description:
        "Explore current job opportunities at Cagayan State University and apply online through CSU PRIME-HR.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-surface-canvas">
            {/* ── Navbar ── */}
            <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between gap-8 px-6 lg:px-12">
                    {/* Brand */}
                    <Link href="/careers" className="flex items-center gap-2.5 flex-shrink-0">
                        <Image
                            src="/600x600 CSU Logo.png"
                            alt="Cagayan State University"
                            width={28}
                            height={28}
                            className="object-contain"
                            priority
                        />
                        <div className="leading-none">
                            <div className="text-sm font-semibold text-foreground tracking-tight">CSU PRIME-HR</div>
                            <div className="text-[10px] text-muted-foreground hidden sm:block">Careers Portal</div>
                        </div>
                    </Link>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Link
                            href="/careers"
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-raised transition-all duration-150"
                        >
                            Open Positions
                        </Link>
                    </nav>

                    {/* CTA */}
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface-raised text-sm font-medium text-foreground hover:bg-surface-hover transition-all duration-150 flex-shrink-0"
                    >
                        Staff Login
                        <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3">
                            <path d="M2 7h10M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="flex-1">{children}</main>

            {/* ── Footer ── */}
            <footer className="border-t border-border bg-surface-panel">
                <div className="container mx-auto px-6 lg:px-12 py-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <Image
                                src="/600x600 CSU Logo.png"
                                alt="CSU"
                                width={22}
                                height={22}
                                className="object-contain opacity-70"
                            />
                            <div>
                                <p className="text-sm font-medium text-foreground">Cagayan State University</p>
                                <p className="text-xs text-muted-foreground">PRIME-HR Careers Portal</p>
                            </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Employment opportunities posted in accordance with the CSC Merit Selection Plan.</p>
                            <p>Personal data processed under R.A. 10173 (Data Privacy Act of 2012) for recruitment purposes only.</p>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                        <p>© {new Date().getFullYear()} Cagayan State University. All rights reserved.</p>
                        <Link href="/login" className="hover:text-foreground transition-colors">Staff Login →</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
