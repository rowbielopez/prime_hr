"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import {
    pageTransitionVariants,
    panelVariants,
    premiumSpring,
    premiumTransition,
    staggerContainerVariants,
    staggerItemVariants,
} from "@/components/foundation/motion/presets";
import { cn } from "@/lib/utils";

type MotionPrimitiveProps = HTMLMotionProps<"div"> & {
    children: ReactNode;
};

export function MotionPage({ children, className, ...props }: MotionPrimitiveProps) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={false}
            animate="animate"
            exit={reduceMotion ? undefined : "exit"}
            variants={reduceMotion ? undefined : pageTransitionVariants}
            transition={premiumTransition}
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children, className, ...props }: MotionPrimitiveProps) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={false}
            animate="animate"
            variants={reduceMotion ? undefined : staggerContainerVariants}
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className, ...props }: MotionPrimitiveProps) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            variants={reduceMotion ? undefined : staggerItemVariants}
            transition={premiumTransition}
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function MotionPanel({ children, className, ...props }: MotionPrimitiveProps) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={false}
            animate="animate"
            exit={reduceMotion ? undefined : "exit"}
            variants={reduceMotion ? undefined : panelVariants}
            transition={premiumSpring}
            className={cn("rounded-xl border premium-border bg-surface-panel shadow-premium-sm", className)}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </motion.div>
    );
}