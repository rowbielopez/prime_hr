import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicVacancyBySlug } from "@/features/recruitment/public/repository/public-careers.repository";

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string | string[] }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApplySuccessPage({ params, searchParams }: Props) {
    const [{ slug }, sp] = await Promise.all([params, searchParams]);
    const vacancy = await getPublicVacancyBySlug(slug);
    if (!vacancy) notFound();

    const refRaw = sp.ref;
    const referenceNo = Array.isArray(refRaw) ? refRaw[0] : refRaw;

    return (
        <div className="container mx-auto px-6 lg:px-12 py-16">
            <div className="mx-auto max-w-lg text-center space-y-6">
                {/* Checkmark icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-green-500">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Application received!</h1>
                    <p className="text-muted-foreground">
                        Thank you for applying to{" "}
                        <span className="font-semibold text-foreground">{vacancy.title}</span>.
                    </p>
                </div>

                {referenceNo && (
                    <div className="rounded-xl border border-border/60 bg-surface-raised p-5">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your reference number</p>
                        <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-foreground">{referenceNo}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Keep this number for any follow-up correspondence with the HRMO.
                        </p>
                    </div>
                )}

                <p className="text-sm text-muted-foreground">
                    Our Human Resource Management Office will review your submission. If you are shortlisted,
                    we will contact you using the email or mobile number you provided.
                </p>

                <Link
                    href="/careers"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-surface-raised text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
                >
                    ← Browse other positions
                </Link>
            </div>
        </div>
    );
}
