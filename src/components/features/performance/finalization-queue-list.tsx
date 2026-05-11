import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceRecordListItem } from "@/features/performance/repository/records.repository";

export function FinalizationQueueList({ rows }: { rows: PerformanceRecordListItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                No approved records waiting finalization.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/performance/finalizations/${row.id}`} className="text-primary hover:underline">
                    {row.employeeName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                </TableCell>
                <TableCell>{row.cycleName}</TableCell>
                <TableCell>{row.campusName}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(row.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
