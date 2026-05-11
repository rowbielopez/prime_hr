"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineAlertTone = "info" | "success" | "warning" | "danger";

export type InlineAlertProps = {
    tone?: InlineAlertTone;
    title?: ReactNode;
    children?: ReactNode;
    /** Optional action node rendered on the right (button/link). */
    action?: ReactNode;
    /** When provided, an `X` button is rendered to dismiss the alert. */
    onDismiss?: () => void;
    className?: string;
    icon?: ReactNode;
};

const toneClass: Record<InlineAlertTone, string> = {
    info: "border-status-info/40 bg-status-info/8 text-foreground",
    success: "border-status-success/40 bg-status-success/8 text-foreground",
    warning: "border-status-warning/50 bg-status-warning/10 text-foreground",
    danger: "border-destructive/45 bg-destructive/8 text-foreground",
};

const toneIconClass: Record<InlineAlertTone, string> = {
    info: "text-status-info",
    success: "text-status-success",
    warning: "text-status-warning",
    danger: "text-destructive",
};

const toneIcon: Record<InlineAlertTone, ReactNode> = {
    info: <Info className="size-4" />,
    success: <CheckCircle2 className="size-4" />,
    warning: <AlertTriangle className="size-4" />,
    danger: <ShieldAlert className="size-4" />,
};

/**
 * Subtle in-page alert. Use for non-blocking guidance ("3 fields are
 * pending review") rather than transient toasts. For destructive
 * confirmation, use the toast tone variants.
 */
export function InlineAlert({
    tone = "info",
    title,
    children,
    action,
    onDismiss,
    icon,
    className,
}: InlineAlertProps) {
    return (
        <div
            role={tone === "danger" ? "alert" : "status"}
            className={cn(
                "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm",
                toneClass[tone],
                className,
            )}
        >
            <span className={cn("mt-0.5 shrink-0", toneIconClass[tone])} aria-hidden>
                {icon ?? toneIcon[tone]}
            </span>
            <div className="flex-1 space-y-0.5">
                {title ? <p className="font-semibold leading-snug">{title}</p> : null}
                {children ? (
                    <div className="text-sm leading-snug text-foreground/80">{children}</div>
                ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
            {onDismiss ? (
                <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={onDismiss}
                    className="shrink-0 rounded-md p-1 text-current/70 transition-colors hover:bg-current/10 hover:text-current"
                >
                    <X className="size-3.5" />
                </button>
            ) : null}
        </div>
    );
}
