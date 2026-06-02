"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEmployeeRequestAction, updateEmployeeRequestAction } from "@/features/requests/requests.actions";
import type { EmployeeRequestFormInput, EmployeeRequestMode } from "@/features/requests/schemas/request.schema";
import type { EmployeeRequestListItem, EmployeeRequestType } from "@/features/requests/types";
import { CORRECTION_REQUEST_TYPES, EMPLOYEE_REQUEST_TYPES } from "@/features/requests/types";

const EMPTY_FORM: EmployeeRequestFormInput = {
    requestType: "profile_correction",
    subject: "",
    description: "",
    fieldToCorrect: null,
    currentValue: null,
    requestedValue: null,
    relatedModule: null,
};

type Props = {
    request?: EmployeeRequestListItem;
    triggerLabel?: string;
    variant?: "default" | "outline" | "ghost";
};

function toForm(request?: EmployeeRequestListItem): EmployeeRequestFormInput {
    if (!request) return EMPTY_FORM;
    return {
        requestType: request.requestType,
        subject: request.subject,
        description: request.description,
        fieldToCorrect: request.fieldToCorrect,
        currentValue: request.currentValue,
        requestedValue: request.requestedValue,
        relatedModule: request.relatedModule,
    };
}

function requestHelper(requestType: EmployeeRequestType) {
    switch (requestType) {
        case "profile_correction":
            return "Use this for corrections to your name, birth date, civil status, contact details, address, or emergency contact.";
        case "employment_detail_correction":
            return "Employment details are managed by HR. Your requested correction will be reviewed before changes are applied.";
        case "pds_update":
            return "Use this when a PDS section needs HR review or follow-up after you submit your Personal Data Sheet.";
        case "service_record_correction":
            return "Describe the service record entry and the exact value HR should review.";
        case "document_request":
            return "Use this to request HR documents or corrections to document information in your 201 file.";
        case "certificate_request":
            return "Use this for certificates such as Certificate of Employment, service record copy, or other HR certifications.";
        case "leave_related_request":
            return "Use this for leave-related HR concerns while the full leave module is being prepared.";
        case "account_login_concern":
            return "Use this for login email or account access corrections.";
        default:
            return "Use this for HR concerns that do not fit the other request types.";
    }
}

function Field({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
    );
}

export function EmployeeRequestFormDialog({ request, triggerLabel, variant = "default" }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<EmployeeRequestFormInput>(() => toForm(request));
    const [isPending, startTransition] = useTransition();

    const isEdit = Boolean(request);
    const isCorrection = CORRECTION_REQUEST_TYPES.includes(draft.requestType);
    const helper = useMemo(() => requestHelper(draft.requestType), [draft.requestType]);

    function setField<K extends keyof EmployeeRequestFormInput>(key: K, value: EmployeeRequestFormInput[K]) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    function resetAndClose() {
        setOpen(false);
        setDraft(toForm(request));
    }

    function submit(mode: EmployeeRequestMode) {
        startTransition(async () => {
            const result = isEdit && request
                ? await updateEmployeeRequestAction(request.id, draft, mode)
                : await createEmployeeRequestAction(draft, mode);

            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            toast.success(mode === "draft" ? "Your request draft has been saved." : "Your request has been submitted to HR.");
            resetAndClose();
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={(next) => {
            setOpen(next);
            if (next) setDraft(toForm(request));
        }}>
            <DialogTrigger render={<Button type="button" variant={variant} size="sm" />}>{triggerLabel ?? "Submit New Request"}</DialogTrigger>
            <DialogContent size="xl" className="grid-rows-[auto_1fr_auto]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Request" : "Submit New Request"}</DialogTitle>
                    <DialogDescription>
                        Submit a request for HR review. Official records will only be updated after HR approval.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-5 overflow-y-auto py-1">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                        {helper}
                    </div>

                    <section className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Request Details</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Request Type">
                                <Select
                                    value={draft.requestType}
                                    onValueChange={(value) => {
                                        if (!value) return;
                                        setDraft((prev) => ({
                                            ...prev,
                                            requestType: value as EmployeeRequestType,
                                            fieldToCorrect: CORRECTION_REQUEST_TYPES.includes(value as EmployeeRequestType) ? prev.fieldToCorrect : null,
                                            currentValue: CORRECTION_REQUEST_TYPES.includes(value as EmployeeRequestType) ? prev.currentValue : null,
                                            requestedValue: CORRECTION_REQUEST_TYPES.includes(value as EmployeeRequestType) ? prev.requestedValue : null,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EMPLOYEE_REQUEST_TYPES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Subject / Title">
                                <Input value={draft.subject} onChange={(event) => setField("subject", event.target.value)} placeholder="Briefly describe your request" />
                            </Field>
                        </div>
                        <Field label="Description / Reason">
                            <Textarea
                                value={draft.description}
                                onChange={(event) => setField("description", event.target.value)}
                                placeholder="Tell HR what needs to be reviewed and why."
                                rows={4}
                            />
                        </Field>
                    </section>

                    {isCorrection ? (
                        <section className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correction Details</p>
                            <div className="grid gap-3 md:grid-cols-3">
                                <Field label={draft.requestType === "account_login_concern" ? "Email / Account Detail" : "Field to Correct"}>
                                    <Input
                                        value={draft.fieldToCorrect ?? ""}
                                        onChange={(event) => setField("fieldToCorrect", event.target.value)}
                                        placeholder={draft.requestType === "account_login_concern" ? "Login email" : "Example: Birth date"}
                                    />
                                </Field>
                                <Field label={draft.requestType === "account_login_concern" ? "Current Email" : "Current Value"}>
                                    <Input
                                        value={draft.currentValue ?? ""}
                                        onChange={(event) => setField("currentValue", event.target.value)}
                                        placeholder="What is currently shown"
                                    />
                                </Field>
                                <Field label={draft.requestType === "account_login_concern" ? "Requested Email" : "Requested Value"}>
                                    <Input
                                        value={draft.requestedValue ?? ""}
                                        onChange={(event) => setField("requestedValue", event.target.value)}
                                        placeholder="What it should be"
                                    />
                                </Field>
                            </div>
                        </section>
                    ) : null}

                    {draft.requestType === "pds_update" ? (
                        <Field label="Related PDS Section" helper="Example: Personal Information, Family Background, Work Experience, or Declaration.">
                            <Input value={draft.relatedModule ?? ""} onChange={(event) => setField("relatedModule", event.target.value)} placeholder="PDS section" />
                        </Field>
                    ) : null}

                    {draft.requestType === "document_request" || draft.requestType === "certificate_request" ? (
                        <section className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Details</p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label={draft.requestType === "certificate_request" ? "Certificate Type" : "Document Type"}>
                                    <Input
                                        value={draft.fieldToCorrect ?? ""}
                                        onChange={(event) => setField("fieldToCorrect", event.target.value)}
                                        placeholder={draft.requestType === "certificate_request" ? "Certificate of Employment" : "Document name"}
                                    />
                                </Field>
                                <Field label="Purpose">
                                    <Input
                                        value={draft.requestedValue ?? ""}
                                        onChange={(event) => setField("requestedValue", event.target.value)}
                                        placeholder="Purpose of the request"
                                    />
                                </Field>
                            </div>
                        </section>
                    ) : null}
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
                    <Button type="button" variant="outline" disabled={isPending} onClick={() => submit("draft")}>
                        {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        Save as Draft
                    </Button>
                    <Button type="button" disabled={isPending} onClick={() => submit("submit")}>
                        {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
