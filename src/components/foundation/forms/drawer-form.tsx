"use client";

import type { ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DrawerFormProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    side?: "right" | "left";
    /** Sheet width preset – defaults to `md` (28rem). */
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
};

const sizeClass: Record<NonNullable<DrawerFormProps["size"]>, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
};

/**
 * Side-panel form for create/edit flows on list pages. Uses shadcn `Sheet`
 * with consistent header/scrolling body/footer layout. Render forms inside
 * `<DrawerForm>`; submit button lives in `footer`.
 */
export function DrawerForm({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    side = "right",
    size = "md",
    className,
}: DrawerFormProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={side}
                className={cn(
                    "flex w-full flex-col gap-0 bg-surface-panel p-0",
                    sizeClass[size],
                    className,
                )}
            >
                <SheetHeader className="border-b border-border/70 px-5 py-4">
                    <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
                    {description ? (
                        <SheetDescription className="text-sm text-muted-foreground">
                            {description}
                        </SheetDescription>
                    ) : null}
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
                {footer ? (
                    <SheetFooter className="mt-0 flex-row items-center justify-end gap-2 border-t border-border/70 bg-surface-inset/40 px-5 py-3">
                        {footer}
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
