"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangleIcon, BanIcon, CheckCircle2Icon, ChevronRightIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeFormFields } from "@/components/features/employees/employee-form-fields";
import {
    checkDuplicateEmployeesAction,
    createEmployeeAction,
} from "@/features/employees/actions";
import type { PossibleDuplicateEmployee } from "@/features/employees/types";
import {
    employeeFormSchema,
    getInitialEmployeeFormState,
    type EmployeeFormInput,
} from "@/features/employees/schemas/employee-form.schema";
import type { EmployeeCampusOption, EmployeeOfficeOption } from "@/features/employees/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "form" | "duplicate-check" | "review" | "success";

type CreatedEmployee = {
    id: string;
    employeeNo: string;
    fullName: string;
    campusName: string;
    officeName: string | null;
    positionTitle: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campuses: EmployeeCampusOption[];
    offices: EmployeeOfficeOption[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFullName(f: EmployeeFormInput): string {
    return [f.firstName, f.middleName, f.lastName, f.suffix].filter(Boolean).join(" ");
}

function resolveLabel(
    id: string,
    list: { id: string; code: string; name: string }[],
): string {
    const item = list.find((i) => i.id === id);
    return item ? `${item.code} — ${item.name}` : "(Unknown)";
}

// ─── Display-label maps (mirrors employee-form-fields.tsx) ────────────────────

const SEX_LABELS: Record<string, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    unknown: "Prefer not to say",
};

const CIVIL_STATUS_LABELS: Record<string, string> = {
    single: "Single",
    married: "Married",
    widowed: "Widowed",
    separated: "Separated",
    annulled: "Annulled",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    permanent: "Permanent",
    temporary: "Temporary",
    casual: "Casual",
    contractual: "Contractual",
    cos: "Contract of Service (COS)",
    jo: "Job Order (JO)",
    coterminous: "Coterminous",
};

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div className="flex gap-2">
            <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

// Returns true if any duplicate was matched on employee number (globally unique — hard block).
function hasEmployeeNoConflict(duplicates: PossibleDuplicateEmployee[]): boolean {
    return duplicates.some((d) => d.matchReason.includes("same employee number"));
}

function DuplicateWarning({
    duplicates,
}: {
    duplicates: PossibleDuplicateEmployee[];
}) {
    const isHardBlock = hasEmployeeNoConflict(duplicates);

    return (
        <div className="space-y-4">
            {isHardBlock ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <BanIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <div>
                        <p className="text-sm font-semibold text-destructive">
                            Employee number already in use
                        </p>
                        <p className="mt-0.5 text-xs text-destructive/80">
                            This employee number is globally unique and belongs to an existing record. You cannot create a new profile with this number. If the record belongs to your campus, search for it in the employee directory. If it belongs to another campus, contact your HR administrator.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Possible duplicate employee found
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                            The following existing record(s) may match the information you entered. Please review before proceeding.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {duplicates.map((dup) => {
                    const isNoConflict = dup.matchReason.includes("same employee number");
                    return (
                        <div key={dup.id} className={`rounded-lg border p-3 text-sm ${isNoConflict ? "border-destructive/30 bg-destructive/5" : ""}`}>
                            <p className="font-semibold">{dup.fullName}</p>
                            <p className="text-muted-foreground">
                                Employee No.: <span className="font-medium text-foreground">{dup.employeeNo}</span>
                            </p>
                            <p className="text-muted-foreground">Campus: {dup.campusName}</p>
                            {dup.officeName && <p className="text-muted-foreground">Office: {dup.officeName}</p>}
                            <p className={`mt-1 text-xs ${isNoConflict ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
                                Match: {dup.matchReason}
                            </p>
                            {isNoConflict && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    This record may belong to a campus outside your access. Use a different employee number, or contact your HR administrator.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ReviewView({
    formState,
    campuses,
    offices,
}: {
    formState: EmployeeFormInput;
    campuses: EmployeeCampusOption[];
    offices: EmployeeOfficeOption[];
}) {
    const selectedOffice = offices.find((o) => o.id === formState.officeId);
    const officeName = selectedOffice ? `${selectedOffice.code} — ${selectedOffice.name}` : null;

    const statusLabels: Record<string, string> = {
        active: "Active",
        on_leave: "On Leave",
        separated: "Separated",
        retired: "Retired",
    };

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Basic Information
                </p>
                <div className="space-y-2">
                    <ReviewRow label="Employee No." value={formState.employeeNo} />
                    <ReviewRow label="Full Name" value={buildFullName(formState)} />
                    <ReviewRow label="Birth Date" value={formState.birthDate} />
                    <ReviewRow label="Sex" value={formState.sex ? (SEX_LABELS[formState.sex] ?? formState.sex) : null} />
                    <ReviewRow label="Civil Status" value={formState.civilStatus ? (CIVIL_STATUS_LABELS[formState.civilStatus] ?? formState.civilStatus) : null} />
                </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                </p>
                <div className="space-y-2">
                    <ReviewRow label="Email" value={formState.email} />
                    <ReviewRow label="Mobile No." value={formState.mobileNo} />
                </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Assignment
                </p>
                <div className="space-y-2">
                    <ReviewRow label="Campus" value={resolveLabel(formState.campusId, campuses)} />
                    <ReviewRow label="Office" value={officeName} />
                    <ReviewRow label="Position" value={formState.positionTitle} />
                    <ReviewRow label="Employment Type" value={formState.employmentType ? (EMPLOYMENT_TYPE_LABELS[formState.employmentType] ?? formState.employmentType) : null} />
                    <ReviewRow label="Employment Status" value={statusLabels[formState.employmentStatus] ?? formState.employmentStatus} />
                    <ReviewRow label="Date Hired" value={formState.dateHired} />
                    {formState.dateSeparated && <ReviewRow label="Date Separated" value={formState.dateSeparated} />}
                    {formState.separationReason && <ReviewRow label="Separation Reason" value={formState.separationReason} />}
                    {formState.plantillaItemNo && <ReviewRow label="Plantilla Item No." value={formState.plantillaItemNo} />}
                    {formState.cabinetNo && <ReviewRow label="Cabinet No." value={formState.cabinetNo} />}
                </div>
            </div>

            {(formState.tin || formState.gsisNo || formState.philhealthNo || formState.pagibigNo) && (
                <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Government IDs
                    </p>
                    <div className="space-y-2">
                        <ReviewRow label="TIN" value={formState.tin} />
                        <ReviewRow label="GSIS No." value={formState.gsisNo} />
                        <ReviewRow label="PhilHealth No." value={formState.philhealthNo} />
                        <ReviewRow label="Pag-IBIG No." value={formState.pagibigNo} />
                    </div>
                </div>
            )}
        </div>
    );
}

function SuccessView({
    employee,
    onViewProfile,
    onAddAnother,
    onClose,
}: {
    employee: CreatedEmployee;
    onViewProfile: () => void;
    onAddAnother: () => void;
    onClose: () => void;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                    <CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <p className="text-lg font-semibold">Employee profile created!</p>
                    <p className="text-sm text-muted-foreground">The record has been added to the directory.</p>
                </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
                <div className="space-y-2">
                    <ReviewRow label="Name" value={employee.fullName} />
                    <ReviewRow label="Employee No." value={employee.employeeNo} />
                    <ReviewRow label="Campus" value={employee.campusName} />
                    {employee.officeName && <ReviewRow label="Office" value={employee.officeName} />}
                    {employee.positionTitle && <ReviewRow label="Position" value={employee.positionTitle} />}
                </div>
            </div>

            <div className="grid gap-2">
                <Button onClick={onViewProfile} className="w-full justify-between">
                    View Employee Profile
                    <ChevronRightIcon className="size-4" />
                </Button>
                <Button variant="outline" onClick={onAddAnother} className="w-full justify-between">
                    <UserPlusIcon className="size-4" />
                    Add Another Employee
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full">
                    Back to Employee List
                </Button>
            </div>

            {/* Future enhancement: Complete PDS, Upload Documents */}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateEmployeeDialog({ open, onOpenChange, campuses, offices }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("form");
    const [isPending, startTransition] = useTransition();
    const [formState, setFormState] = useState<EmployeeFormInput>(() => getInitialEmployeeFormState());
    const [duplicates, setDuplicates] = useState<PossibleDuplicateEmployee[]>([]);
    const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployee | null>(null);
    const employeeNoRef = useRef<HTMLInputElement>(null);

    function resetAndClose() {
        setStep("form");
        setFormState(getInitialEmployeeFormState());
        setDuplicates([]);
        setCreatedEmployee(null);
        onOpenChange(false);
    }

    function resetForAnother() {
        const { campusId } = formState;
        setStep("form");
        const next = getInitialEmployeeFormState();
        // Keep campus context to speed up bulk entry
        next.campusId = campusId;
        setFormState(next);
        setDuplicates([]);
        setCreatedEmployee(null);
        // Scroll back to top and focus employee no.
        requestAnimationFrame(() => {
            employeeNoRef.current?.focus();
        });
    }

    // Step: form → duplicate check or review
    function handleReview() {
        const parsed = employeeFormSchema.safeParse(formState);
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Please fix the errors before continuing.");
            return;
        }

        startTransition(async () => {
            const dupResult = await checkDuplicateEmployeesAction({
                employeeNo: formState.employeeNo,
                email: formState.email,
                firstName: formState.firstName,
                lastName: formState.lastName,
                birthDate: formState.birthDate,
                mobileNo: formState.mobileNo,
            });

            if (dupResult.ok && dupResult.duplicates.length > 0) {
                setDuplicates(dupResult.duplicates);
                setStep("duplicate-check");
            } else {
                setStep("review");
            }
        });
    }

    // Step: duplicate-check → review (user chose to continue anyway)
    function handleContinueAnyway() {
        setStep("review");
    }

    // Step: review → confirm create
    function handleConfirmCreate() {
        const parsed = employeeFormSchema.safeParse(formState);
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Invalid employee details.");
            setStep("form");
            return;
        }

        startTransition(async () => {
            const result = await createEmployeeAction(parsed.data);
            if (!result.ok) {
                toast.error(result.error);
                setStep("form");
                return;
            }

            const selectedCampus = campuses.find((c) => c.id === formState.campusId);
            const selectedOffice = offices.find((o) => o.id === formState.officeId);
            setCreatedEmployee({
                id: result.employeeId ?? "",
                employeeNo: formState.employeeNo,
                fullName: buildFullName(formState),
                campusName: selectedCampus ? `${selectedCampus.code} — ${selectedCampus.name}` : "Unknown",
                officeName: selectedOffice ? `${selectedOffice.code} — ${selectedOffice.name}` : null,
                positionTitle: formState.positionTitle ?? null,
            });
            setStep("success");
            router.refresh();
        });
    }

    // Create and Add Another (skip review)
    function handleCreateAndAddAnother() {
        const parsed = employeeFormSchema.safeParse(formState);
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Please fix the errors before saving.");
            return;
        }

        startTransition(async () => {
            const dupResult = await checkDuplicateEmployeesAction({
                employeeNo: formState.employeeNo,
                email: formState.email,
                firstName: formState.firstName,
                lastName: formState.lastName,
                birthDate: formState.birthDate,
                mobileNo: formState.mobileNo,
            });
            if (dupResult.ok && dupResult.duplicates.length > 0) {
                setDuplicates(dupResult.duplicates);
                setStep("duplicate-check");
                return;
            }

            const result = await createEmployeeAction(parsed.data);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success(`${buildFullName(formState)} has been added.`);
            router.refresh();
            resetForAnother();
        });
    }

    // ─── Step titles / descriptions ─────────────────────────────────────────────
    const stepMeta: Record<Step, { title: string; description: string }> = {
        form: {
            title: "Create New Employee",
            description:
                "Create a new employee profile. You can complete other details later.",
        },
        "duplicate-check": {
            title: "Possible Duplicate Found",
            description:
                "One or more existing records may match. Review the details and decide how to proceed.",
        },
        review: {
            title: "Review Employee Information",
            description:
                "Please review the details before saving. Click Confirm to create the profile.",
        },
        success: {
            title: "Employee Added",
            description: "",
        },
    };

    const meta = stepMeta[step];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); else onOpenChange(true); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{meta.title}</DialogTitle>
                    {meta.description && <DialogDescription>{meta.description}</DialogDescription>}
                    {step === "form" && (
                        <p className="text-xs text-muted-foreground">
                            Fields marked with <span className="text-destructive">*</span> are required.
                        </p>
                    )}
                </DialogHeader>

                {/* ── Form step ───────────────────────────────────────────────────── */}
                {step === "form" && (
                    <>
                        <EmployeeFormFields
                            formState={formState}
                            setFormState={setFormState}
                            campuses={campuses}
                            offices={offices}
                            defaultExpanded={false}
                            employeeNoRef={employeeNoRef}
                        />
                        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                            <Button variant="ghost" onClick={resetAndClose} disabled={isPending}>
                                Cancel
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleCreateAndAddAnother}
                                    disabled={isPending}
                                >
                                    {isPending ? "Saving…" : "Save & Add Another"}
                                </Button>
                                <Button onClick={handleReview} disabled={isPending}>
                                    {isPending ? "Checking…" : "Review Employee →"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}

                {/* ── Duplicate check step ────────────────────────────────────────── */}
                {step === "duplicate-check" && (
                    <>
                        <DuplicateWarning
                            duplicates={duplicates}
                        />
                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => setStep("form")} disabled={isPending}>
                                ← Go Back and Edit
                            </Button>
                            {!hasEmployeeNoConflict(duplicates) && (
                                <Button variant="destructive" onClick={handleContinueAnyway} disabled={isPending}>
                                    Continue Anyway →
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}

                {/* ── Review step ─────────────────────────────────────────────────── */}
                {step === "review" && (
                    <>
                        <ReviewView formState={formState} campuses={campuses} offices={offices} />
                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => setStep("form")} disabled={isPending}>
                                ← Back to Edit
                            </Button>
                            <Button onClick={handleConfirmCreate} disabled={isPending}>
                                {isPending ? "Creating…" : "Confirm and Create"}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* ── Success step ────────────────────────────────────────────────── */}
                {step === "success" && createdEmployee && (
                    <SuccessView
                        employee={createdEmployee}
                        onViewProfile={() => {
                            onOpenChange(false);
                            router.push(`/employees/${createdEmployee.id}`);
                        }}
                        onAddAnother={resetForAnother}
                        onClose={resetAndClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
