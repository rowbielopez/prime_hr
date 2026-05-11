import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminStatusChip } from "@/components/foundation/data/admin-data-table";
import { COMPETENCY_ASSESSMENT_STATUS_LABELS } from "@/features/learning/status-labels";
import type { CompetencyAssessmentListItem } from "@/features/learning/types";

export function AssessmentListManagement({
  rows,
  canWrite,
}: {
  rows: CompetencyAssessmentListItem[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      {canWrite ? (
        <Link href="/learning/competencies/assessments/new" className="text-sm font-medium text-primary hover:underline">
          New assessment
        </Link>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No assessments yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/learning/competencies/assessments/${row.id}`} className="text-primary hover:underline">
                      {row.employeeName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                  </TableCell>
                  <TableCell>{row.campusName}</TableCell>
                  <TableCell>{new Date(row.assessmentDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <AdminStatusChip
                      tone={row.status === "validated" ? "active" : row.status === "submitted" ? "info" : "pending"}
                      label={COMPETENCY_ASSESSMENT_STATUS_LABELS[row.status]}
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
