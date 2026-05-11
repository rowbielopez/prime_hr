import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SessionUtilizationRow } from "@/features/learning/reports/types";

export function SessionUtilizationTable({ rows }: { rows: SessionUtilizationRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead className="text-right">Participants</TableHead>
            <TableHead className="text-right">Attended</TableHead>
            <TableHead className="text-right">Absent</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="text-right">Capacity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-sm text-muted-foreground">
                No utilization metrics available.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.sessionId}>
                <TableCell className="font-medium">
                  <Link href={`/learning/sessions/${row.sessionId}`} className="text-primary hover:underline">
                    {row.sessionTitle}
                  </Link>
                </TableCell>
                <TableCell>{row.campusName}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(row.startsAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.participantCount}</TableCell>
                <TableCell className="text-right">{row.attendedCount}</TableCell>
                <TableCell className="text-right">{row.absentCount}</TableCell>
                <TableCell className="text-right">{row.completedCount}</TableCell>
                <TableCell className="text-right">{row.capacity ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
