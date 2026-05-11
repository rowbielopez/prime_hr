import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceRecordListItem } from "@/features/performance/repository/records.repository";

export function ManagementRecordsList({ rows }: { rows: PerformanceRecordListItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                No performance records in scope.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/performance/records/${row.id}`} className="text-primary hover:underline">
                    {row.employeeName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                </TableCell>
                <TableCell>{row.cycleName}</TableCell>
                <TableCell>{row.campusName}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(row.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
