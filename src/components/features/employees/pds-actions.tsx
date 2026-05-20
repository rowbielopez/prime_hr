"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PdsActionsProps {
    employeeId: string;
    canEdit?: boolean;
}

export function PdsActions({ employeeId, canEdit = false }: PdsActionsProps) {
    return (
        <>
            {canEdit && (
                <Link
                    href={`/employees/${employeeId}/pds/edit`}
                    className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                >
                    ✏ Edit PDS
                </Link>
            )}
            <a
                href={`/employees/${employeeId}/pds/download`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
                ⬇ Download Excel
            </a>
            <Link
                href={`/employees/${employeeId}/pds/print`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
                🖨 Print / PDF
            </Link>
        </>
    );
}
