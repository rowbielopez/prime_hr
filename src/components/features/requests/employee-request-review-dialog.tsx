"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
import { InlineAlert } from "@/components/foundation";
import { EmployeeRequestStatusBadge } from "@/components/features/requests/employee-request-status-badge";
import {
    CORRECTION_REQUEST_TYPES,
    EMPLOYEE_REQUEST_STATUS_LABELS,
    EMPLOYEE_REQUEST_TYPE_LABELS,
    HR_REQUEST_TRANSITIONS,
    type EmployeeRequestReviewDetail,
    type EmployeeRequestStatus,
} from "@/features/requests/types";

type ReviewAction = "approve" | "reject" | "return" | "complete";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    detail: EmployeeRequestReviewDetail | null;
    isLoading?: boolean;
    onStartReview: (requestId: string) => void;
    onDecision: (action: ReviewAction, detail: EmployeeRequestReviewDetail) => void;
    isPending?: boolean;
};

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
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{value || "-"}</p>
        </div>
    );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <span className="mt-1 size-2.5 rounded-full bg-primary" />
                <span className="mt-1 h-full min-h-5 w-px bg-border" />
            </div>
            <div className="pb-3">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{value}</p>
            </div>
        </div>
    );
}

function canShow(status: EmployeeRequestStatus, next: EmployeeRequestStatus) {
    return HR_REQUEST_TRANSITIONS[status].includes(next);
}

function moduleHref(detail: EmployeeRequestReviewDetail) {
    if (detail.requestType === "pds_update") return `/employees/${detail.employeeId}/pds`;
    if (detail.requestType === "service_record_correction") return "/service-records";
    return `/employees/${detail.employeeId}`;
}

export function EmployeeRequestReviewDialog({
    open,
    onOpenChange,
    detail,
    isLoading = false,
    onStartReview,
    onDecision,
    isPending = false,
}: Props) {
    const isCorrection = detail ? CORRECTION_REQUEST_TYPES.includes(detail.requestType) : false;
    const relatedHref = detail ? moduleHref(detail) : "#";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="xl" className="grid-rows-[auto_1fr_auto]">
                <DialogHeader>
                    <DialogTitle>{detail?.subject ?? "Employee Request"}</DialogTitle>
                    <DialogDescription>
                        {detail ? EMPLOYEE_REQUEST_TYPE_LABELS[detail.requestType] : "Loading request details"}
                        {detail ? " · " : null}
                        {detail ? <EmployeeRequestStatusBadge status={detail.status} /> : null}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-5 overflow-y-auto py-1">
                    {isLoading || !detail ? (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Loading request details...</div>
                    ) : (
                        <>
                            <section className="space-y-3">
                                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-start md:justify-between">
                                    <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <Info label="Employee" value={detail.employeeName} />
                                        <Info label="Employee No." value={detail.employeeNo} />
                                        <Info label="Campus" value={detail.campusName} />
                                        <Info label="Office" value={detail.officeName} />
                                        <Info label="Position" value={detail.positionTitle} />
                                        <Info label="Employment Status" value={detail.employmentStatus.replaceAll("_", " ")} />
                                    </div>
                                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/employees/${detail.employeeId}`} />}>
                                        <ExternalLink className="size-3.5" aria-hidden /> Employee Profile
                                    </Button>
                                </div>
                            </section>

                            <section className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
                                <Info label="Request Type" value={EMPLOYEE_REQUEST_TYPE_LABELS[detail.requestType]} />
                                <Info label="Status" value={EMPLOYEE_REQUEST_STATUS_LABELS[detail.status]} />
                                <Info label="Date Submitted" value={formatDateTime(detail.submittedAt)} />
                                <Info label="Last Updated" value={formatDateTime(detail.updatedAt)} />
                            </section>

                            <section className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description / Reason</p>
                                <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">{detail.description}</div>
                            </section>

                            {(detail.fieldToCorrect || detail.currentValue || detail.requestedValue || detail.relatedModule) ? (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correction / Request Details</p>
                                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={relatedHref} />}>
                                            <ExternalLink className="size-3.5" aria-hidden /> Open Related Record
                                        </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Info label="Related Area" value={detail.relatedModule} />
                                        <Info label="Field / Document" value={detail.fieldToCorrect} />
                                        <Info label="Current Value" value={detail.currentValue} />
                                        <Info label="Requested Value / Purpose" value={detail.requestedValue} />
                                    </div>
                                </section>
                            ) : null}

                            {isCorrection && (detail.status === "approved" || detail.status === "under_review") ? (
                                <InlineAlert
                                    tone="info"
                                    title="Manual completion required"
                                >
                                    Review the requested change, update the official record in its owning module, then mark this request as completed. Automatic correction application is not enabled for this request.
                                </InlineAlert>
                            ) : null}

                            <section className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HR Remarks</p>
                                    {detail.hrRemarks ? (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 whitespace-pre-wrap">{detail.hrRemarks}</div>
                                    ) : (
                                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No employee-visible remarks yet.</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</p>
                                    {detail.internalNotes ? (
                                        <div className="rounded-lg border bg-muted/20 p-3 text-sm whitespace-pre-wrap">{detail.internalNotes}</div>
                                    ) : (
                                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No internal notes yet.</p>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline / History</p>
                                <div>
                                    <TimelineItem label="Submitted" value={formatDateTime(detail.submittedAt)} />
                                    {detail.history.length === 0 ? (
                                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No HR status changes have been recorded yet.</p>
                                    ) : (
                                        detail.history.map((item) => (
                                            <TimelineItem
                                                key={item.id}
                                                label={`${item.fromStatus ? EMPLOYEE_REQUEST_STATUS_LABELS[item.fromStatus] : "Created"} to ${EMPLOYEE_REQUEST_STATUS_LABELS[item.toStatus]}`}
                                                value={`${formatDateTime(item.createdAt)}${item.actorName ? ` by ${item.actorName}` : ""}${item.remarks ? ` - ${item.remarks}` : ""}`}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                    <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Back to Queue</DialogClose>
                    {detail ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            {canShow(detail.status, "under_review") ? (
                                <Button type="button" variant="outline" disabled={isPending} onClick={() => onStartReview(detail.id)}>
                                    Start Review
                                </Button>
                            ) : null}
                            {canShow(detail.status, "approved") ? (
                                <Button type="button" disabled={isPending} onClick={() => onDecision("approve", detail)}>
                                    Approve
                                </Button>
                            ) : null}
                            {canShow(detail.status, "returned_for_revision") ? (
                                <Button type="button" variant="outline" disabled={isPending} onClick={() => onDecision("return", detail)}>
                                    Return for Revision
                                </Button>
                            ) : null}
                            {canShow(detail.status, "rejected") ? (
                                <Button type="button" variant="destructive" disabled={isPending} onClick={() => onDecision("reject", detail)}>
                                    Reject
                                </Button>
                            ) : null}
                            {canShow(detail.status, "completed") ? (
                                <Button type="button" disabled={isPending} onClick={() => onDecision("complete", detail)}>
                                    Mark Completed
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}