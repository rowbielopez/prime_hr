"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import { canTransitionProgramStatus } from "@/features/learning/programs/program-status";
import { updateTrainingProgramStatusAction } from "@/features/learning/programs/actions";
import type { ProgramStatus, TrainingProgramListItem } from "@/features/learning/types";

type Props = { rows: TrainingProgramListItem[]; canWrite: boolean };

function formatScope(row: TrainingProgramListItem) {
  if (!row.campusName) return "Org-wide";
  if (!row.officeName) return row.campusName;
  return `${row.campusName} / ${row.officeName}`;
}

const columns = createAdminColumns<TrainingProgramListItem>([
  { key: "title", header: "Training", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "modality", header: "Modality", cell: (row) => row.modality },
  { key: "hours", header: "Hours", cell: (row) => String(row.durationHours) },
  {
    key: "scope",
    header: "Campus / office",
    cell: (row) => formatScope(row),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.status === "active" ? "active" : row.status === "archived" ? "inactive" : "info"}
        label={row.status}
      />
    ),
  },
]);

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "draft", value: "draft" },
  { label: "active", value: "active" },
  { label: "archived", value: "archived" },
];

export function TrainingProgramListManagement({ rows, canWrite }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const tableState = useAdminTableState<TrainingProgramListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        (row.campusName ?? "").toLowerCase().includes(q) ||
        (row.officeName ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status !== "all" && row.status !== status) return false;
      return true;
    },
  });
  const rowActions = createRowActions<TrainingProgramListItem>(
    tableState.rows,
    (row) => row.id,
    (row) => {
      const actions: { key: string; label: string; destructive?: boolean }[] = [{ key: "view", label: "View" }];
      if (canWrite) {
        actions.push({ key: "edit", label: "Edit" });
        if (canTransitionProgramStatus(row.status, "active") && row.status !== "active") {
          actions.push({ key: "activate", label: "Activate" });
        }
        if (canTransitionProgramStatus(row.status, "draft") && row.status !== "draft") {
          actions.push({ key: "draft", label: "Set draft" });
        }
        if (canTransitionProgramStatus(row.status, "archived") && row.status !== "archived") {
          actions.push({ key: "archive", label: "Archive", destructive: true });
        }
      }
      return actions;
    }
  );

  function setStatus(rowKey: string, status: ProgramStatus) {
    startTransition(async () => {
      const result = await updateTrainingProgramStatusAction(rowKey, status);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to update status.");
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  return (
    <DataTableWrapper
      title="Training catalog"
      description="Define trainings with campus and optional office scope. Status controls visibility to employees when active."
      actions={
        canWrite ? (
          <Button size="sm" onClick={() => router.push("/learning/programs/new")}>
            New training
          </Button>
        ) : null
      }
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search training, campus, office..."
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
          if (input.actionKey === "view") return router.push(`/learning/programs/${input.rowKey}`);
          if (input.actionKey === "edit") return router.push(`/learning/programs/${input.rowKey}/edit`);
          if (input.actionKey === "activate") return setStatus(input.rowKey, "active");
          if (input.actionKey === "draft") return setStatus(input.rowKey, "draft");
          if (input.actionKey === "archive") return setStatus(input.rowKey, "archived");
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
      />
    </DataTableWrapper>
  );
}
