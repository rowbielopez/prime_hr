"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchFilterBarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  rightSlot?: ReactNode;
};

export function SearchFilterBar({
  searchPlaceholder = "Search records...",
  searchValue,
  onSearchChange,
  rightSlot,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border premium-border bg-surface-inset/45 p-2.5 shadow-premium-sm md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 rounded-xl border-transparent bg-surface-panel pl-9 shadow-none focus-visible:ring-2"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{rightSlot}</div> : null}
    </div>
  );
}

