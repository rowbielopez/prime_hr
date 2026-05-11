"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterOption = {
  label: string;
  value: string;
};

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
};

export function FilterSelect({ value, onChange, options, className }: FilterSelectProps) {
  return (
    <select
      className={cn("h-8 rounded-md border bg-background px-2 text-sm", className)}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

type StatusFilterControlsProps = {
  value: string;
  onChange: (value: "all" | "active" | "inactive") => void;
  activeLabel?: string;
  inactiveLabel?: string;
  allLabel?: string;
};

export function StatusFilterControls({
  value,
  onChange,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  allLabel = "All",
}: StatusFilterControlsProps) {
  return (
    <>
      <Button variant={value === "all" ? "default" : "outline"} size="sm" onClick={() => onChange("all")}>
        {allLabel}
      </Button>
      <Button variant={value === "active" ? "default" : "outline"} size="sm" onClick={() => onChange("active")}>
        {activeLabel}
      </Button>
      <Button variant={value === "inactive" ? "default" : "outline"} size="sm" onClick={() => onChange("inactive")}>
        {inactiveLabel}
      </Button>
    </>
  );
}

type ClearFiltersButtonProps = {
  onClear: () => void;
  label?: string;
};

export function ClearFiltersButton({ onClear, label = "Clear Filters" }: ClearFiltersButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClear}>
      {label}
    </Button>
  );
}

