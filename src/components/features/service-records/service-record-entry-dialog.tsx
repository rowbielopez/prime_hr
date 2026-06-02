"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createServiceRecordAction, updateServiceRecordAction } from "@/features/service-records/service-records.actions";
import type { ServiceRecordEntry, ServiceRecordMutationResult } from "@/features/service-records/types";

// ---------------------------------------------------------------------------
// Preset option arrays — last item is always the "other" free-text sentinel
// ---------------------------------------------------------------------------

const APPOINTMENT_STATUS_OPTIONS = [
    { value: "Permanent", label: "Permanent" },
    { value: "Temporary", label: "Temporary" },
    { value: "Casual", label: "Casual" },
    { value: "Contractual", label: "Contractual" },
    { value: "Job Order (JO)", label: "Job Order (JO)" },
    { value: "Contract of Service (COS)", label: "Contract of Service (COS)" },
    { value: "Coterminous", label: "Coterminous" },
    { value: "other", label: "Other (specify below)…" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
    { value: "Permanent", label: "Permanent" },
    { value: "Temporary", label: "Temporary" },
    { value: "Casual", label: "Casual" },
    { value: "Contractual", label: "Contractual" },
    { value: "Contract of Service (COS)", label: "Contract of Service (COS)" },
    { value: "Job Order (JO)", label: "Job Order (JO)" },
    { value: "Coterminous", label: "Coterminous" },
    { value: "other", label: "Other (specify below)…" },
];

const BRANCH_OPTIONS = [
    { value: "National Government", label: "National Government" },
    { value: "Local Government", label: "Local Government" },
    { value: "Government-Owned or Controlled Corporation (GOCC)", label: "Government-Owned or Controlled Corporation (GOCC)" },
    { value: "State Colleges and Universities (SUC)", label: "State Colleges and Universities (SUC)" },
    { value: "Constitutional Offices", label: "Constitutional Offices" },
    { value: "other", label: "Other (specify below)…" },
];

const MOVEMENT_TYPE_OPTIONS = [
    { value: "Original Appointment", label: "Original Appointment" },
    { value: "Promotion", label: "Promotion" },
    { value: "Transfer", label: "Transfer" },
    { value: "Reinstatement", label: "Reinstatement" },
    { value: "Reemployment", label: "Reemployment" },
    { value: "Reappointment", label: "Reappointment" },
    { value: "Demotion", label: "Demotion" },
    { value: "Step Increment", label: "Step Increment" },
    { value: "Salary Adjustment", label: "Salary Adjustment" },
    { value: "Separation", label: "Separation" },
    { value: "other", label: "Other (specify below)…" },
];

const SEPARATION_CAUSE_OPTIONS = [
    { value: "Resignation", label: "Resignation" },
    { value: "Compulsory Retirement", label: "Compulsory Retirement" },
    { value: "Optional Retirement", label: "Optional Retirement" },
    { value: "End of Contract", label: "End of Contract" },
    { value: "Expiration of Appointment", label: "Expiration of Appointment" },
    { value: "Dropped from the Rolls", label: "Dropped from the Rolls" },
    { value: "Death", label: "Death" },
    { value: "Dismissal", label: "Dismissal" },
    { value: "Transfer to Another Agency", label: "Transfer to Another Agency" },
    { value: "other", label: "Other (specify below)…" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPLOYMENT_TYPE_LABEL_MAP: Record<string, string> = {
    permanent: "Permanent",
    temporary: "Temporary",
    casual: "Casual",
    contractual: "Contractual",
    cos: "Contract of Service (COS)",
    jo: "Job Order (JO)",
    coterminous: "Coterminous",
};

/** Maps the employee table's lowercase codes to the human-readable labels used in service records. */
function normalizeEmploymentType(raw: string | null): string {
    if (!raw) return "";
    return EMPLOYMENT_TYPE_LABEL_MAP[raw.toLowerCase()] ?? raw;
}

// ---------------------------------------------------------------------------
// ComboField — Select with preset options + free-text Input when "other" is chosen.
// Follows the same pattern as the separation reason field in employee-form-fields.tsx.
// ---------------------------------------------------------------------------

type ComboFieldOption = { value: string; label: string };

type ComboFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: ComboFieldOption[];
    placeholder?: string;
    helper?: string;
};

function ComboField({ label, value, onChange, options, placeholder, helper }: ComboFieldProps) {
    const presetValues = new Set(options.map((o) => o.value).filter((v) => v !== "other"));
    const selectKey = value === "" ? "__none__" : presetValues.has(value) ? value : "other";

    return (
        <div className="grid gap-1.5">
            <Label>{label}</Label>
            <Select
                value={selectKey}
                onValueChange={(v) => {
                    if (v === null) return;
                    if (v === "__none__") {
                        onChange("");
                    } else if (v === "other") {
                        // Keep existing custom text if already in free-text mode; otherwise clear to let user type
                        onChange(presetValues.has(value) || value === "" ? "" : value);
                    } else {
                        onChange(v);
                    }
                }}
            >
                <SelectTrigger className="w-full">
                    <SelectValue>
                        {selectKey === "__none__"
                            ? <span className="text-muted-foreground">{placeholder ?? "Select or specify"}</span>
                            : (options.find((o) => o.value === selectKey)?.label ?? selectKey)
                        }
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectKey === "other" && (
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type the value…"
                />
            )}
            {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
        employmentType: entry?.employmentType ?? normalizeEmploymentType(employee.employmentType),
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

    function fillFromCurrentAssignment() {
        setDraft((prev) => ({
            ...prev,
            positionTitle: employee.positionTitle ?? prev.positionTitle,
            employmentType: normalizeEmploymentType(employee.employmentType),
            stationPlace: employee.officeName ?? employee.campusName,
            isCurrent: true,
            dateTo: "",
        }));
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
            <DialogContent size="xl" className="grid-rows-[auto_1fr_auto]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit service record entry" : "Add service record entry"}</DialogTitle>
                    <DialogDescription>
                        Official service records are maintained by HR and are separate from employee-entered PDS work experience.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-5 overflow-y-auto py-1">

                    {/* Employee identity */}
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">{employee.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                            No. {employee.employeeNo} · {employee.campusName}{employee.officeName ? ` / ${employee.officeName}` : ""}
                        </p>
                    </div>

                    {/* Current assignment pre-fill shortcut */}
                    {employee.positionTitle ? (
                        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current profile assignment</p>
                                    <p className="truncate text-sm font-medium">{employee.positionTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {normalizeEmploymentType(employee.employmentType) || "—"}
                                        {" · "}
                                        {employee.officeName ?? employee.campusName}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 text-xs"
                                    onClick={fillFromCurrentAssignment}
                                >
                                    Pre-fill
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {/* Overlap warning */}
                    {allowOverlap ? (
                        <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            This service period overlaps with an existing record. If HR has reviewed the dates and this is intentional, save again to continue.
                        </div>
                    ) : null}

                    {/* ── Period ── */}
                    <section>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</p>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="dateFrom">Date From *</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={draft.dateFrom}
                                    onChange={(e) => setField("dateFrom", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Start date of this service entry.</p>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="dateTo">Date To</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={draft.isCurrent ? "" : draft.dateTo}
                                    disabled={draft.isCurrent}
                                    onChange={(e) => setField("dateTo", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Leave blank for current assignments.</p>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="isCurrent">Current assignment</Label>
                                <div className={cn(
                                    "flex h-8 items-center gap-2.5 rounded-lg border px-3 text-sm transition-colors",
                                    draft.isCurrent
                                        ? "border-green-300 bg-green-50 text-green-800"
                                        : "border-input",
                                )}>
                                    <Switch
                                        id="isCurrent"
                                        checked={draft.isCurrent}
                                        onCheckedChange={(checked) => {
                                            setField("isCurrent", checked);
                                            if (checked) setField("dateTo", "");
                                        }}
                                    />
                                    <span className="text-xs font-medium">
                                        {draft.isCurrent ? "Yes — still serving" : "No — ended"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Position & Appointment ── */}
                    <section>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Position &amp; Appointment</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="positionTitle">Position / Designation *</Label>
                                <Input
                                    id="positionTitle"
                                    value={draft.positionTitle}
                                    onChange={(e) => setField("positionTitle", e.target.value)}
                                    placeholder="e.g., Administrative Officer II"
                                />
                            </div>
                            <ComboField
                                label="Appointment Status"
                                value={draft.appointmentStatus}
                                onChange={(v) => setField("appointmentStatus", v)}
                                options={APPOINTMENT_STATUS_OPTIONS}
                                placeholder="Select status"
                            />
                            <ComboField
                                label="Employment Type"
                                value={draft.employmentType}
                                onChange={(v) => setField("employmentType", v)}
                                options={EMPLOYMENT_TYPE_OPTIONS}
                                placeholder="Select type"
                            />
                            <div className="grid gap-1.5">
                                <Label htmlFor="stationPlace">Station / Place of Assignment</Label>
                                <Input
                                    id="stationPlace"
                                    value={draft.stationPlace}
                                    onChange={(e) => setField("stationPlace", e.target.value)}
                                    placeholder={employee.officeName ?? employee.campusName}
                                />
                            </div>
                            <ComboField
                                label="Branch"
                                value={draft.branch}
                                onChange={(v) => setField("branch", v)}
                                options={BRANCH_OPTIONS}
                                placeholder="Select branch"
                            />
                            <ComboField
                                label="Cause / Movement Type"
                                value={draft.movementType}
                                onChange={(v) => setField("movementType", v)}
                                options={MOVEMENT_TYPE_OPTIONS}
                                placeholder="Select movement type"
                            />
                        </div>
                    </section>

                    {/* ── Salary ── */}
                    <section>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salary</p>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="monthlySalary">Monthly Salary</Label>
                                <Input
                                    id="monthlySalary"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={draft.monthlySalary}
                                    onChange={(e) => setField("monthlySalary", e.target.value)}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="salaryGradeStep">Salary Grade / Step</Label>
                                <Input
                                    id="salaryGradeStep"
                                    value={draft.salaryGradeStep}
                                    onChange={(e) => setField("salaryGradeStep", e.target.value)}
                                    placeholder="e.g., SG-12 / Step 1"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="leaveWithoutPay">Leave Without Pay</Label>
                                <Input
                                    id="leaveWithoutPay"
                                    value={draft.leaveWithoutPay}
                                    onChange={(e) => setField("leaveWithoutPay", e.target.value)}
                                    placeholder="e.g., Jan–Mar 2023"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Separation ── */}
                    <section>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Separation</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="separationDate">Separation Date</Label>
                                <Input
                                    id="separationDate"
                                    type="date"
                                    value={draft.separationDate}
                                    onChange={(e) => setField("separationDate", e.target.value)}
                                />
                            </div>
                            <ComboField
                                label="Separation Cause"
                                value={draft.separationCause}
                                onChange={(v) => setField("separationCause", v)}
                                options={SEPARATION_CAUSE_OPTIONS}
                                placeholder="Select cause"
                            />
                        </div>
                    </section>

                    {/* ── Remarks ── */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                            id="remarks"
                            value={draft.remarks}
                            onChange={(e) => setField("remarks", e.target.value)}
                            placeholder="Brief HR notes or document reference."
                            rows={3}
                        />
                    </div>

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