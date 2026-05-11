"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminRowAction, AdminTableColumn } from "@/components/foundation/data/admin-data-table.helpers";
import { EmptyState } from "@/components/foundation/feedback/empty-state";
import { SearchFilterBar } from "@/components/foundation/data/search-filter-bar";
import { StatusBadge, type StatusTone } from "@/components/foundation/feedback/status-badge";
import { TableSkeleton } from "@/components/foundation/feedback/loading-skeletons";
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
}: AdminDataTableProps<RowT>) {
  const [localSearch, setLocalSearch] = useState("");
  const resolvedSearchValue = searchValue ?? localSearch;

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
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.header}
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
                  <TableRow key={rowKey}>
                    {columns.map((column) => (
                      <TableCell key={`${column.key}-${rowKey}`} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {rowActionsByRowKey ? (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Open row actions">
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

          <div className="flex flex-col gap-2 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>{paginationSummary}</p>
            <div className="flex items-center gap-2">
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

