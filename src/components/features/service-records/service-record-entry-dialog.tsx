"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createServiceRecordAction, updateServiceRecordAction } from "@/features/service-records/service-records.actions";
import type { ServiceRecordEntry, ServiceRecordMutationResult } from "@/features/service-records/types";

type EmployeeScope = {
    employeeId: string;
    employeeName: string;
    employeeNo: string;
    campusId: string;
    campusName: string;
    officeId: string | null;
    officeName: string | null;
    positionTitle: string | null;
    employmentType: string | null;
};

type Draft = {
    dateFrom: string;
    dateTo: string;
    isCurrent: boolean;
    positionTitle: string;
    appointmentStatus: string;
    employmentType: string;
    stationPlace: string;
    branch: string;
    monthlySalary: string;
    salaryGradeStep: string;
    movementType: string;
    separationDate: string;
    separationCause: string;
    leaveWithoutPay: string;
    remarks: string;
};

type Props = {
    employee: EmployeeScope;
    entry?: ServiceRecordEntry | null;
    triggerLabel?: string;
    variant?: "default" | "outline";
};

function toDraft(employee: EmployeeScope, entry?: ServiceRecordEntry | null): Draft {
    return {
        dateFrom: entry?.dateFrom ?? "",
        dateTo: entry?.dateTo ?? "",
        isCurrent: entry?.isCurrent ?? false,
        positionTitle: entry?.positionTitle ?? employee.positionTitle ?? "",
        appointmentStatus: entry?.appointmentStatus ?? "",
        employmentType: entry?.employmentType ?? employee.employmentType ?? "",
        stationPlace: entry?.stationPlace ?? employee.officeName ?? employee.campusName,
        branch: entry?.branch ?? "",
        monthlySalary: entry?.monthlySalary?.toString() ?? "",
        salaryGradeStep: entry?.salaryGradeStep ?? "",
        movementType: entry?.movementType ?? "",
        separationDate: entry?.separationDate ?? "",
        separationCause: entry?.separationCause ?? "",
        leaveWithoutPay: entry?.leaveWithoutPay ?? "",
        remarks: entry?.remarks ?? "",
    };
}

export function ServiceRecordEntryDialog({ employee, entry, triggerLabel, variant = "default" }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => toDraft(employee, entry));
    const [allowOverlap, setAllowOverlap] = useState(false);
    const [isPending, startTransition] = useTransition();
    const isEdit = Boolean(entry);

    useEffect(() => {
        const handle = setTimeout(() => {
            if (!open) return;
            setDraft(toDraft(employee, entry));
            setAllowOverlap(false);
        }, 0);
        return () => clearTimeout(handle);
    }, [employee, entry, open]);

    function setField(key: keyof Draft, value: string | boolean) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    function handleResult(result: ServiceRecordMutationResult) {
        if (!result.ok) {
            if (result.error.includes("overlaps")) setAllowOverlap(true);
            toast.error(result.error);
            return;
        }
        toast.success(result.warning ?? "Service record entry saved successfully.");
        setOpen(false);
        router.refresh();
    }

    function submit() {
        startTransition(async () => {
            const input = {
                id: entry?.id ?? null,
                employeeId: employee.employeeId,
                campusId: employee.campusId,
                officeId: employee.officeId,
                dateFrom: draft.dateFrom,
                dateTo: draft.dateTo || null,
                isCurrent: draft.isCurrent,
                positionTitle: draft.positionTitle,
                appointmentStatus: draft.appointmentStatus || null,
                employmentType: draft.employmentType || null,
                stationPlace: draft.stationPlace || null,
                branch: draft.branch || null,
                monthlySalary: draft.monthlySalary ? Number(draft.monthlySalary) : null,
                salaryGradeStep: draft.salaryGradeStep || null,
                movementType: draft.movementType || null,
                separationDate: draft.separationDate || null,
                separationCause: draft.separationCause || null,
                leaveWithoutPay: draft.leaveWithoutPay || null,
                remarks: draft.remarks || null,
                allowOverlap,
            };
            const result = isEdit && entry
                ? await updateServiceRecordAction(entry.id, input)
                : await createServiceRecordAction(input);
            handleResult(result);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
                {triggerLabel ?? (isEdit ? "Edit Entry" : "Add Entry")}
            </Button>
            <DialogContent size="xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit service record entry" : "Add service record entry"}</DialogTitle>
                    <DialogDescription>
                        Official service records are maintained by HR and are separate from employee-entered PDS work experience.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 overflow-y-auto py-1">
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">{employee.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                            No. {employee.employeeNo} · {employee.campusName}{employee.officeName ? ` / ${employee.officeName}` : ""}
                        </p>
                    </div>

                    {allowOverlap ? (
                        <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            This service period overlaps with an existing record. If HR has reviewed the dates and this is intentional, save again to continue.
                        </div>
                    ) : null}

                    <section className="grid gap-3 md:grid-cols-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="dateFrom">Date From *</Label>
                            <Input id="dateFrom" type="date" value={draft.dateFrom} onChange={(e) => setField("dateFrom", e.target.value)} />
                            <p className="text-xs text-muted-foreground">Start date of this service entry.</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="dateTo">Date To</Label>
                            <Input id="dateTo" type="date" value={draft.isCurrent ? "" : draft.dateTo} disabled={draft.isCurrent} onChange={(e) => setField("dateTo", e.target.value)} />
                            <p className="text-xs text-muted-foreground">Use only if this assignment has ended.</p>
                        </div>
                        <label className="flex items-center gap-2 pt-7 text-sm">
                            <input type="checkbox" className="h-4 w-4" checked={draft.isCurrent} onChange={(e) => setField("isCurrent", e.target.checked)} />
                            Current assignment
                        </label>
                    </section>

                    <section className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="positionTitle">Position / Designation *</Label>
                            <Input id="positionTitle" value={draft.positionTitle} onChange={(e) => setField("positionTitle", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="appointmentStatus">Appointment Status</Label>
                            <Input id="appointmentStatus" value={draft.appointmentStatus} onChange={(e) => setField("appointmentStatus", e.target.value)} placeholder="Permanent, Casual, Contractual" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="employmentType">Employment Type</Label>
                            <Input id="employmentType" value={draft.employmentType} onChange={(e) => setField("employmentType", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="stationPlace">Station / Place of Assignment</Label>
                            <Input id="stationPlace" value={draft.stationPlace} onChange={(e) => setField("stationPlace", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="branch">Branch</Label>
                            <Input id="branch" value={draft.branch} onChange={(e) => setField("branch", e.target.value)} placeholder="National, Local, CSU" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="movementType">Cause / Movement Type</Label>
                            <Input id="movementType" value={draft.movementType} onChange={(e) => setField("movementType", e.target.value)} placeholder="Original, Promotion, Transfer, Separation" />
                        </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="monthlySalary">Monthly Salary</Label>
                            <Input id="monthlySalary" type="number" step="0.01" value={draft.monthlySalary} onChange={(e) => setField("monthlySalary", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="salaryGradeStep">Salary Grade / Step</Label>
                            <Input id="salaryGradeStep" value={draft.salaryGradeStep} onChange={(e) => setField("salaryGradeStep", e.target.value)} placeholder="SG-12 / Step 1" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="leaveWithoutPay">Leave Without Pay</Label>
                            <Input id="leaveWithoutPay" value={draft.leaveWithoutPay} onChange={(e) => setField("leaveWithoutPay", e.target.value)} />
                        </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="separationDate">Separation Date</Label>
                            <Input id="separationDate" type="date" value={draft.separationDate} onChange={(e) => setField("separationDate", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="separationCause">Separation Cause</Label>
                            <Input id="separationCause" value={draft.separationCause} onChange={(e) => setField("separationCause", e.target.value)} />
                        </div>
                        <div className="grid gap-1.5 md:col-span-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <Textarea id="remarks" value={draft.remarks} onChange={(e) => setField("remarks", e.target.value)} placeholder="Brief HR notes or document reference." rows={3} />
                        </div>
                    </section>
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
                    <Button onClick={submit} disabled={isPending}>
                        {isPending ? "Saving…" : allowOverlap ? "Save Anyway" : "Save Entry"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}