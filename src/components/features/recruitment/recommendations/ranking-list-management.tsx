"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { createAdminColumns } from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import { ClearFiltersButton, FilterSelect } from "@/components/foundation/data/filter-controls";
import { Button } from "@/components/ui/button";
import type { RankingListItem } from "@/features/recruitment/recommendations/types";
import { upsertRankingEntryAction } from "@/features/recruitment/recommendations/actions";
import { mapRecommendationStatusToTone } from "@/features/recruitment/recommendations/status";

type RankingListManagementProps = {
  rows: RankingListItem[];
};

const columns = createAdminColumns<RankingListItem>([
  { key: "vacancy", header: "Vacancy", cell: (row) => row.vacancyTitle },
  { key: "applicant", header: "Applicant", cell: (row) => row.applicantName },
  { key: "rank", header: "Rank", cell: (row) => String(row.rankNo) },
  { key: "score", header: "Score", cell: (row) => (row.score ?? "-").toString() },
  {
    key: "status",
    header: "Recommendation",
    cell: (row) => (
      <AdminStatusChip
        tone={mapRecommendationStatusToTone(row.recommendationStatus)}
        label={row.recommendationStatus}
      />
    ),
  },
  { key: "remarks", header: "Remarks", cell: (row) => row.remarks ?? "-" },
]);

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "For Review", value: "for_review" },
  { label: "Endorsed", value: "endorsed" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function RankingListManagement({ rows }: RankingListManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRemarks, setEditRemarks] = useState("");
  const tableState = useAdminTableState<RankingListItem>({
    rows,
    initialPageSize: 10,
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return row.vacancyTitle.toLowerCase().includes(q) || row.applicantName.toLowerCase().includes(q);
    },
    filterPredicate: (row, filters) => {
      const status = filters.status ?? "all";
      if (status !== "all" && row.recommendationStatus !== status) return false;
      return true;
    },
  });

  function saveRemarks(row: RankingListItem) {
    startTransition(async () => {
      const result = await upsertRankingEntryAction({
        vacancyId: row.vacancyId,
        applicantId: row.applicantId,
        rankNo: row.rankNo,
        score: row.score,
        remarks: editRemarks || null,
        recommendationStatus: row.recommendationStatus,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ranking remarks updated.");
      setEditingId(null);
      setEditRemarks("");
    });
  }

  return (
    <DataTableWrapper
      title="Ranking Summary by Vacancy"
      description="View applicant ranking, remarks, and recommendation status."
    >
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
      <div className="mt-4 space-y-2">
        {tableState.rows.map((row) => (
          <div key={`remarks-${row.id}`} className="rounded border p-2">
            <p className="text-xs font-medium">{row.vacancyTitle} - {row.applicantName}</p>
            {editingId === row.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  className="h-9 flex-1 rounded-md border px-3 text-sm"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Update remarks"
                />
                <Button size="sm" onClick={() => saveRemarks(row)} disabled={isPending}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={isPending}>Cancel</Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{row.remarks ?? "No remarks."}</p>
                <Button size="sm" variant="outline" onClick={() => { setEditingId(row.id); setEditRemarks(row.remarks ?? ""); }}>
                  Edit Remarks
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DataTableWrapper>
  );
}
