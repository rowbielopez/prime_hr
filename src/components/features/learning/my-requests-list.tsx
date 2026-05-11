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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import type { TrainingRequestListItem } from "@/features/learning/types";

type Props = { rows: TrainingRequestListItem[] };

export function MyRequestsList({ rows }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/learning/my-requests/new" className={cn(buttonVariants({ size: "sm" }))}>
          New request
        </Link>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Training</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.requestKind === "nomination" ? "Nomination" : "Self"}
                  </TableCell>
                  <TableCell className="font-medium">{row.programTitle ?? row.customTitle ?? "—"}</TableCell>
                  <TableCell>
                    <AdminStatusChip tone="pending" label={row.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(row.updatedAt).toLocaleString()}
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
