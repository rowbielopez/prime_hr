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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}

