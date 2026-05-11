"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { ATTENDANCE_LABELS, COMPLETION_LABELS } from "@/features/learning/status-labels";
import type { MyTrainingRow } from "@/features/learning/types";

type Props = { rows: MyTrainingRow[] };

export function MyTrainingList({ rows }: Props) {
  return (
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
                No training records yet.
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
  );
}
