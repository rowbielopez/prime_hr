import type { Variants } from "framer-motion";

export const premiumTransition = {
    duration: 0.22,
    ease: [0.2, 0.8, 0.2, 1],
} as const;

export const premiumSpring = {
    type: "spring",
    stiffness: 360,
    damping: 34,
    mass: 0.8,
} as const;

export const pageTransitionVariants: Variants = {
    initial: { opacity: 0, y: 10, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -6, filter: "blur(4px)" },
};

export const staggerContainerVariants: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.045,
            delayChildren: 0.03,
        },
    },
};

export const staggerItemVariants: Variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
};

export const panelVariants: Variants = {
    initial: { opacity: 0, scale: 0.98, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.985, y: 4 },
};

// Landing page scroll-reveal
export const scrollRevealVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0 },
};

export const scrollRevealTransition = {
    duration: 0.52,
    ease: [0.2, 0.8, 0.2, 1],
} as const;