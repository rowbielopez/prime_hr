"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import type { CompetencyListItem } from "@/features/learning/types";
import { COMPETENCY_STATUS_LABELS } from "@/features/learning/status-labels";

export function CompetencyListManagement({
  rows,
  canWrite,
}: {
  rows: CompetencyListItem[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      {canWrite ? (
        <Link href="/learning/competencies/new" className="text-sm font-medium text-primary hover:underline">
          New competency
        </Link>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No competencies yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/learning/competencies/${row.id}`} className="text-primary hover:underline">
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.category ?? "—"}</TableCell>
                  <TableCell>{row.campusName ? `${row.campusName}${row.officeName ? ` · ${row.officeName}` : ""}` : "Global"}</TableCell>
                  <TableCell>
                    <AdminStatusChip
                      tone={row.status === "active" ? "active" : row.status === "archived" ? "inactive" : "pending"}
                      label={COMPETENCY_STATUS_LABELS[row.status]}
                    />
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
