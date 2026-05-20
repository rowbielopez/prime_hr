import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentSectionProps = {
    children: ReactNode;
    className?: string;
    header?: ReactNode;
    footer?: ReactNode;
    size?: "default" | "compact";
};

export function ContentSection({
    children,
    className,
    header,
    footer,
    size = "default",
}: ContentSectionProps) {
    return (
        <section
            className={cn(
                "content-section overflow-hidden text-sm text-card-foreground",
                className,
            )}
        >
            {header ? (
                <div
                    className={cn(
                        "border-b border-border/70",
                        size === "compact" ? "px-3 py-2" : "px-4 py-3",
                    )}
                >
                    {header}
                </div>
            ) : null}
            <div className={cn(size === "compact" ? "p-3" : "p-4")}>{children}</div>
            {footer ? (
                <div
                    className={cn(
                        "border-t border-border/70 bg-muted/35",
                        size === "compact" ? "px-3 py-2" : "px-4 py-3",
                    )}
                >
                    {footer}
                </div>
            ) : null}
        </section>
    );
}