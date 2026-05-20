"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findPotentialDuplicatesAction } from "@/features/recruitment/applicants/actions";
import type { DuplicateApplicantMatch } from "@/features/recruitment/applicants/types";

type DuplicateApplicantWarningProps = {
    email: string | null;
    mobileNo: string | null;
    excludeApplicantId?: string | null;
};

export function DuplicateApplicantWarning({
    email,
    mobileNo,
    excludeApplicantId,
}: DuplicateApplicantWarningProps) {
    const [matches, setMatches] = useState<DuplicateApplicantMatch[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const trimmedEmail = (email ?? "").trim();
        const trimmedMobile = (mobileNo ?? "").trim();
        if (trimmedEmail.length < 4 && trimmedMobile.length < 7) {
            const handle = setTimeout(() => setMatches([]), 0);
            return () => clearTimeout(handle);
        }
        const handle = setTimeout(async () => {
            setLoading(true);
            const result = await findPotentialDuplicatesAction({
                email: trimmedEmail || null,
                mobileNo: trimmedMobile || null,
                excludeApplicantId: excludeApplicantId ?? null,
            });
            setLoading(false);
            if (result.ok) setMatches(result.matches);
        }, 500);
        return () => clearTimeout(handle);
    }, [email, mobileNo, excludeApplicantId]);

    if (loading) {
        return (
            <p className="text-xs text-muted-foreground">Checking for possible duplicates…</p>
        );
    }
    if (matches.length === 0) return null;

    return (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">Possible duplicate applicants found</p>
            <p className="mt-1 text-xs text-amber-800">
                Review these existing records before creating a new applicant.
            </p>
            <ul className="mt-2 space-y-1">
                {matches.map((match) => (
                    <li key={match.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">
                            <span className="font-medium">{match.fullName}</span>
                            <span className="text-muted-foreground">
                                {match.email ? ` · ${match.email}` : ""}
                                {match.mobileNo ? ` · ${match.mobileNo}` : ""}
                                {` · ${match.status}`}
                            </span>
                        </span>
                        <Link
                            href={`/recruitment/applicants/${match.id}`}
                            className="shrink-0 text-amber-900 underline"
                        >
                            View
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
