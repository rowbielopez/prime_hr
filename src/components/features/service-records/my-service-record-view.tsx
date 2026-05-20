import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/foundation";
import type { ServiceRecordEmployeeDetail } from "@/features/service-records/types";

type Props = { detail: ServiceRecordEmployeeDetail };

function formatDate(input: string | null) {
    if (!input) return "—";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function MyServiceRecordView({ detail }: Props) {
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
                <CardHeader className="border-b"><CardTitle className="text-base">Service History</CardTitle></CardHeader>
                <CardContent className="pt-4">
                    {detail.entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No service record entries found for your account.</p>
                    ) : (
                        <div className="space-y-3">
                            {detail.entries.filter((entry) => !entry.archivedAt).map((entry) => (
                                <div key={entry.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">{entry.positionTitle}</p>
                                        <StatusBadge tone={entry.isCurrent ? "active" : "info"} label={entry.isCurrent ? "Current" : "Ended"} />
                                    </div>
                                    <p className="mt-1 text-muted-foreground">{formatDate(entry.dateFrom)} to {entry.isCurrent ? "Present" : formatDate(entry.dateTo)}</p>
                                    <p className="mt-2 text-muted-foreground">{entry.stationPlace ?? "No station/place listed"}</p>
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