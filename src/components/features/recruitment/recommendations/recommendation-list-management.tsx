"use client";

import Link from "next/link";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import { buttonVariants } from "@/components/ui/button";
import type { RecommendationListItem } from "@/features/recruitment/recommendations/types";
import { mapRecommendationStatusToTone } from "@/features/recruitment/recommendations/status";

type RecommendationListManagementProps = {
  rows: RecommendationListItem[];
};

const columns = createAdminColumns<RecommendationListItem>([
  { key: "vacancy", header: "Vacancy", cell: (row) => row.vacancyTitle },
  { key: "applicant", header: "Applicant", cell: (row) => row.applicantName },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={mapRecommendationStatusToTone(row.status)}
        label={row.status}
      />
    ),
  },
  { key: "remarks", header: "Remarks", cell: (row) => row.remarks ?? "-" },
  {
    key: "actions",
    header: "Actions",
    cell: (row) => (
      <Link
        href={`/recruitment/recommendations/${row.id}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        View Detail
      </Link>
    ),
  },
]);

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "For Review", value: "for_review" },
  { label: "Endorsed", value: "endorsed" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function RecommendationListManagement({ rows }: RecommendationListManagementProps) {
  const tableState = useAdminTableState<RecommendationListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return row.vacancyTitle.toLowerCase().includes(q) || row.applicantName.toLowerCase().includes(q);
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      return status === "all" || row.status === status;
    },
  });

  return (
    <DataTableWrapper title="Appointment Recommendations" description="Track recommendation status and access detail records.">
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search vacancy or applicant..."
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
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
        canPrevPage={tableState.hasPrevPage}
        canNextPage={tableState.hasNextPage}
      />
    </DataTableWrapper>
  );
}
