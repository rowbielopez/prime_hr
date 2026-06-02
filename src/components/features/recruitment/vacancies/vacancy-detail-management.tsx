"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, InspectorLayout, StatusBadge } from "@/components/foundation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { ApplicantListItem } from "@/features/recruitment/applicants/types";
import { createApplicationAction } from "@/features/recruitment/applicants/actions";
import type { VacancyApplicationRecord, VacancyDetail, VacancyStatus } from "@/features/recruitment/vacancies/types";
import {
    cancelVacancyAction,
    closeVacancyAction,
    markVacancyFilledAction,
    publishVacancyAction,
    submitVacancyForReviewAction,
} from "@/features/recruitment/vacancies/actions";
import type { StatusTone } from "@/components/foundation/feedback/status-badge";

type VacancyDetailManagementProps = {
    detail: VacancyDetail;
    applications: VacancyApplicationRecord[];
    applicantOptions: ApplicantListItem[];
    canManageStatus: boolean;
    canManageApplications: boolean;
};

type ConfirmState = {
    action: "review" | "publish" | "filled" | "close" | "cancel";
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
} | null;

const applicationStatuses = ["submitted", "screening", "interview", "for_offer", "hired", "rejected", "withdrawn"] as const;

export function VacancyDetailManagement({
    detail,
    applications,
    applicantOptions,
    canManageStatus,
    canManageApplications,
}: VacancyDetailManagementProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [confirmState, setConfirmState] = useState<ConfirmState>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedApplicantId, setSelectedApplicantId] = useState("");
    const [applicationRemarks, setApplicationRemarks] = useState("");
    const linkedApplicantIds = useMemo(() => new Set(applications.map((application) => application.applicantId)), [applications]);
    const availableApplicants = useMemo(
        () => applicantOptions.filter((applicant) => applicant.campusId === detail.campusId && !linkedApplicantIds.has(applicant.id)),
        [applicantOptions, detail.campusId, linkedApplicantIds]
    );
    const canReceiveCandidates = detail.status === "open";

    function runConfirmedAction() {
        if (!confirmState) return;
        const state = confirmState;
        startTransition(async () => {
            const result = await runVacancyAction(state.action, detail.id);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success(successMessage(state.action));
            setConfirmState(null);
            router.refresh();
        });
    }

    function addCandidate() {
        if (!canReceiveCandidates) {
            toast.error("Only published vacancies can receive candidates.");
            return;
        }
        if (!selectedApplicantId) {
            toast.error("Select an applicant to link to this vacancy.");
            return;
        }
        startTransition(async () => {
            const result = await createApplicationAction({
                applicantId: selectedApplicantId,
                vacancyId: detail.id,
                status: "submitted",
                appliedAt: todayDate(),
                remarks: applicationRemarks || null,
            });
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success("Candidate linked to this vacancy.");
            setSelectedApplicantId("");
            setApplicationRemarks("");
            setAddDialogOpen(false);
            router.refresh();
        });
    }

    const inspector = canManageStatus ? (
        <div className="space-y-4 p-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Status</p>
                <div className="mt-2">
                    <StatusBadge tone={statusTone(detail.status)} label={statusLabel(detail.status)} />
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow Actions</p>
                <Button size="sm" variant="outline" className="w-full justify-start" disabled={isPending || detail.status !== "draft"} onClick={() => setConfirmState(reviewConfirm())}>
                    Submit for Review
                </Button>
                <Button size="sm" className="w-full justify-start" disabled={isPending || detail.status === "open" || isTerminal(detail.status)} onClick={() => setConfirmState(publishConfirm())}>
                    Publish Vacancy
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start" disabled={isPending || detail.status !== "open"} onClick={() => setConfirmState(filledConfirm())}>
                    Mark Filled
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start" disabled={isPending || isTerminal(detail.status)} onClick={() => setConfirmState(closeConfirm())}>
                    Close Vacancy
                </Button>
                <Button size="sm" variant="destructive" className="w-full justify-start" disabled={isPending || isTerminal(detail.status)} onClick={() => setConfirmState(cancelConfirm())}>
                    Cancel Vacancy
                </Button>
            </div>
        </div>
    ) : undefined;

    return (
        <InspectorLayout inspector={inspector} inspectorTitle="Workflow" inspectorWidth="sm">
            <div className="space-y-5">
                <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold">{detail.title}</h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {detail.campusName}{detail.officeName ? ` / ${detail.officeName}` : ""} · {detail.itemCount} slot{detail.itemCount === 1 ? "" : "s"}
                            </p>
                        </div>
                        <StatusBadge tone={statusTone(detail.status)} label={statusLabel(detail.status)} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Metric label="Applicants" value={detail.applicantsCount} />
                        <Metric label="Screening" value={detail.applicationStatusCounts.screening} />
                        <Metric label="Interview" value={detail.applicationStatusCounts.interview} />
                        <Metric label="Hired" value={detail.applicationStatusCounts.hired} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/recruitment/vacancies/${detail.id}/edit`)} disabled={isTerminal(detail.status)}>
                            Edit Vacancy
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => document.getElementById("posting-preview")?.scrollIntoView({ behavior: "smooth" })}>
                            Preview Posting
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={detail.status !== "open" || !detail.publicSlug}
                            onClick={() => {
                                if (!detail.publicSlug) return;
                                window.open(`/careers/${detail.publicSlug}`, "_blank", "noopener,noreferrer");
                            }}
                            title={
                                detail.status !== "open"
                                    ? "Only open vacancies are visible publicly."
                                    : !detail.publicSlug
                                        ? "No public link is available yet."
                                        : "Open the public careers page in a new tab."
                            }
                        >
                            View Public Posting
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!detail.publicSlug}
                            onClick={() => {
                                if (!detail.publicSlug) return;
                                const url = `${window.location.origin}/careers/${detail.publicSlug}`;
                                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                                    navigator.clipboard
                                        .writeText(url)
                                        .then(() => toast.success("Public link copied to clipboard."))
                                        .catch(() => toast.error("Unable to copy link. Please copy it manually."));
                                } else {
                                    toast.message(url);
                                }
                            }}
                        >
                            Copy Public Link
                        </Button>
                        {canManageApplications ? (
                            <AddCandidateDialog
                                open={addDialogOpen}
                                onOpenChange={setAddDialogOpen}
                                disabled={!canReceiveCandidates || isPending}
                                availableApplicants={availableApplicants}
                                selectedApplicantId={selectedApplicantId}
                                remarks={applicationRemarks}
                                onApplicantChange={setSelectedApplicantId}
                                onRemarksChange={setApplicationRemarks}
                                onSubmit={addCandidate}
                            />
                        ) : null}
                    </div>
                    {!canReceiveCandidates ? (
                        <p className="mt-3 text-xs text-muted-foreground">Candidates can be linked after the vacancy is published.</p>
                    ) : null}
                </section>

                <section id="posting-preview" className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posting Preview</p>
                            <h3 className="mt-1 text-lg font-semibold text-foreground">{detail.title}</h3>
                        </div>
                        <StatusBadge tone={statusTone(detail.status)} label={statusLabel(detail.status)} />
                    </div>
                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <Field label="Campus" value={detail.campusName} />
                        <Field label="Office / Assignment" value={detail.officeName ?? "No office assigned"} />
                        <Field label="Employment Type" value={detail.employmentType ?? "Not specified"} />
                        <Field label="Number of Slots" value={String(detail.itemCount)} />
                        <Field label="Posting Date" value={detail.postedAt ?? "Not set"} />
                        <Field label="Application Deadline" value={detail.closingAt ?? "Not set"} />
                        <Field label="Plantilla Item No." value={detail.plantillaItemNo ?? "Not specified"} />
                    </dl>
                    <TextBlock label="Job Summary / Duties and Responsibilities" value={detail.description} fallback="No job description has been added yet." />
                    <TextBlock label="Qualifications / Requirements" value={detail.qualificationNotes} fallback="No qualifications have been added yet." />
                </section>

                <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vacancy Details</p>
                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <Field label="Position / Vacancy Title" value={detail.title} />
                        <Field label="Employment Type" value={detail.employmentType ?? "Not specified"} />
                        <Field label="Campus" value={detail.campusName} />
                        <Field label="Office" value={detail.officeName ?? "No office assigned"} />
                        <Field label="Slots" value={String(detail.itemCount)} />
                        <Field label="Last Updated" value={detail.updatedAt.slice(0, 19).replace("T", " ")} />
                    </dl>
                    {detail.remarks ? <TextBlock label="Internal Notes" value={detail.remarks} /> : null}
                </section>

                <section id="linked-candidates" className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applicants / Candidates</p>
                            <h3 className="mt-1 text-base font-semibold">Linked candidates</h3>
                        </div>
                        {canManageApplications ? (
                            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)} disabled={!canReceiveCandidates || isPending}>
                                Add Candidate
                            </Button>
                        ) : null}
                    </div>
                    <div className="mt-4 space-y-3">
                        {applications.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No candidates are linked to this vacancy yet.</p>
                        ) : (
                            applications.map((application) => (
                                <div key={application.id} className="rounded-lg border premium-border bg-surface-inset/40 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{application.applicantName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {application.applicantEmail ?? "No email"} · {application.applicantMobileNo ?? "No mobile"}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <StatusBadge tone={applicationTone(application.applicationStatus)} label={applicationStatusLabel(application.applicationStatus)} />
                                            <StatusBadge tone={applicantTone(application.applicantStatus)} label={applicantStatusLabel(application.applicantStatus)} />
                                            {application.applicantSource === "public_careers" ? (
                                                <StatusBadge tone="info" label="Public" />
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>Applied: {application.appliedAt ?? "Not recorded"}</span>
                                        <Button size="sm" variant="ghost" onClick={() => router.push(`/recruitment/applicants/${application.applicantId}`)}>
                                            View Applicant
                                        </Button>
                                    </div>
                                    {application.remarks ? <p className="mt-2 text-sm text-muted-foreground">{application.remarks}</p> : null}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-lg border premium-border bg-surface-panel p-5 shadow-premium-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Summary</p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p>Current vacancy status: <span className="font-medium">{statusLabel(detail.status)}</span></p>
                        <p>Last updated: <span className="font-medium">{detail.updatedAt.slice(0, 19).replace("T", " ")}</span></p>
                        {applicationStatuses.map((status) => (
                            <p key={status}>{applicationStatusLabel(status)}: <span className="font-medium">{detail.applicationStatusCounts[status]}</span></p>
                        ))}
                    </div>
                </section>
            </div>

            <ConfirmDialog
                open={Boolean(confirmState)}
                onOpenChange={(open) => !open && setConfirmState(null)}
                title={confirmState?.title ?? "Confirm vacancy action"}
                description={confirmState?.description}
                confirmLabel={confirmState?.confirmLabel ?? "Confirm"}
                variant={confirmState?.destructive ? "destructive" : "default"}
                isPending={isPending}
                onConfirm={runConfirmedAction}
            />
        </InspectorLayout>
    );
}

function AddCandidateDialog({
    open,
    onOpenChange,
    disabled,
    availableApplicants,
    selectedApplicantId,
    remarks,
    onApplicantChange,
    onRemarksChange,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    disabled: boolean;
    availableApplicants: ApplicantListItem[];
    selectedApplicantId: string;
    remarks: string;
    onApplicantChange: (value: string) => void;
    onRemarksChange: (value: string) => void;
    onSubmit: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={<Button id="add-candidate" size="sm" disabled={disabled} />}>Add Candidate</DialogTrigger>
            <DialogContent size="md">
                <DialogHeader>
                    <DialogTitle>Add candidate to vacancy</DialogTitle>
                    <DialogDescription>Select an existing applicant to create a real application record for this vacancy.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pb-2">
                    {availableApplicants.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No available applicants are in this vacancy campus scope.</p>
                    ) : (
                        <>
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium">Applicant</span>
                                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={selectedApplicantId} onChange={(event) => onApplicantChange(event.target.value)}>
                                    <option value="">Select applicant</option>
                                    {availableApplicants.map((applicant) => (
                                        <option key={applicant.id} value={applicant.id}>
                                            {applicant.fullName} · {applicant.email ?? applicant.mobileNo ?? "No contact"}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1.5 text-sm">
                                <span className="font-medium">Remarks</span>
                                <textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" value={remarks} onChange={(event) => onRemarksChange(event.target.value)} placeholder="Optional application note" />
                            </label>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={onSubmit} disabled={disabled || availableApplicants.length === 0}>Add Candidate</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border premium-border bg-surface-inset/45 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-foreground">{value}</dd>
        </div>
    );
}

function TextBlock({ label, value, fallback = "Not specified" }: { label: string; value: string | null; fallback?: string }) {
    return (
        <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value?.trim() ? value : fallback}</p>
        </div>
    );
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function isTerminal(status: VacancyStatus) {
    return status === "filled" || status === "closed" || status === "cancelled";
}

function statusLabel(status: VacancyStatus) {
    const labels: Record<VacancyStatus, string> = {
        draft: "Draft",
        for_review: "For Review",
        open: "Published",
        filled: "Filled",
        closed: "Closed",
        cancelled: "Cancelled",
    };
    return labels[status];
}

function statusTone(status: VacancyStatus): StatusTone {
    if (status === "open" || status === "filled") return "active";
    if (status === "draft" || status === "for_review") return "pending";
    if (status === "closed" || status === "cancelled") return "inactive";
    return "info";
}

function applicationStatusLabel(status: VacancyApplicationRecord["applicationStatus"]) {
    const labels: Record<VacancyApplicationRecord["applicationStatus"], string> = {
        submitted: "Submitted",
        screening: "Screening",
        interview: "Interview",
        for_offer: "For Offer",
        hired: "Hired",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
    };
    return labels[status];
}

function applicationTone(status: VacancyApplicationRecord["applicationStatus"]): StatusTone {
    if (status === "hired") return "active";
    if (status === "screening" || status === "interview" || status === "for_offer") return "pending";
    if (status === "rejected" || status === "withdrawn") return "inactive";
    return "info";
}

function applicantStatusLabel(status: VacancyApplicationRecord["applicantStatus"]) {
    const labels: Record<VacancyApplicationRecord["applicantStatus"], string> = {
        new: "New",
        screening: "Screening",
        shortlisted: "Shortlisted",
        hired: "Hired",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
    };
    return labels[status];
}

function applicantTone(status: VacancyApplicationRecord["applicantStatus"]): StatusTone {
    if (status === "hired") return "active";
    if (status === "screening" || status === "shortlisted") return "pending";
    if (status === "rejected" || status === "withdrawn") return "inactive";
    return "info";
}

function reviewConfirm(): NonNullable<ConfirmState> {
    return {
        action: "review",
        title: "Submit vacancy for review?",
        description: "HR staff can continue editing this vacancy, but it will be marked ready for internal review.",
        confirmLabel: "Submit for Review",
    };
}

function publishConfirm(): NonNullable<ConfirmState> {
    return {
        action: "publish",
        title: "Publish job vacancy?",
        description: "The system will validate required posting details before changing this vacancy to Published.",
        confirmLabel: "Publish Vacancy",
    };
}

function filledConfirm(): NonNullable<ConfirmState> {
    return {
        action: "filled",
        title: "Mark vacancy as filled?",
        description: "The vacancy will no longer be treated as accepting new candidate links.",
        confirmLabel: "Mark Filled",
    };
}

function closeConfirm(): NonNullable<ConfirmState> {
    return {
        action: "close",
        title: "Close this vacancy?",
        description: "Closed vacancies remain visible internally but should not receive new candidates.",
        confirmLabel: "Close Vacancy",
        destructive: true,
    };
}

function cancelConfirm(): NonNullable<ConfirmState> {
    return {
        action: "cancel",
        title: "Cancel this vacancy?",
        description: "Cancelled vacancies remain as internal history and should not receive new candidates.",
        confirmLabel: "Cancel Vacancy",
        destructive: true,
    };
}

async function runVacancyAction(action: NonNullable<ConfirmState>["action"], vacancyId: string) {
    if (action === "review") return submitVacancyForReviewAction(vacancyId);
    if (action === "publish") return publishVacancyAction(vacancyId);
    if (action === "filled") return markVacancyFilledAction(vacancyId);
    if (action === "close") return closeVacancyAction(vacancyId);
    return cancelVacancyAction(vacancyId);
}

function successMessage(action: NonNullable<ConfirmState>["action"]) {
    if (action === "review") return "Job vacancy submitted for review.";
    if (action === "publish") return "Job vacancy published successfully.";
    if (action === "filled") return "Job vacancy marked as filled.";
    if (action === "close") return "Job vacancy closed successfully.";
    return "Job vacancy cancelled successfully.";
}
