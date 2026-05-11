import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceRecordListItem } from "@/features/performance/repository/records.repository";

export function MyPerformanceList({ rows }: { rows: PerformanceRecordListItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cycle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-sm text-muted-foreground">
                No performance records found yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link href={`/performance/my/${row.id}`} className="text-primary hover:underline">
                    {row.cycleName}
                  </Link>
                </TableCell>
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
