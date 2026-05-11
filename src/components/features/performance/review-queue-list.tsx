import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceRecordListItem } from "@/features/performance/repository/records.repository";

export function ReviewQueueList({ rows }: { rows: PerformanceRecordListItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                No records pending review.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/performance/reviews/${row.id}`} className="text-primary hover:underline">
                    {row.employeeName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                </TableCell>
                <TableCell>{row.cycleName}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(row.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
