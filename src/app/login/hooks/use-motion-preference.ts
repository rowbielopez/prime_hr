"use client";

/**
 * Returns whether animations should be reduced on the login page.
 *
 * Always returns false so that:
 * 1. Server and client first render agree → no React hydration mismatch.
 * 2. All `animate` props always resolve to a visible final state → no elements
 *    stuck at opacity 0.
 *
 * Note: prefers-reduced-motion is intentionally not honoured here because the
 * login page uses subtle opacity/translate transitions that are safe for most
 * users. Honouring it via useReducedMotion() caused a two-phase render where
 * animate became `undefined` after mount, reverting every element back to its
 * `initial: { opacity: 0 }` state (visible as a completely faded/blank page).
 */
export function useMotionPreference(): boolean {
    return false;
}
