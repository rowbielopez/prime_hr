"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import type { TrainingSessionListItem } from "@/features/learning/types";

type Props = { rows: TrainingSessionListItem[] };

const columns = createAdminColumns<TrainingSessionListItem>([
  { key: "title", header: "Session", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "program", header: "Program", cell: (row) => row.programTitle },
  { key: "campus", header: "Campus", cell: (row) => row.campusName },
  {
    key: "start",
    header: "Start",
    cell: (row) => new Date(row.startsAt).toLocaleString(),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={
          row.status === "completed"
            ? "active"
            : row.status === "cancelled"
              ? "inactive"
              : row.status === "in_progress"
                ? "pending"
                : "info"
        }
        label={row.status}
      />
    ),
  },
]);

export function TrainingSessionListManagement({ rows }: Props) {
  const router = useRouter();
  const tableState = useAdminTableState<TrainingSessionListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return row.title.toLowerCase().includes(q) || row.programTitle.toLowerCase().includes(q);
    },
  });
  const rowActions = createRowActions<TrainingSessionListItem>(
    tableState.rows,
    (row) => row.id,
    () => [
      { key: "view", label: "View" },
      { key: "edit", label: "Edit" },
    ]
  );

  return (
    <DataTableWrapper
      title="Training sessions"
      description="Scheduled offerings with participant rosters and attendance."
      actions={<Button size="sm" onClick={() => router.push("/learning/sessions/new")}>New session</Button>}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search sessions..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "view") return router.push(`/learning/sessions/${input.rowKey}`);
          if (input.actionKey === "edit") return router.push(`/learning/sessions/${input.rowKey}/edit`);
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
      />
    </DataTableWrapper>
  );
}
