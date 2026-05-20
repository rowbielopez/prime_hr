"use client";

import { useRouter } from "next/navigation";
import { CalendarCheck, FileWarning, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import type { ServiceRecordEmployeeSummary, ServiceRecordListSummary } from "@/features/service-records/types";

type Props = {
    rows: ServiceRecordEmployeeSummary[];
    summary: ServiceRecordListSummary;
};

function toTokens(value: string) {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
}

function matchesByTokens(source: string, query: string) {
    const queryTokens = toTokens(query);
    if (queryTokens.length === 0) return true;
    const sourceTokens = new Set(toTokens(source));
    return queryTokens.every((token) => sourceTokens.has(token));
}

function formatDate(input: string | null) {
    if (!input) return "—";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

const columns = createAdminColumns<ServiceRecordEmployeeSummary>([
    { key: "employee", header: "Employee", cell: (row) => <div><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">No. {row.employeeNo}</p></div>, sortAccessor: (row) => row.fullName },
    { key: "scope", header: "Campus / Office", cell: (row) => `${row.campusName}${row.officeName ? ` / ${row.officeName}` : ""}` },
    { key: "position", header: "Current Position", cell: (row) => row.currentPosition ?? "—" },
    { key: "status", header: "Employment Status", cell: (row) => <AdminStatusChip tone={row.employmentStatus === "active" ? "active" : row.employmentStatus === "on_leave" ? "pending" : "inactive"} label={row.employmentStatus.replace("_", " ")} /> },
    { key: "entries", header: "Entries", cell: (row) => String(row.entriesCount), sortAccessor: (row) => row.entriesCount },
    { key: "latest", header: "Latest Service Date", cell: (row) => formatDate(row.latestServiceDate), sortAccessor: (row) => row.latestServiceDate ?? "" },
    { key: "quality", header: "Quality", cell: (row) => row.needsReview ? <AdminStatusChip tone="pending" label="Needs Review" /> : <AdminStatusChip tone="active" label="Ready" /> },
]);

export function ServiceRecordsListManagement({ rows, summary }: Props) {
    const router = useRouter();
    const tableState = useAdminTableState<ServiceRecordEmployeeSummary>({
        rows,
        initialPageSize: 10,
        initialSortKey: "employee",
        sortAccessors: {
            employee: (row) => row.fullName,
            entries: (row) => row.entriesCount,
            latest: (row) => row.latestServiceDate ?? "",
        },
        searchPredicate: (row, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            if (matchesByTokens(row.fullName, q)) return true;
            return row.employeeNo.toLowerCase().includes(q) || (row.currentPosition ?? "").toLowerCase().includes(q);
        },
        filterPredicate: (row, filters) => {
            if (filters.status && filters.status !== "all" && row.employmentStatus !== filters.status) return false;
            if (filters.recordState === "with" && row.entriesCount === 0) return false;
            if (filters.recordState === "missing" && row.entriesCount > 0) return false;
            if (filters.recordState === "review" && !row.needsReview) return false;
            return true;
        },
    });

    const rowActions = createRowActions(tableState.rows, (row) => row.employeeId, () => [
        { key: "view", label: "View Service Record" },
        { key: "print", label: "Print" },
    ]);

    return (
        <div className="space-y-4">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard title="Employees with Records" value={summary.totalEmployeesWithRecords} icon={<Users className="size-4" />} />
                <SummaryCard title="Active Employees" value={summary.activeEmployees} icon={<Users className="size-4" />} />
                <SummaryCard title="Updated This Month" value={summary.recordsUpdatedThisMonth} icon={<CalendarCheck className="size-4" />} />
                <SummaryCard title="Missing Records" value={summary.employeesMissingServiceRecords} icon={<FileWarning className="size-4" />} />
                <SummaryCard title="Needs Review" value={summary.recordsNeedingReview} icon={<FileWarning className="size-4" />} />
            </section>

            <DataTableWrapper title="Service Records" description="Official HR-managed employment history and appointment movement records.">
                <AdminDataTable
                    rows={tableState.rows}
                    columns={columns}
                    getRowKey={(row) => row.employeeId}
                    searchPlaceholder="Search employee name, employee no., or position..."
                    searchValue={tableState.search}
                    onSearchChange={tableState.setSearch}
                    filters={
                        <>
                            <FilterSelect
                                value={tableState.filters.status ?? "all"}
                                onChange={(value) => tableState.setFilter("status", value)}
                                options={[{ label: "All Status", value: "all" }, { label: "Active", value: "active" }, { label: "On Leave", value: "on_leave" }, { label: "Separated", value: "separated" }, { label: "Retired", value: "retired" }]}
                            />
                            <FilterSelect
                                value={tableState.filters.recordState ?? "all"}
                                onChange={(value) => tableState.setFilter("recordState", value)}
                                options={[{ label: "All Records", value: "all" }, { label: "Has Service Record", value: "with" }, { label: "Missing Service Record", value: "missing" }, { label: "Needs Review", value: "review" }]}
                            />
                            <ClearFiltersButton onClear={tableState.clearFilters} />
                        </>
                    }
                    actions={
                        <Button size="sm" variant="outline" onClick={() => router.push("/employees")}>Select Employee</Button>
                    }
                    rowActionsByRowKey={rowActions}
                    onRowAction={({ rowKey, actionKey }) => {
                        if (actionKey === "view") router.push(`/service-records/${rowKey}`);
                        if (actionKey === "print") window.open(`/service-records/${rowKey}/print`, "_blank", "noopener,noreferrer");
                    }}
                    emptyTitle="No service records found"
                    emptyDescription="No employees match your search or filter settings."
                    paginationSummary={tableState.summary}
                    onPrevPage={tableState.prevPage}
                    onNextPage={tableState.nextPage}
                    canPrevPage={tableState.hasPrevPage}
                    canNextPage={tableState.hasNextPage}
                    sortKey={tableState.sortKey}
                    sortDirection={tableState.sortDirection}
                    onSortChange={tableState.setSort}
                    pageSize={tableState.pageSize}
                    onPageSizeChange={tableState.setPageSize}
                />
            </DataTableWrapper>
        </div>
    );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
                <span className="text-muted-foreground">{icon}</span>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
        </Card>
    );
}