"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/foundation";
import { ServiceRecordEntryDialog } from "@/components/features/service-records/service-record-entry-dialog";
import { archiveServiceRecordAction } from "@/features/service-records/service-records.actions";
import type { ServiceRecordEmployeeDetail, ServiceRecordEntry } from "@/features/service-records/types";
import { cn } from "@/lib/utils";

type Props = {
    detail: ServiceRecordEmployeeDetail;
    canEdit: boolean;
};

function formatDate(input: string | null) {
    if (!input) return "—";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function formatMoney(input: number | null) {
    if (input === null) return "—";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(input);
}

function value(input: string | null | undefined) {
    return input && input.length > 0 ? input : "—";
}

export function ServiceRecordDetailManagement({ detail, canEdit }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const employeeScope = {
        employeeId: detail.employee.id,
        employeeName: detail.employee.fullName,
        employeeNo: detail.employee.employeeNo,
        campusId: detail.employee.campusId,
        campusName: detail.employee.campusName,
        officeId: detail.employee.officeId,
        officeName: detail.employee.officeName,
        positionTitle: detail.employee.positionTitle,
        employmentType: detail.employee.employmentType,
    };

    function archiveEntry(entry: ServiceRecordEntry) {
        if (!confirm("Archive this service record entry? This keeps the audit trail and removes it from active records.")) return;
        startTransition(async () => {
            const result = await archiveServiceRecordAction(entry.id);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success("Service record entry archived successfully.");
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle className="text-base">{detail.employee.fullName}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                No. {detail.employee.employeeNo} · {detail.employee.campusName}{detail.employee.officeName ? ` / ${detail.employee.officeName}` : ""}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/service-records/${detail.employee.id}/print`} target="_blank" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                                <Printer className="size-4" /> Print Service Record
                            </Link>
                            {canEdit ? <ServiceRecordEntryDialog employee={employeeScope} triggerLabel="Add Entry" /> : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-3 pt-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <Info label="Current position" value={detail.employee.positionTitle} />
                    <Info label="Employment status" value={detail.employee.employmentStatus.replace("_", " ")} />
                    <Info label="Employment type" value={detail.employee.employmentType} />
                    <Info label="Date hired" value={formatDate(detail.employee.dateHired)} />
                </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
                <Card>
                    <CardHeader className="border-b"><CardTitle className="text-base">Current Assignment</CardTitle></CardHeader>
                    <CardContent className="pt-4">
                        {detail.currentEntry ? (
                            <div className="grid gap-3 text-sm md:grid-cols-2">
                                <Info label="Position / Designation" value={detail.currentEntry.positionTitle} />
                                <Info label="Appointment status" value={detail.currentEntry.appointmentStatus} />
                                <Info label="Station / Place" value={detail.currentEntry.stationPlace} />
                                <Info label="Period" value={`${formatDate(detail.currentEntry.dateFrom)} to Present`} />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No current service record has been marked yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b"><CardTitle className="text-base">Record Quality Checks</CardTitle></CardHeader>
                    <CardContent className="space-y-2 pt-4">
                        {detail.warnings.length === 0 ? (
                            <div className="flex items-center gap-2"><StatusBadge tone="active" label="Ready" /><span className="text-sm text-muted-foreground">No issues detected.</span></div>
                        ) : (
                            detail.warnings.map((warning) => (
                                <div key={warning.key} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    <p className="font-medium">{warning.label}</p>
                                    <p className="text-xs">{warning.description}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader className="border-b"><CardTitle className="text-base">Service Record Timeline</CardTitle></CardHeader>
                <CardContent className="pt-4">
                    {detail.entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No service record entries found for this employee.</p>
                    ) : (
                        <div className="space-y-3">
                            {detail.entries.map((entry) => (
                                <div key={entry.id} className="rounded-lg border p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">{entry.positionTitle}</p>
                                                <StatusBadge tone={entry.archivedAt ? "inactive" : entry.isCurrent ? "active" : "info"} label={entry.archivedAt ? "Archived" : entry.isCurrent ? "Current" : "Ended"} />
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">{formatDate(entry.dateFrom)} to {entry.isCurrent ? "Present" : formatDate(entry.dateTo)}</p>
                                        </div>
                                        {canEdit && !entry.archivedAt ? (
                                            <div className="flex flex-wrap gap-2">
                                                <ServiceRecordEntryDialog employee={employeeScope} entry={entry} triggerLabel="Edit" variant="outline" />
                                                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:text-destructive" disabled={isPending} onClick={() => archiveEntry(entry)}>
                                                    Archive
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                                        <Info label="Appointment status" value={entry.appointmentStatus} />
                                        <Info label="Salary" value={formatMoney(entry.monthlySalary)} />
                                        <Info label="SG / Step" value={entry.salaryGradeStep} />
                                        <Info label="Station / Place" value={entry.stationPlace} />
                                        <Info label="Branch" value={entry.branch} />
                                        <Info label="Movement / Cause" value={entry.movementType} />
                                        <Info label="LWOP" value={entry.leaveWithoutPay} />
                                        <Info label="Separation" value={entry.separationDate ? `${formatDate(entry.separationDate)} · ${value(entry.separationCause)}` : "—"} />
                                        <Info label="Remarks" value={entry.remarks} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function Info({ label, value: input }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium capitalize">{value(input)}</p>
        </div>
    );
}