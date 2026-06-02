"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
import {
  AdminDataTable,
  AdminStatusChip,
} from "@/components/foundation/data/admin-data-table";
import {
  createAdminColumns,
  createRowActions,
} from "@/components/foundation/data/admin-data-table.helpers";
import { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";
import {
  ClearFiltersButton,
  FilterSelect,
} from "@/components/foundation/data/filter-controls";
import { cn } from "@/lib/utils";
import type {
  ApplicantListItem,
  ApplicantStatus,
  ApplicationStatus,
} from "@/features/recruitment/applicants/types";
import type { StatusTone } from "@/components/foundation/feedback/status-badge";

// ── Labels & tones ─────────────────────────────────────────────────────────────

const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  new: "New",
  screening: "Screening",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const APPLICANT_STATUS_TONE: Record<ApplicantStatus, StatusTone> = {
  new: "info",
  screening: "pending",
  shortlisted: "warning",
  hired: "active",
  rejected: "error",
  withdrawn: "inactive",
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  screening: "Screening",
  interview: "Interview",
  for_offer: "For Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const APPLICATION_STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  submitted: "info",
  screening: "pending",
  interview: "warning",
  for_offer: "warning",
  hired: "active",
  rejected: "error",
  withdrawn: "inactive",
};

const TABS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "screening", label: "Screening" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function resolveSourceLabel(source: string | null): string | null {
  if (!source) return null;
  if (source === "public_careers") return "Public";
  return source;
}

function resolveSourceTone(source: string | null): StatusTone {
  if (source === "public_careers") return "info";
  return "inactive";
}

// ── Columns ────────────────────────────────────────────────────────────────────

const columns = createAdminColumns<ApplicantListItem>([
  {
    key: "applicant",
    header: "Applicant",
    sortAccessor: (row) => row.fullName,
    cell: (row) => (
      <div className="min-w-[160px]">
        <p className="text-sm font-medium leading-tight">{row.fullName}</p>
        {row.email ? (
          <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
            {row.email}
          </p>
        ) : null}
        {row.mobileNo ? (
          <p className="text-xs text-muted-foreground">{row.mobileNo}</p>
        ) : null}
      </div>
    ),
  },
  {
    key: "position",
    header: "Position / Plantilla",
    cell: (row) =>
      row.latestVacancyTitle ? (
        <div className="min-w-[180px]">
          <p className="text-sm font-medium leading-tight">
            {row.latestVacancyTitle}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plantilla: {row.latestPlantillaItemNo ?? "Not specified"}
          </p>
          {row.latestVacancyEmploymentType ? (
            <p className="text-xs text-muted-foreground">
              {row.latestVacancyEmploymentType}
            </p>
          ) : null}
        </div>
      ) : (
        <span className="text-xs italic text-muted-foreground">
          No application linked
        </span>
      ),
  },
  {
    key: "campus",
    header: "Campus / Office",
    sortAccessor: (row) => row.campusName,
    cell: (row) => (
      <div className="min-w-[140px]">
        <p className="text-sm leading-tight">{row.campusName}</p>
        {row.officeName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.officeName}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <div className="flex min-w-[110px] flex-col items-start gap-1">
        <AdminStatusChip
          tone={APPLICANT_STATUS_TONE[row.status]}
          label={APPLICANT_STATUS_LABELS[row.status]}
        />
        {row.latestApplicationStatus ? (
          <AdminStatusChip
            tone={APPLICATION_STATUS_TONE[row.latestApplicationStatus]}
            label={APPLICATION_STATUS_LABELS[row.latestApplicationStatus]}
          />
        ) : null}
        {row.source ? (
          <AdminStatusChip
            tone={resolveSourceTone(row.source)}
            label={resolveSourceLabel(row.source) ?? row.source}
          />
        ) : null}
        {row.convertedEmployeeId ? (
          <AdminStatusChip tone="active" label="Converted" />
        ) : null}
      </div>
    ),
  },
  {
    key: "applied",
    header: "Applied",
    sortAccessor: (row) => row.latestApplicationAppliedAt ?? "",
    cell: (row) => (
      <div className="min-w-[100px]">
        <p className="text-sm">{formatDate(row.latestApplicationAppliedAt)}</p>
        {row.applicationsCount > 1 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.applicationsCount} applications
          </p>
        ) : null}
      </div>
    ),
  },
]);

// ── Component ──────────────────────────────────────────────────────────────────

type ApplicantListManagementProps = {
  rows: ApplicantListItem[];
};

export function ApplicantListManagement({
  rows,
}: ApplicantListManagementProps) {
  const router = useRouter();

  // Tab counts — always derived from the full unfiltered list so each tab always
  // shows a meaningful total regardless of active search / dropdown filters.
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  // Campus dropdown options — derived dynamically so they always reflect real data
  const campusOptions = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.campusName))).sort();
    return [
      { label: "All Campuses", value: "all" },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [rows]);

  const sourceOptions = [
    { label: "All Sources", value: "all" },
    { label: "Public Careers", value: "public_careers" },
    { label: "Manual / HR-Created", value: "manual" },
  ];

  const tableState = useAdminTableState<ApplicantListItem>({
    rows,
    initialPageSize: 15,
    initialFilters: { tab: "all", campus: "all", source: "all" },
    searchPredicate: (row, search) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.fullName.toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        (row.mobileNo ?? "").toLowerCase().includes(q) ||
        (row.latestVacancyTitle ?? "").toLowerCase().includes(q) ||
        (row.latestPlantillaItemNo ?? "").toLowerCase().includes(q) ||
        row.campusName.toLowerCase().includes(q) ||
        (row.officeName ?? "").toLowerCase().includes(q)
      );
    },
    filterPredicate: (row, filters) => {
      const tab = filters.tab ?? "all";
      if (tab !== "all" && row.status !== tab) return false;
      const campus = filters.campus ?? "all";
      if (campus !== "all" && row.campusName !== campus) return false;
      const source = filters.source ?? "all";
      if (source === "public_careers" && row.source !== "public_careers")
        return false;
      if (source === "manual" && row.source === "public_careers") return false;
      return true;
    },
  });

  const rowActions = createRowActions<ApplicantListItem>(
    tableState.rows,
    (row) => row.id,
    () => [
      { key: "view", label: "View Details" },
      { key: "edit", label: "Edit Applicant" },
    ],
  );

  const activeTab = tableState.filters.tab ?? "all";

  const hasDropdownFilters =
    (tableState.filters.campus ?? "all") !== "all" ||
    (tableState.filters.source ?? "all") !== "all";

  const tabsToolbar = (
    <div
      className="flex items-center gap-1 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none" }}
    >
      {TABS.map((tab) => {
        const count = tabCounts[tab.value] ?? 0;
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => tableState.setFilter("tab", tab.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
            {count > 0 ? (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <DataTableWrapper
      title="Applicant Tracking"
      description="Track applicants, linked vacancies, positions, and recruitment progress in one place."
      actions={
        <Button
          size="sm"
          onClick={() => router.push("/recruitment/applicants/new")}
        >
          New Applicant
        </Button>
      }
      toolbar={tabsToolbar}
    >
      <AdminDataTable
        rows={tableState.rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search applicant, position, plantilla, email, or mobile..."
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        filters={
          <>
            <FilterSelect
              value={tableState.filters.campus ?? "all"}
              onChange={(value) => tableState.setFilter("campus", value)}
              options={campusOptions}
            />
            <FilterSelect
              value={tableState.filters.source ?? "all"}
              onChange={(value) => tableState.setFilter("source", value)}
              options={sourceOptions}
            />
            {hasDropdownFilters ? (
              <ClearFiltersButton
                onClear={() => {
                  tableState.setFilter("campus", "all");
                  tableState.setFilter("source", "all");
                }}
              />
            ) : null}
          </>
        }
        rowActionsByRowKey={rowActions}
        onRowAction={(input) => {
          if (input.actionKey === "view")
            return router.push(`/recruitment/applicants/${input.rowKey}`);
          if (input.actionKey === "edit")
            return router.push(`/recruitment/applicants/${input.rowKey}/edit`);
        }}
        emptyTitle="No applicants found"
        emptyDescription="No applicants match your search or filters."
        paginationSummary={tableState.summary}
        onPrevPage={tableState.prevPage}
        onNextPage={tableState.nextPage}
        canPrevPage={tableState.hasPrevPage}
        canNextPage={tableState.hasNextPage}
      />
    </DataTableWrapper>
  );
}
