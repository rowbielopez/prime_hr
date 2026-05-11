import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceFinalSummaryRow } from "@/features/performance/types";

export function FinalRatingSummaryList({ rows }: { rows: PerformanceFinalSummaryRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Finalized</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                No finalized ratings yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/performance/summary/${row.id}`} className="text-primary hover:underline">
                    {row.employeeName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                </TableCell>
                <TableCell>{row.cycleName}</TableCell>
                <TableCell>{row.campusName}</TableCell>
                <TableCell className="text-right">{row.finalScore.toFixed(2)}</TableCell>
                <TableCell>{row.finalRating}</TableCell>
                <TableCell>
                  <div>{new Date(row.finalizedAt).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.snapshotCount > 1
                      ? `${row.snapshotCount} snapshots (latest ${new Date(row.latestSnapshotAt ?? row.finalizedAt).toLocaleDateString()})`
                      : "1 snapshot"}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
