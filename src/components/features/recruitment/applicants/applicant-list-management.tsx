"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import type { ApplicantListItem, ApplicantStatus } from "@/features/recruitment/applicants/types";

type ApplicantListManagementProps = {
  rows: ApplicantListItem[];
};

const columns = createAdminColumns<ApplicantListItem>([
  { key: "name", header: "Applicant", cell: (row) => <span className="font-medium">{row.fullName}</span> },
  { key: "email", header: "Email", cell: (row) => row.email ?? "-" },
  { key: "mobile", header: "Mobile", cell: (row) => row.mobileNo ?? "-" },
  { key: "scope", header: "Scope", cell: (row) => `${row.campusName}${row.officeName ? ` / ${row.officeName}` : ""}` },
  { key: "apps", header: "Applications", cell: (row) => String(row.applicationsCount) },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <AdminStatusChip
        tone={row.status === "hired" ? "active" : row.status === "screening" || row.status === "shortlisted" ? "pending" : row.status === "rejected" || row.status === "withdrawn" ? "inactive" : "info"}
        label={row.status}
      />
    ),
  },
]);

const statusOptions: Array<{ label: string; value: ApplicantStatus | "all" }> = [
  { label: "All Status", value: "all" },
  { label: "New", value: "new" },
  { label: "Screening", value: "screening" },
  { label: "Shortlisted", value: "shortlisted" },
  { label: "Hired", value: "hired" },
  { label: "Rejected", value: "rejected" },
  { label: "Withdrawn", value: "withdrawn" },
];

export function ApplicantListManagement({ rows }: ApplicantListManagementProps) {
  const router = useRouter();
  const tableState = useAdminTableState<ApplicantListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.fullName.toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        (row.mobileNo ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status !== "all" && row.status !== status) return false;
      return true;
    },
  });

  const rowActions = createRowActions<ApplicantListItem>(
    tableState.rows,
    (row) => row.id,
    () => [{ key: "view", label: "View Details" }, { key: "edit", label: "Edit Applicant" }]
  );

  return (
    <DataTableWrapper
      title="Applicant Tracking"
      description="Manage internal applicants and their linked applications."
      actions={<Button size="sm" onClick={() => router.push("/recruitment/applicants/new")}>New Applicant</Button>}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search applicant name, email, mobile..."
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
          if (input.actionKey === "view") return router.push(`/recruitment/applicants/${input.rowKey}`);
          if (input.actionKey === "edit") return router.push(`/recruitment/applicants/${input.rowKey}/edit`);
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
