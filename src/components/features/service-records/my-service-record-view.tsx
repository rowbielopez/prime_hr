import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/foundation";
import type { ServiceRecordEmployeeDetail } from "@/features/service-records/types";
import { cn } from "@/lib/utils";

type Props = { detail: ServiceRecordEmployeeDetail };

function formatDate(input: string | null) {
    if (!input) return "—";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function MyServiceRecordView({ detail }: Props) {
    const sortedEntries = [...detail.entries]
        .filter((entry) => !entry.archivedAt)
        .sort((a, b) => {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;
            return new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime();
        });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b"><CardTitle className="text-base">Current Assignment</CardTitle></CardHeader>
                <CardContent className="pt-4">
                    {detail.currentEntry ? (
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                            <Info label="Position" value={detail.currentEntry.positionTitle} />
                            <Info label="Appointment status" value={detail.currentEntry.appointmentStatus} />
                            <Info label="Station / Place" value={detail.currentEntry.stationPlace} />
                            <Info label="Period" value={`${formatDate(detail.currentEntry.dateFrom)} to Present`} />
                        </div>
                    ) : <p className="text-sm text-muted-foreground">No current service record has been posted yet.</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Service History</CardTitle>
                        {sortedEntries.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {sortedEntries.length} {sortedEntries.length === 1 ? "entry" : "entries"} · newest first
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-5">
                    {sortedEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No service record entries found for your account.</p>
                    ) : (
                        <div>
                            {sortedEntries.map((entry, idx) => (
                                <div key={entry.id} className="flex gap-4">
                                    {/* Timeline marker */}
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "relative z-10 mt-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-full",
                                            entry.isCurrent
                                                ? "bg-green-500 ring-2 ring-green-500/25"
                                                : "bg-primary/70 ring-2 ring-primary/20",
                                        )}>
                                            {entry.isCurrent && (
                                                <span className="size-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        {idx < sortedEntries.length - 1 && (
                                            <div className="mt-1 w-px flex-1 bg-border" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={cn("min-w-0 flex-1", idx < sortedEntries.length - 1 ? "pb-6" : "pb-0")}>
                                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold">
                                                {formatDate(entry.dateFrom)} — {entry.isCurrent ? "Present" : formatDate(entry.dateTo)}
                                            </span>
                                            <StatusBadge
                                                tone={entry.isCurrent ? "active" : "info"}
                                                label={entry.isCurrent ? "Current" : "Ended"}
                                            />
                                        </div>

                                        <div className={cn(
                                            "rounded-lg border p-3 text-sm",
                                            entry.isCurrent && "border-green-200 bg-green-50/30",
                                        )}>
                                            <p className="font-medium">{entry.positionTitle}</p>
                                            {(entry.employmentType ?? entry.appointmentStatus) && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {[entry.employmentType, entry.appointmentStatus].filter(Boolean).join(" · ")}
                                                </p>
                                            )}
                                            <p className="mt-2 text-muted-foreground">{entry.stationPlace ?? "No station/place listed"}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b"><CardTitle className="text-base">See something wrong?</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                    <p className="text-muted-foreground">Your service record is managed by HR. If you notice an error, submit a correction request and HR will review it.</p>
                    <Button variant="outline" disabled>Request Correction (coming soon)</Button>
                    <p className="text-xs text-muted-foreground">Correction requests are being prepared in <Link href="/me/requests" className="font-medium underline underline-offset-4">My Requests</Link>.</p>
                </CardContent>
            </Card>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
    return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value || "—"}</p></div>;
}