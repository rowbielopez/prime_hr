"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
    scrollRevealVariants,
    scrollRevealTransition,
    panelVariants,
    premiumSpring,
} from "@/components/foundation/motion/presets";

const errorMessages: Record<string, string> = {
    unauthorized_domain:
        "Unauthorized account. Please sign in using an authorized CSU email domain.",
    unverified_email:
        "Your Google account email is not verified. Please verify your email and try again.",
    invalid_hosted_domain:
        "Your Google Workspace hosted domain is not allowed for this system.",
    access_pending:
        "Your account is pending administrator approval. Please contact Central HR or your campus HR officer.",
    unauthorized_access:
        "Your account is not yet authorized for this system. Please request role and campus assignment.",
    ambiguous_employee_match:
        "Multiple employee records found for your email. Contact HR support for account linking.",
    profile_resolution_failed:
        "Unable to resolve your local profile. Please contact system support.",
    oauth_exchange_failed:
        "Google sign-in exchange failed. Please try again or contact system support.",
    oauth_code_missing:
        "Missing OAuth callback code. Please restart sign-in from the login page.",
    oauth_user_read_failed:
        "Unable to read your signed-in Google account profile. Please try again.",
    session_reset_failed:
        "Sign-out after an authorization failure did not complete cleanly. Please close this browser and sign in again.",
};

function getErrorMessage(error?: string): string | undefined {
    if (!error) return undefined;
    return errorMessages[error] ?? error;
}

function GoogleIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
            <path
                d="M21.35 11.1H12v2.98h5.36c-.23 1.48-1.72 4.33-5.36 4.33-3.22 0-5.84-2.67-5.84-5.96 0-3.3 2.62-5.97 5.84-5.97 1.84 0 3.07.79 3.78 1.47l2.58-2.5C16.7 3.92 14.57 3 12 3 6.96 3 2.88 7.03 2.88 12s4.08 9 9.12 9c5.26 0 8.74-3.69 8.74-8.88 0-.6-.07-1.02-.14-1.42Z"
                fill="currentColor"
            />
        </svg>
    );
}

interface LoginSectionProps {
    error?: string;
    nextPath?: string;
    isLoading: boolean;
    onSignIn: () => void;
}

export function LoginSection({ error, isLoading, onSignIn }: LoginSectionProps) {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const reduceMotion = useReducedMotion();
    const errorMessage = getErrorMessage(error);

    return (
        <section id="sign-in" ref={ref} className="py-24 lg:py-32 bg-surface-canvas">
            <div className="container mx-auto px-6 lg:px-12 flex flex-col items-center">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    variants={reduceMotion ? undefined : scrollRevealVariants}
                    transition={scrollRevealTransition}
                    className="text-center mb-10"
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-maroon mb-3">
                        Secure Access
                    </p>
                    <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                        Sign in to continue
                    </h2>
                    <p className="mt-3 text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
                        Access your CSU PRIME-HR dashboard with your authorized Google Workspace
                        account.
                    </p>
                </motion.div>

                {/* Auth card */}
                <motion.div
                    initial="initial"
                    animate={isInView ? "animate" : "initial"}
                    variants={reduceMotion ? undefined : panelVariants}
                    transition={premiumSpring}
                    className="w-full max-w-sm glass-panel rounded-2xl p-8 border border-border/50"
                >
                    {/* Wordmark */}
                    <div className="flex items-center gap-2.5 mb-7">
                        <div className="w-8 h-8 rounded-xl bg-primary shadow-premium-sm flex items-center justify-center">
                            <svg viewBox="0 0 14 14" fill="none" className="w-4.5 h-4.5 text-primary-foreground">
                                <path d="M7 2L11 5.5V9L7 12L3 9V5.5L7 2Z" fill="currentColor" opacity="0.9" />
                                <path d="M7 4.5L9.5 6.5V8.5L7 10L4.5 8.5V6.5L7 4.5Z" fill="currentColor" opacity="0.35" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground leading-none">
                                CSU PRIME-HR
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                Cagayan State University
                            </div>
                        </div>
                    </div>

                    {/* Error banner */}
                    {errorMessage ? (
                        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive leading-snug">
                            {errorMessage}
                        </div>
                    ) : null}

                    {/* Google sign-in button */}
                    <button
                        onClick={onSignIn}
                        disabled={isLoading}
                        className="group w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-surface-raised text-foreground text-sm font-medium hover:bg-surface-panel hover:border-brand-maroon/35 hover:-translate-y-px transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-premium-sm hover:shadow-hover-lift"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                                <span>Redirecting to Google...</span>
                            </>
                        ) : (
                            <>
                                <GoogleIcon />
                                <span>Continue with CSU Google Account</span>
                            </>
                        )}
                    </button>

                    {/* Helper */}
                    <div className="mt-5 space-y-1.5 text-xs text-muted-foreground text-center">
                        <p>
                            Restricted to{" "}
                            <span className="font-medium text-foreground/70">@csu.edu.ph</span> accounts.
                        </p>
                        <p>
                            Your role, campus, and office assignment will be verified upon login.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
