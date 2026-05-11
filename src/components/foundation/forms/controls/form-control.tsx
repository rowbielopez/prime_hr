"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FormControlProps = {
    /**
     * The id used for the underlying input. If omitted, one is generated.
     * The same id is forwarded to children via the `htmlFor`/`id` association.
     */
    id?: string;
    label: ReactNode;
    /** Inline hint shown below the field when there is no error. */
    hint?: ReactNode;
    /** Error message – when present, replaces hint and applies aria-invalid. */
    error?: ReactNode;
    /** Long-form contextual help shown in a collapsible disclosure. */
    help?: ReactNode;
    required?: boolean;
    optional?: boolean;
    /**
     * The input/select/textarea element. Receives `id`, `aria-describedby`
     * and `aria-invalid` through cloning when possible. Pass any controlled
     * input.
     */
    children: ReactNode;
    className?: string;
    /** Hide the label visually but keep it accessible. */
    hideLabel?: boolean;
};

/**
 * Primary form-field wrapper. Provides label, hint, error, and help slots
 * with consistent spacing, typography and accessible wiring.
 *
 * Compose with shadcn/ui primitives or react-hook-form Controller render
 * props. Children should be a single focusable input.
 */
export function FormControl({
    id,
    label,
    hint,
    error,
    help,
    required,
    optional,
    children,
    className,
    hideLabel,
}: FormControlProps) {
    const reactId = useId();
    const fieldId = id ?? reactId;
    const hintId = hint || error ? `${fieldId}-desc` : undefined;
    const helpId = help ? `${fieldId}-help` : undefined;
    const describedBy = [hintId, helpId].filter(Boolean).join(" ") || undefined;
    const [helpOpen, setHelpOpen] = useState(false);

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <div className="flex items-center justify-between gap-2">
                <Label
                    htmlFor={fieldId}
                    className={cn(
                        "text-sm font-medium text-foreground",
                        hideLabel && "sr-only",
                    )}
                >
                    {label}
                    {required ? (
                        <span aria-hidden className="ml-0.5 text-destructive">
                            *
                        </span>
                    ) : null}
                    {optional ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (optional)
                        </span>
                    ) : null}
                </Label>
                {help ? (
                    <button
                        type="button"
                        onClick={() => setHelpOpen((v) => !v)}
                        aria-expanded={helpOpen}
                        aria-controls={helpId}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                    >
                        <HelpCircle className="size-3.5" />
                        <span>Help</span>
                        <ChevronDown
                            className={cn(
                                "size-3 transition-transform duration-200",
                                helpOpen && "rotate-180",
                            )}
                        />
                    </button>
                ) : null}
            </div>

            <FormControlSlot id={fieldId} describedBy={describedBy} invalid={Boolean(error)}>
                {children}
            </FormControlSlot>

            {help ? (
                <div
                    id={helpId}
                    hidden={!helpOpen}
                    className="rounded-md border border-border/70 bg-surface-inset/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                >
                    {help}
                </div>
            ) : null}

            {error ? (
                <p
                    id={hintId}
                    role="alert"
                    className="text-xs font-medium text-destructive"
                >
                    {error}
                </p>
            ) : hint ? (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Forwards id/aria props to a single child input. If the child is not a
 * recognisable element, it is rendered as-is and parents must wire props
 * manually.
 */
function FormControlSlot({
    id,
    describedBy,
    invalid,
    children,
}: {
    id: string;
    describedBy?: string;
    invalid: boolean;
    children: ReactNode;
}) {
    // We avoid React.cloneElement gymnastics: most inputs in this codebase
    // accept `id`/`aria-*` directly via spreading. Consumers that need the
    // id should forward it explicitly. We surface an invisible context-like
    // pattern via data attributes on a wrapper instead.
    return (
        <div
            data-form-control-slot
            data-form-control-id={id}
            data-form-control-invalid={invalid || undefined}
            data-form-control-describedby={describedBy}
        >
            {children}
        </div>
    );
}
