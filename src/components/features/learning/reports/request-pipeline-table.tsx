import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RequestPipelineRow } from "@/features/learning/reports/types";

export function RequestPipelineTable({ rows }: { rows: RequestPipelineRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campus</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                No request metrics available.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={`${row.campusId}-${row.requestKind}-${row.status}-${index}`}>
                <TableCell>{row.campusName}</TableCell>
                <TableCell>{row.requestKind}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">{row.requestCount}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
