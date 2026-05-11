"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import type { TrainingRequestListItem } from "@/features/learning/types";

type Props = { rows: TrainingRequestListItem[]; canNominate?: boolean };

const columns = createAdminColumns<TrainingRequestListItem>([
  {
    key: "kind",
    header: "Type",
    cell: (row) => (
      <span className="text-xs font-medium uppercase text-muted-foreground">
        {row.requestKind === "nomination" ? "Nomination" : "Self"}
      </span>
    ),
  },
  {
    key: "subject",
    header: "Employee",
    cell: (row) => (
      <div>
        <div className="font-medium">{row.requesterName}</div>
        <div className="text-xs text-muted-foreground">{row.campusName}</div>
      </div>
    ),
  },
  {
    key: "submitter",
    header: "Submitted by",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{row.submittedByName ?? "—"}</span>
    ),
  },
  {
    key: "what",
    header: "Training",
    cell: (row) => (
      <span>{row.programTitle ?? row.customTitle ?? "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Approval",
    cell: (row) => (
      <AdminStatusChip
        tone={
          row.status === "approved"
            ? "active"
            : row.status === "rejected" || row.status === "withdrawn"
              ? "inactive"
              : row.status === "submitted" || row.status === "under_review"
                ? "pending"
                : "info"
        }
        label={row.status}
      />
    ),
  },
]);

const statusFilters = [
  { label: "All", value: "all" },
  { label: "submitted", value: "submitted" },
  { label: "under_review", value: "under_review" },
  { label: "approved", value: "approved" },
  { label: "rejected", value: "rejected" },
  { label: "withdrawn", value: "withdrawn" },
];

export function TrainingRequestListManagement({ rows, canNominate }: Props) {
  const router = useRouter();
  const tableState = useAdminTableState<TrainingRequestListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.requesterName.toLowerCase().includes(q) ||
        (row.submittedByName ?? "").toLowerCase().includes(q) ||
        (row.programTitle ?? "").toLowerCase().includes(q) ||
        (row.customTitle ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const st = filters.status ?? "all";
      if (st !== "all" && row.status !== st) return false;
      return true;
    },
  });
  const rowActions = createRowActions<TrainingRequestListItem>(
    tableState.rows,
    (row) => row.id,
    () => [{ key: "open", label: "Review" }]
  );

  return (
    <DataTableWrapper
      title="Training requests & nominations"
      description="Self-service requests and manager/HR nominations. Review to set approval status."
      actions={
        canNominate ? (
          <Link href="/learning/requests/nominate" className={cn(buttonVariants({ size: "sm" }))}>
            Nominate employee
          </Link>
        ) : null
      }
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search employee, submitter, or training..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        filters={
          <>
            <FilterSelect
              value={tableState.filters.status ?? "all"}
              onChange={(value) => tableState.setFilter("status", value)}
              options={statusFilters}
            />
            <ClearFiltersButton onClear={tableState.clearFilters} />
          </>
        }
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "open") return router.push(`/learning/requests/${input.rowKey}`);
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
      />
    </DataTableWrapper>
  );
}
