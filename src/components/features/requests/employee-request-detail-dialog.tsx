"use client";

import { Eye } from "lucide-react";
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
import type { EmployeeRequestListItem } from "@/features/requests/types";
import { EMPLOYEE_REQUEST_STATUS_LABELS, EMPLOYEE_REQUEST_TYPE_LABELS } from "@/features/requests/types";
import { EmployeeRequestStatusBadge } from "@/components/features/requests/employee-request-status-badge";

function formatDateTime(input: string | null) {
    if (!input) return "Not yet";
    return new Date(input).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{value || "—"}</p>
        </div>
    );
}

function TimelineItem({ label, value, active = true }: { label: string; value: string; active?: boolean }) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <span className={active ? "mt-1 size-2.5 rounded-full bg-primary" : "mt-1 size-2.5 rounded-full bg-muted ring-1 ring-border"} />
                <span className="mt-1 h-full min-h-5 w-px bg-border" />
            </div>
            <div className="pb-3">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{value}</p>
            </div>
        </div>
    );
}

type Props = {
    request: EmployeeRequestListItem;
};

export function EmployeeRequestDetailDialog({ request }: Props) {
    const finalLabel = request.status === "cancelled"
        ? "Cancelled"
        : request.status === "completed"
            ? "Completed"
            : request.status === "rejected"
                ? "Rejected"
                : request.status === "approved"
                    ? "Approved"
                    : null;

    return (
        <Dialog>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                <Eye className="size-3.5" aria-hidden /> View
            </DialogTrigger>
            <DialogContent size="lg" className="grid-rows-[auto_1fr_auto]">
                <DialogHeader>
                    <DialogTitle>{request.subject}</DialogTitle>
                    <DialogDescription>
                        {EMPLOYEE_REQUEST_TYPE_LABELS[request.requestType]} · <EmployeeRequestStatusBadge status={request.status} />
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-5 overflow-y-auto py-1">
                    <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2">
                        <Info label="Request Type" value={EMPLOYEE_REQUEST_TYPE_LABELS[request.requestType]} />
                        <Info label="Status" value={EMPLOYEE_REQUEST_STATUS_LABELS[request.status]} />
                        <Info label="Date Submitted" value={formatDateTime(request.submittedAt)} />
                        <Info label="Last Updated" value={formatDateTime(request.updatedAt)} />
                    </div>

                    <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description / Reason</p>
                        <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">{request.description}</div>
                    </section>

                    {(request.fieldToCorrect || request.currentValue || request.requestedValue || request.relatedModule) ? (
                        <section className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Details</p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Info label="Related Area" value={request.relatedModule} />
                                <Info label="Field / Document" value={request.fieldToCorrect} />
                                <Info label="Current Value" value={request.currentValue} />
                                <Info label="Requested Value / Purpose" value={request.requestedValue} />
                            </div>
                        </section>
                    ) : null}

                    <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HR Remarks</p>
                        {request.hrRemarks ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 whitespace-pre-wrap">{request.hrRemarks}</div>
                        ) : (
                            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No HR remarks have been added yet.</p>
                        )}
                    </section>

                    <section className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
                        <div>
                            <TimelineItem label="Draft created" value={formatDateTime(request.createdAt)} active />
                            <TimelineItem label="Submitted" value={formatDateTime(request.submittedAt)} active={Boolean(request.submittedAt)} />
                            <TimelineItem label="Under HR review" value={request.status === "under_review" ? "In progress" : "Pending HR action"} active={request.status === "under_review"} />
                            {request.status === "returned_for_revision" ? <TimelineItem label="Returned for revision" value={request.hrRemarks ?? "Please review HR remarks and resubmit."} active /> : null}
                            {finalLabel ? <TimelineItem label={finalLabel} value={formatDateTime(request.cancelledAt ?? request.reviewedAt ?? request.updatedAt)} active /> : null}
                        </div>
                    </section>
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" />}>Back to My Requests</DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
