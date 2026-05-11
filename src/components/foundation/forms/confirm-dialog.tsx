"use client";

import { type ReactElement, type ReactNode } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmDialogVariant = "default" | "destructive";

export type ConfirmDialogProps = {
    /** Controlled open state. Omit to use uncontrolled mode (requires `trigger`). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /**
     * Trigger element for uncontrolled mode. Pass a Button or any clickable
     * element — it will be rendered via DialogTrigger using the `render` prop.
     */
    trigger?: ReactElement;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** "destructive" renders the confirm button with destructive styling. */
    variant?: ConfirmDialogVariant;
    onConfirm: () => void;
    isPending?: boolean;
};

/**
 * Reusable confirmation dialog. Supports both controlled and uncontrolled
 * (trigger-based) usage.
 *
 * Controlled:
 *   <ConfirmDialog open={open} onOpenChange={setOpen} title="…" onConfirm={fn} />
 *
 * Uncontrolled (trigger-based):
 *   <ConfirmDialog
 *     trigger={<Button variant="ghost" size="sm">Remove</Button>}
 *     title="Remove participant?"
 *     variant="destructive"
 *     onConfirm={() => remove(id)}
 *   />
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    onConfirm,
    isPending = false,
}: ConfirmDialogProps) {
    const body: ReactNode = (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description ? (
                    <DialogDescription>{description}</DialogDescription>
                ) : null}
            </DialogHeader>
            <DialogFooter>
                <DialogClose
                    render={
                        <Button type="button" variant="outline" disabled={isPending} />
                    }
                >
                    {cancelLabel}
                </DialogClose>
                <Button
                    type="button"
                    variant={variant === "destructive" ? "destructive" : "default"}
                    disabled={isPending}
                    onClick={onConfirm}
                >
                    {confirmLabel}
                </Button>
            </DialogFooter>
        </DialogContent>
    );

    if (trigger !== undefined) {
        return (
            <Dialog>
                <DialogTrigger render={trigger} />
                {body}
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {body}
        </Dialog>
    );
}
