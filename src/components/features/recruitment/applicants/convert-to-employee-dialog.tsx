"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { convertApplicantToEmployeeAction } from "@/features/recruitment/applicants/actions";
import type { ApplicantDetail } from "@/features/recruitment/applicants/types";

type ConvertToEmployeeDialogProps = {
    applicant: ApplicantDetail;
    disabled?: boolean;
};

const EMPLOYMENT_STATUSES = [
    { value: "active", label: "Active" },
    { value: "on_leave", label: "On Leave" },
    { value: "separated", label: "Separated" },
    { value: "retired", label: "Retired" },
] as const;

export function ConvertToEmployeeDialog({ applicant, disabled }: ConvertToEmployeeDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [employeeNo, setEmployeeNo] = useState("");
    const [dateHired, setDateHired] = useState(() => new Date().toISOString().slice(0, 10));
    const [employmentStatus, setEmploymentStatus] =
        useState<(typeof EMPLOYMENT_STATUSES)[number]["value"]>("active");
    const [positionTitle, setPositionTitle] = useState("");
    const [employmentType, setEmploymentType] = useState("");

    if (applicant.convertedEmployeeId) {
        return (
            <Link
                href={`/employees/${applicant.convertedEmployeeId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
                View Employee Record
            </Link>
        );
    }

    const canConvert = applicant.status === "shortlisted" || applicant.status === "hired";
    if (!canConvert) {
        return (
            <Button size="sm" variant="outline" disabled title="Applicant must be shortlisted before converting">
                Convert to Employee
            </Button>
        );
    }

    function submit() {
        if (!employeeNo.trim()) {
            toast.error("Employee number is required.");
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateHired)) {
            toast.error("Date hired must be in YYYY-MM-DD format.");
            return;
        }
        startTransition(async () => {
            const result = await convertApplicantToEmployeeAction({
                applicantId: applicant.id,
                employeeNo: employeeNo.trim(),
                dateHired,
                employmentStatus,
                positionTitle: positionTitle.trim() || null,
                employmentType: employmentType.trim() || null,
                campusId: applicant.campusId,
                officeId: applicant.officeId,
            });
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success("Applicant converted to employee.");
            setOpen(false);
            router.push(`/employees/${result.employeeId}`);
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                size="sm"
                onClick={() => setOpen(true)}
                disabled={disabled}
                title="Create an employee record from this applicant"
            >
                Convert to Employee
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Convert applicant to employee</DialogTitle>
                    <DialogDescription>
                        This will create a new employee record using the applicant&apos;s personal details and
                        mark the applicant as hired.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                        <span className="font-medium">{applicant.fullName}</span>
                        {applicant.email ? <span className="text-muted-foreground"> · {applicant.email}</span> : null}
                        {applicant.mobileNo ? <span className="text-muted-foreground"> · {applicant.mobileNo}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Scope: {applicant.campusName}
                        {applicant.officeName ? ` / ${applicant.officeName}` : ""}
                    </div>
                </div>

                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="employeeNo">Employee Number</Label>
                        <Input
                            id="employeeNo"
                            value={employeeNo}
                            onChange={(e) => setEmployeeNo(e.target.value)}
                            placeholder="e.g. 2025-0001"
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dateHired">Date Hired</Label>
                        <Input
                            id="dateHired"
                            type="date"
                            value={dateHired}
                            onChange={(e) => setDateHired(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="employmentStatus">Employment Status</Label>
                        <Select
                            value={employmentStatus}
                            onValueChange={(value) =>
                                setEmploymentStatus(value as (typeof EMPLOYMENT_STATUSES)[number]["value"])
                            }
                        >
                            <SelectTrigger id="employmentStatus">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EMPLOYMENT_STATUSES.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="positionTitle">Position Title (optional)</Label>
                        <Input
                            id="positionTitle"
                            value={positionTitle}
                            onChange={(e) => setPositionTitle(e.target.value)}
                            placeholder="e.g. Administrative Officer III"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="employmentType">Employment Type (optional)</Label>
                        <Input
                            id="employmentType"
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            placeholder="e.g. Permanent, Contractual"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
                        Cancel
                    </DialogClose>
                    <Button onClick={submit} disabled={isPending}>
                        {isPending ? "Converting…" : "Convert"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
