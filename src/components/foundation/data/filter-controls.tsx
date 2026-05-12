"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "Filter";
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue !== null && onChange(nextValue)}>
      <SelectTrigger size="sm" className={cn("min-w-34 bg-surface-panel shadow-premium-sm", className)}>
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    <div className="inline-flex rounded-xl border premium-border bg-surface-inset p-1 shadow-premium-sm">
      <Button variant={value === "all" ? "default" : "ghost"} size="sm" onClick={() => onChange("all")}>
        {allLabel}
      </Button>
      <Button variant={value === "active" ? "default" : "ghost"} size="sm" onClick={() => onChange("active")}>
        {activeLabel}
      </Button>
      <Button variant={value === "inactive" ? "default" : "ghost"} size="sm" onClick={() => onChange("inactive")}>
        {inactiveLabel}
      </Button>
    </div>
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

