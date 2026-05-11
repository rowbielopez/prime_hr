"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import type { AnnualPlanListItem } from "@/features/learning/types";

type Props = { rows: AnnualPlanListItem[] };

const columns = createAdminColumns<AnnualPlanListItem>([
  { key: "title", header: "Plan", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "year", header: "Year", cell: (row) => String(row.year) },
  { key: "campus", header: "Campus", cell: (row) => row.campusName },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.status === "active" ? "active" : row.status === "closed" ? "inactive" : "info"}
        label={row.status}
      />
    ),
  },
]);

export function AnnualPlanListManagement({ rows }: Props) {
  const router = useRouter();
  const tableState = useAdminTableState<AnnualPlanListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return row.title.toLowerCase().includes(q) || row.campusName.toLowerCase().includes(q);
    },
  });
  const rowActions = createRowActions<AnnualPlanListItem>(
    tableState.rows,
    (row) => row.id,
    () => [
      { key: "view", label: "View" },
      { key: "edit", label: "Edit" },
    ]
  );

  return (
    <DataTableWrapper
      title="Annual training plans"
      description="Campus-scoped plans align catalog programs to quarters."
      actions={<Button size="sm" onClick={() => router.push("/learning/plans/new")}>New plan</Button>}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search plans..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "view") return router.push(`/learning/plans/${input.rowKey}`);
          if (input.actionKey === "edit") return router.push(`/learning/plans/${input.rowKey}/edit`);
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
      />
    </DataTableWrapper>
  );
}
