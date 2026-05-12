"use client";

import { useMemo, useState } from "react";

type FilterState = Record<string, string>;
export type AdminTableSortDirection = "asc" | "desc";
type SortAccessor<RowT> = (row: RowT) => string | number | Date | null | undefined;

type UseAdminTableStateInput<RowT> = {
  rows: RowT[];
  initialPageSize?: number;
  initialSearch?: string;
  initialFilters?: FilterState;
  initialSortKey?: string;
  initialSortDirection?: AdminTableSortDirection;
  sortAccessors?: Record<string, SortAccessor<RowT>>;
  searchPredicate?: (row: RowT, search: string) => boolean;
  filterPredicate?: (row: RowT, filters: FilterState) => boolean;
};

export function useAdminTableState<RowT>({
  rows,
  initialPageSize = 10,
  initialSearch = "",
  initialFilters = {},
  initialSortKey,
  initialSortDirection = "asc",
  sortAccessors = {},
  searchPredicate,
  filterPredicate,
}: UseAdminTableStateInput<RowT>) {
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<AdminTableSortDirection>(initialSortDirection);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const passesSearch = searchPredicate ? searchPredicate(row, search) : true;
      const passesFilters = filterPredicate ? filterPredicate(row, filters) : true;
      return passesSearch && passesFilters;
    });
  }, [rows, search, filters, searchPredicate, filterPredicate]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const accessor = sortAccessors[sortKey];
    if (!accessor) return filteredRows;
    return [...filteredRows].sort((a, b) => compareSortValues(accessor(a), accessor(b), sortDirection));
  }, [filteredRows, sortAccessors, sortDirection, sortKey]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedRows = sortedRows.slice(start, end);

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  function nextPage() {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }

  function prevPage() {
    setPage((prev) => Math.max(prev - 1, 1));
  }

  function setSearchValue(value: string) {
    setSearch(value);
    setPage(1);
  }

  function setSort(key: string) {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDirection("asc");
        return key;
      }
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
      return prevKey;
    });
    setPage(1);
  }

  function setPageSizeValue(value: number) {
    setPageSize(value);
    setPage(1);
  }

  const summary = total === 0 ? "Showing 0 results" : `Showing ${start + 1}-${Math.min(end, total)} of ${total}`;

  return {
    search,
    setSearch: setSearchValue,
    filters,
    setFilter,
    clearFilters,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: setPageSizeValue,
    sortKey,
    sortDirection,
    setSort,
    total,
    totalPages,
    rows: pagedRows,
    filteredRows,
    sortedRows,
    summary,
    nextPage,
    prevPage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

function compareSortValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
  direction: AdminTableSortDirection,
) {
  const directionMultiplier = direction === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * directionMultiplier;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * directionMultiplier;
}

