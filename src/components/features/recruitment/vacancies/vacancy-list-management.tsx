"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, CheckCircle2, ClipboardList, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DataTableWrapper } from "@/components/foundation";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import type { VacancyListItem, VacancyStatus } from "@/features/recruitment/vacancies/types";
import {
    cancelVacancyAction,
    closeVacancyAction,
    markVacancyFilledAction,
    publishVacancyAction,
    submitVacancyForReviewAction,
} from "@/features/recruitment/vacancies/actions";
import type { StatusTone } from "@/components/foundation/feedback/status-badge";

const ALL = "all";

type VacancyListManagementProps = {
    rows: VacancyListItem[];
};

type ConfirmState = {
    vacancyId: string;
    action: "publish" | "review" | "filled" | "close" | "cancel";
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
} | null;

const statusOptions: Array<{ label: string; value: VacancyStatus | typeof ALL }> = [
    { label: "All Status", value: ALL },
    { label: "Draft", value: "draft" },
    { label: "For Review", value: "for_review" },
    { label: "Published", value: "open" },
    { label: "Filled", value: "filled" },
    { label: "Closed", value: "closed" },
    { label: "Cancelled", value: "cancelled" },
];

const sortOptions = [
    { label: "Newest First", value: "updated" },
    { label: "Deadline Soonest", value: "deadline" },
    { label: "Status", value: "status" },
    { label: "Vacancy Title", value: "title" },
    { label: "Campus", value: "campus" },
    { label: "Applicants", value: "applicants" },
];

const columns = createAdminColumns<VacancyListItem>([
    {
        key: "title",
        header: "Vacancy",
        sortAccessor: (row) => row.title,
        cell: (row) => (
            <div className="min-w-48">
                <p className="font-medium text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.plantillaItemNo ?? "No plantilla item"}</p>
            </div>
        ),
    },
    {
        key: "scope",
        header: "Campus / Office",
        sortAccessor: (row) => `${row.campusName} ${row.officeName ?? ""}`,
        cell: (row) => (
            <div className="min-w-44 text-sm">
                <p>{row.campusName}</p>
                <p className="text-xs text-muted-foreground">{row.officeName ?? "No office assigned"}</p>
            </div>
        ),
    },
    { key: "employment", header: "Employment Type", sortAccessor: (row) => row.employmentType ?? "", cell: (row) => row.employmentType ?? "-" },
    { key: "items", header: "Slots", sortAccessor: (row) => row.itemCount, cell: (row) => String(row.itemCount) },
    {
        key: "status",
        header: "Status",
        sortAccessor: (row) => statusLabel(row.status),
        cell: (row) => <AdminStatusChip tone={statusTone(row.status)} label={statusLabel(row.status)} />,
    },
    {
        key: "dates",
        header: "Posting / Deadline",
        sortAccessor: (row) => row.closingAt ?? "9999-12-31",
        cell: (row) => (
            <div className="min-w-36 text-sm">
                <p>{row.postedAt ?? "No posting date"}</p>
                <p className={isClosingSoon(row) ? "text-xs font-medium text-amber-700" : "text-xs text-muted-foreground"}>
                    {row.closingAt ? `Deadline: ${row.closingAt}` : "No deadline"}
                </p>
            </div>
        ),
    },
    {
        key: "applicants",
        header: "Applicants",
        sortAccessor: (row) => row.applicantsCount,
        cell: (row) => (
            <div className="text-sm">
                <p className="font-medium">{row.applicantsCount}</p>
                <p className="text-xs text-muted-foreground">{row.applicationStatusCounts.hired} hired</p>
            </div>
        ),
    },
    {
        key: "updated",
        header: "Last Updated",
        sortAccessor: (row) => row.updatedAt,
        cell: (row) => row.updatedAt.slice(0, 10),
    },
]);

export function VacancyListManagement({ rows }: VacancyListManagementProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [confirmState, setConfirmState] = useState<ConfirmState>(null);
    const campusOptions = useMemo(() => uniqueOptions(rows.map((row) => row.campusName)), [rows]);
    const officeOptions = useMemo(() => uniqueOptions(rows.map((row) => row.officeName).filter(Boolean) as string[]), [rows]);
    const employmentOptions = useMemo(() => uniqueOptions(rows.map((row) => row.employmentType).filter(Boolean) as string[]), [rows]);
    const summary = useMemo(() => buildSummary(rows), [rows]);

    const tableState = useAdminTableState<VacancyListItem>({
        rows,
        initialPageSize: 10,
        initialSortKey: "updated",
        initialSortDirection: "desc",
        sortAccessors: {
            updated: (row) => row.updatedAt,
            deadline: (row) => row.closingAt ?? "9999-12-31",
            status: (row) => statusLabel(row.status),
            title: (row) => row.title,
            campus: (row) => row.campusName,
            applicants: (row) => row.applicantsCount,
        },
        searchPredicate: (row, search) => {
            const query = search.trim().toLowerCase();
            if (!query) return true;
            return [row.title, row.campusName, row.officeName, row.employmentType, row.plantillaItemNo]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query));
        },
        filterPredicate: (row, filters) => {
            if ((filters.status ?? ALL) !== ALL && row.status !== filters.status) return false;
            if ((filters.campus ?? ALL) !== ALL && row.campusName !== filters.campus) return false;
            if ((filters.office ?? ALL) !== ALL && row.officeName !== filters.office) return false;
            if ((filters.employment ?? ALL) !== ALL && row.employmentType !== filters.employment) return false;
            if ((filters.deadline ?? ALL) === "closing_soon" && !isClosingSoon(row)) return false;
            if ((filters.deadline ?? ALL) === "expired" && !isExpired(row)) return false;
            if ((filters.filled ?? ALL) === "filled" && row.status !== "filled") return false;
            if ((filters.filled ?? ALL) === "unfilled" && row.status === "filled") return false;
            return true;
        },
    });

    const rowActions = createRowActions<VacancyListItem>(
        tableState.rows,
        (row) => row.id,
        (row) => [
            { key: "view", label: "View Details" },
            { key: "edit", label: "Edit Vacancy", disabled: isTerminal(row.status) },
            { key: "preview", label: "Preview Posting" },
            { key: "review", label: "Submit for Review", disabled: row.status !== "draft" },
            { key: "publish", label: "Publish", disabled: row.status === "open" || isTerminal(row.status) },
            { key: "applicants", label: "View Applicants" },
            { key: "add-candidate", label: "Add Candidate", disabled: row.status !== "open" },
            { key: "filled", label: "Mark Filled", disabled: row.status !== "open" },
            { key: "close", label: "Close Vacancy", destructive: true, disabled: row.status === "closed" || row.status === "filled" || row.status === "cancelled" },
            { key: "cancel", label: "Cancel Vacancy", destructive: true, disabled: row.status === "cancelled" || row.status === "filled" || row.status === "closed" },
        ]
    );

    function runConfirmedAction() {
        if (!confirmState) return;
        const state = confirmState;
        startTransition(async () => {
            const result = await runVacancyAction(state.action, state.vacancyId);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success(successMessage(state.action));
            setConfirmState(null);
            router.refresh();
        });
    }

    function handleRowAction(input: { rowKey: string; actionKey: string }) {
        const row = rows.find((item) => item.id === input.rowKey);
        if (!row) return;
        if (input.actionKey === "view") return router.push(`/recruitment/vacancies/${row.id}`);
        if (input.actionKey === "edit") return router.push(`/recruitment/vacancies/${row.id}/edit`);
        if (input.actionKey === "preview") return router.push(`/recruitment/vacancies/${row.id}#posting-preview`);
        if (input.actionKey === "applicants") return router.push(`/recruitment/vacancies/${row.id}#linked-candidates`);
        if (input.actionKey === "add-candidate") return router.push(`/recruitment/vacancies/${row.id}#add-candidate`);
        if (input.actionKey === "review") {
            setConfirmState({
                vacancyId: row.id,
                action: "review",
                title: "Submit vacancy for review?",
                description: "HR staff can continue editing this vacancy, but it will be marked ready for internal review.",
                confirmLabel: "Submit for Review",
            });
        }
        if (input.actionKey === "publish") {
            setConfirmState({
                vacancyId: row.id,
                action: "publish",
                title: "Publish job vacancy?",
                description: "This marks the vacancy as published and ready to receive linked candidates.",
                confirmLabel: "Publish Vacancy",
            });
        }
        if (input.actionKey === "filled") {
            setConfirmState({
                vacancyId: row.id,
                action: "filled",
                title: "Mark vacancy as filled?",
                description: "The vacancy will no longer be treated as accepting new candidate links.",
                confirmLabel: "Mark Filled",
            });
        }
        if (input.actionKey === "close") {
            setConfirmState({
                vacancyId: row.id,
                action: "close",
                title: "Close this vacancy?",
                description: "Closed vacancies remain visible internally but should not receive new candidates.",
                confirmLabel: "Close Vacancy",
                destructive: true,
            });
        }
        if (input.actionKey === "cancel") {
            setConfirmState({
                vacancyId: row.id,
                action: "cancel",
                title: "Cancel this vacancy?",
                description: "Cancelled vacancies remain as internal history and should not receive new candidates.",
                confirmLabel: "Cancel Vacancy",
                destructive: true,
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <SummaryCard label="Total Vacancies" value={summary.total} icon={<BriefcaseBusiness className="size-4" />} />
                <SummaryCard label="Draft" value={summary.draft} icon={<FileText className="size-4" />} />
                <SummaryCard label="Published" value={summary.published} icon={<ClipboardList className="size-4" />} />
                <SummaryCard label="Closing Soon" value={summary.closingSoon} icon={<CalendarClock className="size-4" />} />
                <SummaryCard label="Filled / Closed" value={`${summary.filled}/${summary.closed}`} icon={<CheckCircle2 className="size-4" />} />
                <SummaryCard label="Total Applicants" value={summary.applicants} icon={<Users className="size-4" />} />
            </div>

            <DataTableWrapper
                title="Vacancy Management"
                description="Create, publish, track, and close job vacancies by campus and office."
                actions={<Button size="sm" onClick={() => router.push("/recruitment/vacancies/new")}>Create Job Vacancy</Button>}
            >
                <AdminDataTable
                    rows={tableState.rows}
                    columns={columns}
                    getRowKey={(row) => row.id}
                    searchPlaceholder="Search vacancy, position, campus, office..."
                    searchValue={tableState.search}
                    onSearchChange={tableState.setSearch}
                    filters={
                        <>
                            <FilterSelect value={tableState.filters.status ?? ALL} onChange={(value) => tableState.setFilter("status", value)} options={statusOptions} />
                            <FilterSelect value={tableState.filters.campus ?? ALL} onChange={(value) => tableState.setFilter("campus", value)} options={[{ label: "All Campuses", value: ALL }, ...campusOptions]} />
                            <FilterSelect value={tableState.filters.office ?? ALL} onChange={(value) => tableState.setFilter("office", value)} options={[{ label: "All Offices", value: ALL }, ...officeOptions]} />
                            <FilterSelect value={tableState.filters.employment ?? ALL} onChange={(value) => tableState.setFilter("employment", value)} options={[{ label: "All Employment Types", value: ALL }, ...employmentOptions]} />
                            <FilterSelect
                                value={tableState.filters.deadline ?? ALL}
                                onChange={(value) => tableState.setFilter("deadline", value)}
                                options={[
                                    { label: "All Deadlines", value: ALL },
                                    { label: "Closing Soon", value: "closing_soon" },
                                    { label: "Expired", value: "expired" },
                                ]}
                            />
                            <FilterSelect
                                value={tableState.filters.filled ?? ALL}
                                onChange={(value) => tableState.setFilter("filled", value)}
                                options={[
                                    { label: "All Fill Status", value: ALL },
                                    { label: "Filled", value: "filled" },
                                    { label: "Unfilled", value: "unfilled" },
                                ]}
                            />
                            <FilterSelect value={tableState.sortKey ?? "updated"} onChange={tableState.setSort} options={sortOptions} />
                            <ClearFiltersButton onClear={tableState.clearFilters} />
                        </>
                    }
                    rowActionsByRowKey={rowActions}
                    onRowAction={handleRowAction}
                    sortKey={tableState.sortKey}
                    sortDirection={tableState.sortDirection}
                    onSortChange={tableState.setSort}
                    paginationSummary={tableState.summary}
                    onPrevPage={tableState.prevPage}
                    onNextPage={tableState.nextPage}
                    canPrevPage={tableState.hasPrevPage}
                    canNextPage={tableState.hasNextPage}
                    pageSize={tableState.pageSize}
                    onPageSizeChange={tableState.setPageSize}
                    emptyTitle="No job vacancies found."
                    emptyDescription="No job vacancies have been created yet."
                    emptyAction={<Button size="sm" onClick={() => router.push("/recruitment/vacancies/new")}>Create Job Vacancy</Button>}
                />
                {isPending ? <p className="sr-only">Updating vacancy workflow...</p> : null}
            </DataTableWrapper>

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
        </div>
    );
}

function SummaryCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
    return (
        <div className="rounded-lg border premium-border bg-surface-panel p-4 shadow-premium-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <span className="text-muted-foreground">{icon}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
    );
}

function uniqueOptions(values: string[]) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
}

function buildSummary(rows: VacancyListItem[]) {
    return rows.reduce(
        (summary, row) => ({
            total: summary.total + 1,
            draft: summary.draft + (row.status === "draft" ? 1 : 0),
            published: summary.published + (row.status === "open" ? 1 : 0),
            closingSoon: summary.closingSoon + (isClosingSoon(row) ? 1 : 0),
            filled: summary.filled + (row.status === "filled" ? 1 : 0),
            closed: summary.closed + (row.status === "closed" ? 1 : 0),
            applicants: summary.applicants + row.applicantsCount,
        }),
        { total: 0, draft: 0, published: 0, closingSoon: 0, filled: 0, closed: 0, applicants: 0 }
    );
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function isClosingSoon(row: VacancyListItem) {
    if (!row.closingAt || row.status !== "open") return false;
    const today = new Date(todayDate());
    const closing = new Date(row.closingAt);
    const diffDays = Math.ceil((closing.getTime() - today.getTime()) / 86_400_000);
    return diffDays >= 0 && diffDays <= 7;
}

function isExpired(row: VacancyListItem) {
    return Boolean(row.closingAt && row.closingAt < todayDate() && row.status === "open");
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
    if (status === "for_review" || status === "draft") return "pending";
    if (status === "closed" || status === "cancelled") return "inactive";
    return "info";
}

async function runVacancyAction(action: NonNullable<ConfirmState>["action"], vacancyId: string) {
    if (action === "publish") return publishVacancyAction(vacancyId);
    if (action === "review") return submitVacancyForReviewAction(vacancyId);
    if (action === "filled") return markVacancyFilledAction(vacancyId);
    if (action === "close") return closeVacancyAction(vacancyId);
    return cancelVacancyAction(vacancyId);
}

function successMessage(action: NonNullable<ConfirmState>["action"]) {
    if (action === "publish") return "Job vacancy published successfully.";
    if (action === "review") return "Job vacancy submitted for review.";
    if (action === "filled") return "Job vacancy marked as filled.";
    if (action === "close") return "Job vacancy closed successfully.";
    return "Job vacancy cancelled successfully.";
}
