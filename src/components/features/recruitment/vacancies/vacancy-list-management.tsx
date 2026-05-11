"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import type { VacancyListItem, VacancyStatus } from "@/features/recruitment/vacancies/types";
import { updateVacancyStatusAction } from "@/features/recruitment/vacancies/actions";
import { toast } from "sonner";
import { useTransition } from "react";

type VacancyListManagementProps = {
  rows: VacancyListItem[];
};

const columns = createAdminColumns<VacancyListItem>([
  { key: "title", header: "Vacancy", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "scope", header: "Scope", cell: (row) => `${row.campusName}${row.officeName ? ` / ${row.officeName}` : ""}` },
  { key: "employment", header: "Employment Type", cell: (row) => row.employmentType ?? "-" },
  { key: "items", header: "Items", cell: (row) => String(row.itemCount) },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.status === "open" ? "active" : row.status === "for_review" ? "pending" : row.status === "cancelled" ? "inactive" : "info"}
        label={row.status}
      />
    ),
  },
]);

const statusOptions: Array<{ label: string; value: VacancyStatus | "all" }> = [
  { label: "All Status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
  { label: "For Review", value: "for_review" },
  { label: "Filled", value: "filled" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];

export function VacancyListManagement({ rows }: VacancyListManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tableState = useAdminTableState<VacancyListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return row.title.toLowerCase().includes(q) || row.campusName.toLowerCase().includes(q) || (row.officeName ?? "").toLowerCase().includes(q);
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status !== "all" && row.status !== status) return false;
      return true;
    },
  });

  const rowActions = createRowActions<VacancyListItem>(
    tableState.rows,
    (row) => row.id,
    () => [
      { key: "view", label: "View Details" },
      { key: "edit", label: "Edit Vacancy" },
      { key: "mark-open", label: "Set Open" },
      { key: "mark-filled", label: "Set Filled" },
      { key: "mark-closed", label: "Set Closed", destructive: true },
    ]
  );

  function changeStatus(rowKey: string, status: VacancyStatus) {
    startTransition(async () => {
      const result = await updateVacancyStatusAction(rowKey, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Vacancy status updated to ${status}.`);
    });
  }

  return (
    <DataTableWrapper
      title="Vacancy Management"
      description="Manage staffing vacancies by campus and office."
      actions={<Button size="sm" onClick={() => router.push("/recruitment/vacancies/new")}>New Vacancy</Button>}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search vacancy, campus, office..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        filters={
          <>
            <FilterSelect
              value={tableState.filters.status ?? "all"}
              onChange={(value) => tableState.setFilter("status", value)}
              options={statusOptions}
            />
            <ClearFiltersButton onClear={tableState.clearFilters} />
          </>
        }
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "view") return router.push(`/recruitment/vacancies/${input.rowKey}`);
          if (input.actionKey === "edit") return router.push(`/recruitment/vacancies/${input.rowKey}/edit`);
          if (input.actionKey === "mark-open") return changeStatus(input.rowKey, "open");
          if (input.actionKey === "mark-filled") return changeStatus(input.rowKey, "filled");
          if (input.actionKey === "mark-closed") return changeStatus(input.rowKey, "closed");
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
        canPrevPage={tableState.hasPrevPage}
        canNextPage={tableState.hasNextPage}
        emptyTitle="No vacancies found"
        emptyDescription="Try adjusting filters or create a new vacancy."
      />
      {isPending ? <p className="sr-only">Updating vacancy status...</p> : null}
    </DataTableWrapper>
  );
}
