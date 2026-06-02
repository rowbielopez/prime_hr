"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileCheck2, FileClock, FileText, RotateCcw, SearchCheck, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ContentSection, EmptyState, FilterSelect, AdminDataTable, createAdminColumns, createRowActions, useAdminTableState } from "@/components/foundation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeRequestReviewDialog } from "@/components/features/requests/employee-request-review-dialog";
import { EmployeeRequestStatusBadge } from "@/components/features/requests/employee-request-status-badge";
import {
    approveEmployeeRequestAction,
    completeEmployeeRequestAction,
    getEmployeeRequestReviewDetailAction,
    rejectEmployeeRequestAction,
    returnEmployeeRequestForRevisionAction,
    startEmployeeRequestReviewAction,
} from "@/features/requests/requests-review.actions";
import {
    EMPLOYEE_REQUEST_STATUSES,
    EMPLOYEE_REQUEST_STATUS_LABELS,
    EMPLOYEE_REQUEST_TYPES,
    EMPLOYEE_REQUEST_TYPE_LABELS,
    HR_REQUEST_TRANSITIONS,
    type EmployeeRequestReviewDetail,
    type EmployeeRequestReviewListItem,
    type EmployeeRequestReviewSummary,
    type EmployeeRequestStatus,
} from "@/features/requests/types";
import { cn } from "@/lib/utils";

type Props = {
    items: EmployeeRequestReviewListItem[];
};

type DecisionAction = "approve" | "reject" | "return" | "complete";

type SummaryCard = {
    label: string;
    value: number;
    icon: typeof FileText;
    className: string;
};

function formatDate(input: string | null) {
    if (!input) return "-";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function dateTime(input: string | null) {
    return input ? new Date(input).getTime() : 0;
}

function buildSummary(items: EmployeeRequestReviewListItem[]): EmployeeRequestReviewSummary {
    return items.reduce<EmployeeRequestReviewSummary>(
        (summary, item) => {
            summary.total += 1;
            if (item.status === "submitted") summary.submitted += 1;
            if (item.status === "under_review") summary.underReview += 1;
            if (item.status === "returned_for_revision") summary.returned += 1;
            if (item.status === "approved") summary.approved += 1;
            if (item.status === "rejected") summary.rejected += 1;
            if (item.status === "completed") summary.completed += 1;
            return summary;
        },
        { total: 0, submitted: 0, underReview: 0, returned: 0, approved: 0, rejected: 0, completed: 0 }
    );
}

function dateFilterMatches(item: EmployeeRequestReviewListItem, value: string) {
    if (value === "all") return true;
    if (!item.submittedAt) return false;
    const submitted = new Date(item.submittedAt).getTime();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (value === "today") return new Date(item.submittedAt).toDateString() === new Date().toDateString();
    if (value === "7d") return submitted >= now - 7 * day;
    if (value === "30d") return submitted >= now - 30 * day;
    return true;
}

function canShow(status: EmployeeRequestStatus, next: EmployeeRequestStatus) {
    return HR_REQUEST_TRANSITIONS[status].includes(next);
}

const columns = createAdminColumns<EmployeeRequestReviewListItem>([
    {
        key: "employeeName",
        header: "Employee",
        cell: (row) => (
            <div>
                <p className="font-medium">{row.employeeName}</p>
                <p className="text-xs text-muted-foreground">{row.positionTitle || "No position on file"}</p>
            </div>
        ),
        sortAccessor: (row) => row.employeeName,
    },
    {
        key: "employeeNo",
        header: "Employee No.",
        cell: (row) => <span className="font-mono text-xs">{row.employeeNo || "-"}</span>,
        sortAccessor: (row) => row.employeeNo,
    },
    {
        key: "scope",
        header: "Campus / Office",
        cell: (row) => (
            <div>
                <p className="text-sm">{row.campusName}</p>
                <p className="text-xs text-muted-foreground">{row.officeName || "No office"}</p>
            </div>
        ),
    },
    {
        key: "requestType",
        header: "Request Type",
        cell: (row) => <span className="text-sm">{EMPLOYEE_REQUEST_TYPE_LABELS[row.requestType]}</span>,
        sortAccessor: (row) => EMPLOYEE_REQUEST_TYPE_LABELS[row.requestType],
    },
    {
        key: "subject",
        header: "Subject",
        cell: (row) => (
            <div className="max-w-72">
                <p className="truncate font-medium">{row.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{row.description}</p>
            </div>
        ),
        sortAccessor: (row) => row.subject,
    },
    {
        key: "status",
        header: "Status",
        cell: (row) => <EmployeeRequestStatusBadge status={row.status} />,
        sortAccessor: (row) => EMPLOYEE_REQUEST_STATUS_LABELS[row.status],
    },
    {
        key: "submittedAt",
        header: "Submitted",
        cell: (row) => formatDate(row.submittedAt),
        sortAccessor: (row) => dateTime(row.submittedAt),
    },
    {
        key: "updatedAt",
        header: "Updated",
        cell: (row) => formatDate(row.updatedAt),
        sortAccessor: (row) => dateTime(row.updatedAt),
    },
]);

export function EmployeeRequestsReviewQueue({ items }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<EmployeeRequestReviewDetail | null>(null);
    const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
    const [decisionTarget, setDecisionTarget] = useState<EmployeeRequestReviewListItem | null>(null);
    const [hrRemarks, setHrRemarks] = useState("");
    const [internalNotes, setInternalNotes] = useState("");

    const summary = useMemo(() => buildSummary(items), [items]);
    const campusOptions = useMemo(() => {
        const campuses = Array.from(new Map(items.map((item) => [item.campusId, item.campusName])).entries());
        return [{ label: "All campuses", value: "all" }, ...campuses.map(([value, label]) => ({ value, label }))];
    }, [items]);
    const officeOptions = useMemo(() => {
        const offices = Array.from(new Map(items.filter((item) => item.officeId).map((item) => [item.officeId!, item.officeName ?? "No office"])).entries());
        return [{ label: "All offices", value: "all" }, ...offices.map(([value, label]) => ({ value, label }))];
    }, [items]);

    const tableState = useAdminTableState<EmployeeRequestReviewListItem>({
        rows: items,
        initialPageSize: 10,
        initialFilters: { status: "all", type: "all", campus: "all", office: "all", submitted: "all" },
        initialSortKey: "updatedAt",
        initialSortDirection: "desc",
        sortAccessors: {
            employeeName: (row) => row.employeeName,
            employeeNo: (row) => row.employeeNo,
            requestType: (row) => EMPLOYEE_REQUEST_TYPE_LABELS[row.requestType],
            subject: (row) => row.subject,
            status: (row) => EMPLOYEE_REQUEST_STATUS_LABELS[row.status],
            submittedAt: (row) => dateTime(row.submittedAt),
            updatedAt: (row) => dateTime(row.updatedAt),
        },
        searchPredicate: (row, search) => {
            const query = search.trim().toLowerCase();
            if (!query) return true;
            return [row.employeeName, row.employeeNo, row.subject, row.description, row.campusName, row.officeName ?? ""]
                .some((value) => value.toLowerCase().includes(query));
        },
        filterPredicate: (row, filters) => {
            const status = filters.status ?? "all";
            const type = filters.type ?? "all";
            const campus = filters.campus ?? "all";
            const office = filters.office ?? "all";
            const submitted = filters.submitted ?? "all";
            return (status === "all" || row.status === status)
                && (type === "all" || row.requestType === type)
                && (campus === "all" || row.campusId === campus)
                && (office === "all" || row.officeId === office)
                && dateFilterMatches(row, submitted);
        },
    });

    const rowActions = createRowActions(tableState.rows, (row) => row.id, (row) => [
        { key: "view", label: "View / Review" },
        ...(canShow(row.status, "under_review") ? [{ key: "start", label: "Start Review" }] : []),
        ...(canShow(row.status, "approved") ? [{ key: "approve", label: "Approve" }] : []),
        ...(canShow(row.status, "returned_for_revision") ? [{ key: "return", label: "Return for Revision" }] : []),
        ...(canShow(row.status, "rejected") ? [{ key: "reject", label: "Reject", destructive: true }] : []),
        ...(canShow(row.status, "completed") ? [{ key: "complete", label: "Mark Completed" }] : []),
    ]);

    function openDetail(item: EmployeeRequestReviewListItem) {
        setDetailOpen(true);
        setDetail(null);
        startTransition(async () => {
            const result = await getEmployeeRequestReviewDetailAction(item.id);
            if (!result.ok) {
                setDetailOpen(false);
                toast.error(result.error);
                return;
            }
            setDetail(result.detail);
        });
    }

    function runStartReview(requestId: string) {
        startTransition(async () => {
            const result = await startEmployeeRequestReviewAction(requestId);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            setDetailOpen(false);
            setDetail(null);
            toast.success("Request is now under review.");
            router.refresh();
        });
    }

    function openDecision(action: DecisionAction, item: EmployeeRequestReviewListItem) {
        setDecisionAction(action);
        setDecisionTarget(item);
        setHrRemarks("");
        setInternalNotes("");
    }

    function handleRowAction({ rowKey, actionKey }: { rowKey: string; actionKey: string }) {
        const item = items.find((candidate) => candidate.id === rowKey);
        if (!item) return;
        if (actionKey === "view") openDetail(item);
        if (actionKey === "start") runStartReview(item.id);
        if (["approve", "reject", "return", "complete"].includes(actionKey)) openDecision(actionKey as DecisionAction, item);
    }

    function submitDecision() {
        if (!decisionAction || !decisionTarget) return;
        const payload = { requestId: decisionTarget.id, hrRemarks, internalNotes };
        startTransition(async () => {
            const result = decisionAction === "approve"
                ? await approveEmployeeRequestAction(payload)
                : decisionAction === "reject"
                    ? await rejectEmployeeRequestAction(payload)
                    : decisionAction === "return"
                        ? await returnEmployeeRequestForRevisionAction(payload)
                        : await completeEmployeeRequestAction(payload);

            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            const message = decisionAction === "approve"
                ? "Request approved successfully."
                : decisionAction === "reject"
                    ? "Request rejected successfully."
                    : decisionAction === "return"
                        ? "Request returned for revision."
                        : "Request marked as completed.";
            toast.success(message);
            setDecisionAction(null);
            setDecisionTarget(null);
            setDetailOpen(false);
            setDetail(null);
            router.refresh();
        });
    }

    const cards: SummaryCard[] = [
        { label: "Total Requests", value: summary.total, icon: FileText, className: "bg-muted text-foreground" },
        { label: "Submitted", value: summary.submitted, icon: FileClock, className: "bg-amber-50 text-amber-700" },
        { label: "Under Review", value: summary.underReview, icon: SearchCheck, className: "bg-blue-50 text-blue-700" },
        { label: "Returned", value: summary.returned, icon: RotateCcw, className: "bg-orange-50 text-orange-700" },
        { label: "Approved", value: summary.approved, icon: ShieldCheck, className: "bg-green-50 text-green-700" },
        { label: "Rejected", value: summary.rejected, icon: XCircle, className: "bg-red-50 text-red-700" },
        { label: "Completed", value: summary.completed, icon: FileCheck2, className: "bg-emerald-50 text-emerald-700" },
    ];

    const decisionTitle = decisionAction === "approve"
        ? "Approve Request"
        : decisionAction === "reject"
            ? "Reject Request"
            : decisionAction === "return"
                ? "Return for Revision"
                : "Mark Request as Completed";
    const remarksRequired = decisionAction === "reject" || decisionAction === "return";

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                {cards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="rounded-lg border bg-card p-3 shadow-premium-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">{item.label}</p>
                                    <p className="mt-1 text-2xl font-semibold tracking-normal">{item.value}</p>
                                </div>
                                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", item.className)}>
                                    <Icon className="size-4" aria-hidden />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ContentSection
                header={
                    <div>
                        <h2 className="text-base font-semibold">Request Review Queue</h2>
                        <p className="text-sm text-muted-foreground">Review employee-submitted requests, add HR remarks, and update request status.</p>
                    </div>
                }
            >
                {items.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardCheck className="size-5" aria-hidden />}
                        title="No employee requests found."
                        description="Submitted employee requests will appear here when they need HR review."
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {[
                                ["submitted", "Pending"],
                                ["under_review", "Under Review"],
                                ["returned_for_revision", "Returned"],
                                ["approved", "Approved"],
                                ["completed", "Completed"],
                                ["rejected", "Rejected"],
                            ].map(([value, label]) => (
                                <Button
                                    key={value}
                                    type="button"
                                    variant={tableState.filters.status === value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => tableState.setFilter("status", tableState.filters.status === value ? "all" : value)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <AdminDataTable
                            rows={tableState.rows}
                            columns={columns}
                            getRowKey={(row) => row.id}
                            searchPlaceholder="Search by employee, employee no., subject, or description..."
                            searchValue={tableState.search}
                            onSearchChange={tableState.setSearch}
                            filters={
                                <>
                                    <FilterSelect
                                        value={tableState.filters.status ?? "all"}
                                        onChange={(value) => tableState.setFilter("status", value)}
                                        options={[{ label: "All statuses", value: "all" }, ...EMPLOYEE_REQUEST_STATUSES]}
                                    />
                                    <FilterSelect
                                        value={tableState.filters.type ?? "all"}
                                        onChange={(value) => tableState.setFilter("type", value)}
                                        options={[{ label: "All request types", value: "all" }, ...EMPLOYEE_REQUEST_TYPES]}
                                        className="min-w-48"
                                    />
                                    <FilterSelect
                                        value={tableState.filters.campus ?? "all"}
                                        onChange={(value) => tableState.setFilter("campus", value)}
                                        options={campusOptions}
                                    />
                                    <FilterSelect
                                        value={tableState.filters.office ?? "all"}
                                        onChange={(value) => tableState.setFilter("office", value)}
                                        options={officeOptions}
                                    />
                                    <FilterSelect
                                        value={tableState.filters.submitted ?? "all"}
                                        onChange={(value) => tableState.setFilter("submitted", value)}
                                        options={[
                                            { label: "Any submitted date", value: "all" },
                                            { label: "Today", value: "today" },
                                            { label: "Last 7 days", value: "7d" },
                                            { label: "Last 30 days", value: "30d" },
                                        ]}
                                    />
                                </>
                            }
                            rowActionsByRowKey={rowActions}
                            onRowAction={handleRowAction}
                            paginationSummary={tableState.summary}
                            onPrevPage={tableState.prevPage}
                            onNextPage={tableState.nextPage}
                            canPrevPage={tableState.hasPrevPage}
                            canNextPage={tableState.hasNextPage}
                            pageSize={tableState.pageSize}
                            onPageSizeChange={tableState.setPageSize}
                            sortKey={tableState.sortKey}
                            sortDirection={tableState.sortDirection}
                            onSortChange={tableState.setSort}
                            emptyTitle={tableState.filters.status === "submitted" || tableState.filters.status === "under_review" ? "No pending requests require review." : "No employee requests found."}
                            emptyDescription="Try changing the filters or search terms."
                        />
                    </div>
                )}
            </ContentSection>

            <EmployeeRequestReviewDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                detail={detail}
                isLoading={isPending && !detail}
                onStartReview={runStartReview}
                onDecision={(action, nextDetail) => openDecision(action, nextDetail)}
                isPending={isPending}
            />

            <Dialog open={!!decisionAction} onOpenChange={(open) => { if (!open) setDecisionAction(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{decisionTitle}</DialogTitle>
                        <DialogDescription>
                            {decisionTarget ? `${decisionTarget.employeeName} - ${decisionTarget.subject}` : "Confirm the request decision."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="hr-remarks">HR remarks{remarksRequired ? " *" : ""}</Label>
                            <Textarea
                                id="hr-remarks"
                                value={hrRemarks}
                                onChange={(event) => setHrRemarks(event.target.value)}
                                placeholder={remarksRequired ? "Explain the decision for the employee..." : "Optional employee-visible remarks..."}
                                disabled={isPending}
                                className="min-h-[110px]"
                            />
                            <p className="text-xs text-muted-foreground">These remarks are visible to the employee in My Requests.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="internal-notes">Internal notes</Label>
                            <Textarea
                                id="internal-notes"
                                value={internalNotes}
                                onChange={(event) => setInternalNotes(event.target.value)}
                                placeholder="Optional HR-only notes..."
                                disabled={isPending}
                                className="min-h-[90px]"
                            />
                            <p className="text-xs text-muted-foreground">Internal notes are shown only in the HR review queue.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDecisionAction(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant={decisionAction === "reject" ? "destructive" : "default"}
                            onClick={submitDecision}
                            disabled={isPending || (remarksRequired && !hrRemarks.trim())}
                        >
                            {isPending ? "Saving..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}