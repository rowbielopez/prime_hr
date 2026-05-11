import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { COMPETENCY_ASSESSMENT_STATUS_LABELS } from "@/features/learning/status-labels";
import { getCompetencyAssessmentById } from "@/features/learning/competencies/repository/assessments.repository";

type Props = { params: Promise<{ assessmentId: string }> };

export default async function CompetencyAssessmentDetailPage(props: Props) {
  const { assessmentId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies/assessments",
    permission: "learning.competencies.assess.read",
  });
  const row = await getCompetencyAssessmentById(assessmentId, context);
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${row.employeeName} assessment`}
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: row.employeeNo }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Employee: </span>
            {row.employeeName} ({row.employeeNo})
          </p>
          <p>
            <span className="text-muted-foreground">Campus: </span>
            {row.campusName}
          </p>
          <p>
            <span className="text-muted-foreground">Date: </span>
            {new Date(row.assessmentDate).toLocaleDateString()}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {COMPETENCY_ASSESSMENT_STATUS_LABELS[row.status]}
          </p>
          {row.remarks ? (
            <p>
              <span className="text-muted-foreground">Remarks: </span>
              {row.remarks}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competency</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead>Evidence notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.competencyCode} - {item.competencyTitle}
                </TableCell>
                <TableCell className="text-right">{item.currentLevel}</TableCell>
                <TableCell className="text-right">{item.targetLevel}</TableCell>
                <TableCell>{item.evidenceNotes ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Link href="/learning/competencies/assessments" className="text-sm text-primary hover:underline">
        Back to assessments
      </Link>
    </div>
  );
}
