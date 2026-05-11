"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { ATTENDANCE_LABELS, COMPLETION_LABELS } from "@/features/learning/status-labels";
import type { CompletionStatus, TrainingHistoryRow } from "@/features/learning/types";

const COMPLETION_FILTER_OPTIONS: Array<{ value: CompletionStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: COMPLETION_LABELS.completed },
  { value: "in_progress", label: COMPLETION_LABELS.in_progress },
  { value: "not_started", label: COMPLETION_LABELS.not_started },
  { value: "waived", label: COMPLETION_LABELS.waived },
  { value: "not_completed", label: COMPLETION_LABELS.not_completed },
];

type Props = {
  employeeId: string;
  years: number[];
  rows: TrainingHistoryRow[];
  selectedYear?: number;
  selectedCompletion: CompletionStatus | "all";
};

export function EmployeeTrainingHistory({
  employeeId,
  years,
  rows,
  selectedYear,
  selectedCompletion,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const basePath = `/employees/${employeeId}/training`;

  function navigateWithParams(year: number | undefined, completion: CompletionStatus | "all") {
    const p = new URLSearchParams();
    if (year !== undefined) p.set("year", String(year));
    if (completion !== "all") p.set("completion", completion);
    const qs = p.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  const hasActiveFilters = selectedYear !== undefined || selectedCompletion !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="training-year" className="text-xs">
            Calendar year
          </Label>
          <select
            id="training-year"
            className="h-9 min-w-[140px] rounded-md border bg-background px-3 text-sm"
            disabled={isPending}
            value={selectedYear === undefined ? "" : String(selectedYear)}
            onChange={(e) => {
              const v = e.target.value;
              const y = v === "" ? undefined : parseInt(v, 10);
              navigateWithParams(y, selectedCompletion);
            }}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="training-completion" className="text-xs">
            Completion status
          </Label>
          <select
            id="training-completion"
            className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm"
            disabled={isPending}
            value={selectedCompletion}
            onChange={(e) =>
              navigateWithParams(selectedYear, e.target.value as CompletionStatus | "all")
            }
          >
            {COMPLETION_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            disabled={isPending}
            onClick={() => startTransition(() => router.push(basePath))}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  {years.length === 0
                    ? "No learning sessions on record for this employee yet."
                    : "No training records match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/learning/sessions/${row.sessionId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {row.sessionTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.programId ? (
                      <Link
                        href={`/learning/programs/${row.programId}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.programTitle}
                      </Link>
                    ) : (
                      row.programTitle
                    )}
                  </TableCell>
                  <TableCell>{row.campusName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(row.startsAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <AdminStatusChip tone="info" label={ATTENDANCE_LABELS[row.attendance]} />
                  </TableCell>
                  <TableCell>
                    <AdminStatusChip
                      tone={row.completion === "completed" ? "active" : "pending"}
                      label={COMPLETION_LABELS[row.completion]}
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                    {row.notes?.trim() ? row.notes : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {hasActiveFilters ? (
        <p className="text-xs text-muted-foreground">Filtered view — share this URL to return to the same filters.</p>
      ) : null}
    </div>
  );
}
