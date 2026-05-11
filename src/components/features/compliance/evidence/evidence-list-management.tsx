"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import type { EvidenceListItem, EvidenceStatus, PrimeArea } from "@/features/compliance/evidence/types";

type EvidenceListManagementProps = {
  rows: EvidenceListItem[];
  areas: PrimeArea[];
};

const statusOptions: Array<{ label: string; value: EvidenceStatus | "all" }> = [
  { label: "All Status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const columns = createAdminColumns<EvidenceListItem>([
  { key: "title", header: "Evidence Title", cell: (row) => <span className="font-medium">{row.title}</span> },
  { key: "area", header: "Area", cell: (row) => row.areaName },
  { key: "indicator", header: "Indicator", cell: (row) => `${row.indicatorCode} - ${row.indicatorTitle}` },
  { key: "scope", header: "Scope", cell: (row) => `${row.campusName}${row.officeName ? ` / ${row.officeName}` : ""}` },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.status === "approved" ? "active" : row.status === "submitted" ? "pending" : row.status === "rejected" ? "inactive" : "info"}
        label={row.status}
      />
    ),
  },
  { key: "dueDate", header: "Due Date", cell: (row) => row.dueDate ?? "-" },
]);

export function EvidenceListManagement({ rows, areas }: EvidenceListManagementProps) {
  const router = useRouter();
  const tableState = useAdminTableState<EvidenceListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.indicatorCode.toLowerCase().includes(q) ||
        row.indicatorTitle.toLowerCase().includes(q) ||
        row.campusName.toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status !== "all" && row.status !== status) return false;
      const areaId = filters.areaId ?? "all";
      if (areaId !== "all" && row.areaName !== areas.find((a) => a.id === areaId)?.name) return false;
      return true;
    },
  });

  const areaOptions = useMemo(
    () => [{ label: "All Areas", value: "all" }, ...areas.map((area) => ({ label: `${area.code} - ${area.name}`, value: area.id }))],
    [areas]
  );

  const rowActions = createRowActions<EvidenceListItem>(
    tableState.rows,
    (row) => row.id,
    (row) => [
      { key: "view", label: "View Details" },
      { key: "edit", label: "Edit Entry", disabled: row.status === "approved" },
    ]
  );

  return (
    <DataTableWrapper
      title="Compliance Evidence Tracking"
      description="Track PRIME-HR evidence submissions, review status, and scope coverage."
      actions={<Button size="sm" onClick={() => router.push("/compliance/evidence/new")}>New Evidence</Button>}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search evidence title, indicator, or scope..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        filters={
          <>
            <FilterSelect
              value={tableState.filters.status ?? "all"}
              onChange={(value) => tableState.setFilter("status", value)}
              options={statusOptions}
            />
            <FilterSelect
              value={tableState.filters.areaId ?? "all"}
              onChange={(value) => tableState.setFilter("areaId", value)}
              options={areaOptions}
            />
            <ClearFiltersButton onClear={tableState.clearFilters} />
          </>
        }
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "view") {
            router.push(`/compliance/evidence/${input.rowKey}`);
            return;
          }
          if (input.actionKey === "edit") {
            router.push(`/compliance/evidence/${input.rowKey}/edit`);
          }
        }}
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
        canPrevPage={tableState.hasPrevPage}
        canNextPage={tableState.hasNextPage}
      />
    </DataTableWrapper>
  );
}
