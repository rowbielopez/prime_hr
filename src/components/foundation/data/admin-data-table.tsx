"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminRowAction, AdminTableColumn } from "@/components/foundation/data/admin-data-table.helpers";
import { EmptyState } from "@/components/foundation/feedback/empty-state";
import { SearchFilterBar } from "@/components/foundation/data/search-filter-bar";
import { StatusBadge, type StatusTone } from "@/components/foundation/feedback/status-badge";
import { TableSkeleton } from "@/components/foundation/feedback/loading-skeletons";
import { FilterSelect } from "@/components/foundation/data/filter-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";
type Density = "comfortable" | "compact";

type AdminDataTableProps<RowT> = {
  rows: RowT[];
  columns: AdminTableColumn<RowT>[];
  getRowKey: (row: RowT) => string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  rowActionsByRowKey?: Record<string, AdminRowAction[]>;
  onRowAction?: (input: { rowKey: string; actionKey: string }) => void;
  paginationSummary?: string;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  canPrevPage?: boolean;
  canNextPage?: boolean;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (columnKey: string) => void;
  density?: Density;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (value: number) => void;
};

export function AdminStatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  return <StatusBadge tone={tone} label={label} />;
}

export function AdminDataTable<RowT>({
  rows,
  columns,
  getRowKey,
  searchPlaceholder = "Search records...",
  searchValue,
  onSearchChange,
  filters,
  actions,
  isLoading = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyAction,
  rowActionsByRowKey,
  onRowAction,
  paginationSummary = "Showing 1-10 of 100",
  onPrevPage,
  onNextPage,
  canPrevPage = false,
  canNextPage = false,
  sortKey,
  sortDirection = "asc",
  onSortChange,
  density = "comfortable",
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
}: AdminDataTableProps<RowT>) {
  const [localSearch, setLocalSearch] = useState("");
  const resolvedSearchValue = searchValue ?? localSearch;
  const hasSearch = resolvedSearchValue.trim().length > 0;
  const densityCellClass = density === "compact" ? "py-2" : "py-3";

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar
        searchPlaceholder={searchPlaceholder}
        searchValue={resolvedSearchValue}
        onSearchChange={(value) => {
          if (!onSearchChange) {
            setLocalSearch(value);
            return;
          }
          onSearchChange(value);
        }}
        rightSlot={
          <>
            {filters}
            {actions}
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title={hasSearch ? "No matching records" : emptyTitle}
          description={hasSearch ? "Try a broader search term or clear the active filters." : emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {onSortChange && column.sortAccessor ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="group/sort inline-flex cursor-pointer items-center gap-1 rounded-md py-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label={`Sort by ${column.header}`}
                      >
                        <span>{column.header}</span>
                        <SortIcon active={sortKey === column.key} direction={sortDirection} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
                {rowActionsByRowKey ? <TableHead className="w-12 text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rowKey = getRowKey(row);
                const rowActions = rowActionsByRowKey?.[rowKey] ?? [];
                return (
                  <TableRow key={rowKey} className="hover:shadow-[inset_3px_0_0_var(--primary)]">
                    {columns.map((column) => (
                      <TableCell key={`${column.key}-${rowKey}`} className={cn(densityCellClass, column.className)}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {rowActionsByRowKey ? (
                      <TableCell className={cn("text-right", densityCellClass)}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Open row actions"
                                className="opacity-100 transition-opacity md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            {rowActions.map((action) => (
                              <DropdownMenuItem
                                key={action.key}
                                onClick={() => onRowAction?.({ rowKey, actionKey: action.key })}
                                variant={action.destructive ? "destructive" : "default"}
                                disabled={action.disabled}
                              >
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 rounded-xl border premium-border bg-surface-inset/45 px-3 py-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p>{paginationSummary}</p>
              {onPageSizeChange && pageSize ? (
                <FilterSelect
                  value={String(pageSize)}
                  onChange={(value) => onPageSizeChange(Number(value))}
                  options={pageSizeOptions.map((option) => ({ label: `${option} / page`, value: String(option) }))}
                  className="h-7 min-w-28 text-xs"
                />
              ) : null}
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canPrevPage}
                onClick={onPrevPage}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canNextPage}
                onClick={onNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronsUpDown className="size-3.5 text-muted-foreground/60 transition-colors group-hover/sort:text-foreground" />;
  if (direction === "asc") return <ArrowUp className="size-3.5 text-primary" />;
  return <ArrowDown className="size-3.5 text-primary" />;
}

