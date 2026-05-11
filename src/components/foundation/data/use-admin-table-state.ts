"use client";

import { useMemo, useState } from "react";

type FilterState = Record<string, string>;

type UseAdminTableStateInput<RowT> = {
  rows: RowT[];
  initialPageSize?: number;
  initialSearch?: string;
  initialFilters?: FilterState;
  searchPredicate?: (row: RowT, search: string) => boolean;
  filterPredicate?: (row: RowT, filters: FilterState) => boolean;
};

export function useAdminTableState<RowT>({
  rows,
  initialPageSize = 10,
  initialSearch = "",
  initialFilters = {},
  searchPredicate,
  filterPredicate,
}: UseAdminTableStateInput<RowT>) {
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const passesSearch = searchPredicate ? searchPredicate(row, search) : true;
      const passesFilters = filterPredicate ? filterPredicate(row, filters) : true;
      return passesSearch && passesFilters;
    });
  }, [rows, search, filters, searchPredicate, filterPredicate]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedRows = filteredRows.slice(start, end);

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
    setPageSize,
    total,
    totalPages,
    rows: pagedRows,
    filteredRows,
    summary,
    nextPage,
    prevPage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

