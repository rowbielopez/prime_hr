"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StepperStep = {
    id: string;
    label: string;
    description?: string;
};

export type StepperProps = {
    steps: ReadonlyArray<StepperStep>;
    /** 0-based index of the active step. */
    activeIndex: number;
    /** Optional click handler – allows non-linear navigation. */
    onStepClick?: (index: number) => void;
    className?: string;
    variant?: "horizontal" | "vertical";
};

/**
 * Multi-step indicator for long forms. Renders dots/lines with motion-eased
 * progress, supports horizontal (default) and vertical orientations, and
 * announces step state via aria-current.
 */
export function Stepper({
    steps,
    activeIndex,
    onStepClick,
    className,
    variant = "horizontal",
}: StepperProps) {
    const reduced = useReducedMotion();

    if (variant === "vertical") {
        return (
            <ol className={cn("flex flex-col gap-3", className)}>
                {steps.map((step, idx) => {
                    const state = idx < activeIndex ? "complete" : idx === activeIndex ? "active" : "upcoming";
                    return (
                        <li key={step.id} className="flex gap-3">
                            <StepperDot index={idx} state={state} />
                            <StepperLabel
                                step={step}
                                state={state}
                                index={idx}
                                onClick={onStepClick}
                            />
                        </li>
                    );
                })}
            </ol>
        );
    }

    return (
        <ol
            className={cn(
                "flex w-full items-start gap-1.5",
                className,
            )}
            role="list"
        >
            {steps.map((step, idx) => {
                const state = idx < activeIndex ? "complete" : idx === activeIndex ? "active" : "upcoming";
                return (
                    <li key={step.id} className="flex flex-1 items-start gap-2">
                        <div className="flex flex-col items-center gap-1">
                            <StepperDot index={idx} state={state} />
                            {idx < steps.length - 1 ? (
                                <span className="sr-only" aria-hidden />
                            ) : null}
                        </div>
                        <button
                            type="button"
                            disabled={!onStepClick}
                            onClick={onStepClick ? () => onStepClick(idx) : undefined}
                            aria-current={state === "active" ? "step" : undefined}
                            className={cn(
                                "flex flex-1 flex-col items-start gap-0.5 rounded-md py-0.5 text-left transition-colors",
                                onStepClick && "hover:text-foreground",
                                state === "active" ? "text-foreground" : "text-muted-foreground",
                                state === "complete" && "text-foreground/80",
                                !onStepClick && "cursor-default",
                            )}
                        >
                            <span className="text-xs font-semibold uppercase tracking-wide">
                                {step.label}
                            </span>
                            {step.description ? (
                                <span className="text-xs text-muted-foreground">
                                    {step.description}
                                </span>
                            ) : null}
                        </button>
                        {idx < steps.length - 1 ? (
                            <div className="relative mt-3 h-px flex-1 bg-border/70">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-primary"
                                    initial={false}
                                    animate={{ width: idx < activeIndex ? "100%" : "0%" }}
                                    transition={
                                        reduced
                                            ? { duration: 0 }
                                            : { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }
                                    }
                                />
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

function StepperDot({
    index,
    state,
}: {
    index: number;
    state: "complete" | "active" | "upcoming";
}) {
    return (
        <span
            className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                state === "complete" && "border-primary bg-primary text-primary-foreground",
                state === "active" &&
                "border-primary bg-background text-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]",
                state === "upcoming" && "border-border bg-muted text-muted-foreground",
            )}
            aria-hidden
        >
            {state === "complete" ? <Check className="size-3.5" /> : index + 1}
        </span>
    );
}

function StepperLabel({
    step,
    state,
    index,
    onClick,
}: {
    step: StepperStep;
    state: "complete" | "active" | "upcoming";
    index: number;
    onClick?: (index: number) => void;
}) {
    return (
        <button
            type="button"
            disabled={!onClick}
            onClick={onClick ? () => onClick(index) : undefined}
            aria-current={state === "active" ? "step" : undefined}
            className={cn(
                "flex flex-col items-start gap-0.5 text-left",
                state === "active" ? "text-foreground" : "text-muted-foreground",
                !onClick && "cursor-default",
            )}
        >
            <span className="text-sm font-medium">{step.label}</span>
            {step.description ? (
                <span className="text-xs text-muted-foreground">{step.description}</span>
            ) : null}
        </button>
    );
}
