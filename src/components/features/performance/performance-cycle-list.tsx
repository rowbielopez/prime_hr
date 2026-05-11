import Link from "next/link";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceCycleListItem } from "@/features/performance/types";
import { buttonVariants } from "@/components/ui/button";

function activeLabel(status: PerformanceCycleListItem["status"]) {
  return status === "active" ? "Active" : "Inactive";
}

export function PerformanceCycleList({
  rows,
  canWrite,
  statusFilter,
}: {
  rows: PerformanceCycleListItem[];
  canWrite: boolean;
  statusFilter?: string;
}) {
  const f = statusFilter || "all";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <Link href="/performance/cycles/new" className="text-sm font-medium text-primary hover:underline">
            Create cycle
          </Link>
        ) : null}
        <div className="ms-auto flex flex-wrap gap-2">
          <Link
            href="/performance/cycles"
            className={cn(buttonVariants({ variant: f === "all" ? "default" : "outline", size: "sm" }))}
          >
            All
          </Link>
          <Link
            href="/performance/cycles?status=active"
            className={cn(buttonVariants({ variant: f === "active" ? "default" : "outline", size: "sm" }))}
          >
            Active
          </Link>
          <Link
            href="/performance/cycles?status=inactive"
            className={cn(buttonVariants({ variant: f === "inactive" ? "default" : "outline", size: "sm" }))}
          >
            Inactive
          </Link>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No performance cycles in this view.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/performance/cycles/${row.id}`} className="text-primary hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.campusName ? `${row.campusName}${row.officeName ? ` · ${row.officeName}` : ""}` : "Organization-wide"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{row.status}</span>
                    <div className="text-xs font-medium">{activeLabel(row.status)}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {canWrite ? (
                      <Link href={`/performance/cycles/${row.id}/edit`} className="text-primary hover:underline">
                        Edit
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
