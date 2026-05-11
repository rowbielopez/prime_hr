import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { AssessmentForm } from "@/components/features/learning/competencies/assessment-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { updateCompetencyAssessmentAction } from "@/features/learning/competencies/actions";
import { getCompetencyAssessmentById } from "@/features/learning/competencies/repository/assessments.repository";
import { listCompetencies } from "@/features/learning/competencies/repository/competencies.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions, listEmployees } from "@/features/employees/repository/employees.repository";

type Props = { params: Promise<{ assessmentId: string }> };

export default async function EditCompetencyAssessmentPage(props: Props) {
  const { assessmentId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies/assessments",
    permission: "learning.competencies.assess.write",
  });
  const [row, employees, campuses, offices, competencies] = await Promise.all([
    getCompetencyAssessmentById(assessmentId, context),
    listEmployees(),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
    listCompetencies(context),
  ]);
  if (!row) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title="Edit assessment" subtitle={pageMeta.subtitle} breadcrumb={[...pageMeta.breadcrumb, { label: row.employeeNo }]} />
      <AssessmentForm
        initialValue={{
          employeeId: row.employeeId,
          campusId: row.campusId,
          officeId: null,
          assessmentDate: row.assessmentDate,
          status: row.status,
          remarks: row.remarks,
          items: row.items.map((i) => ({
            competencyId: i.competencyId,
            targetLevel: i.targetLevel,
            currentLevel: i.currentLevel,
            evidenceNotes: i.evidenceNotes,
          })),
        }}
        employeeOptions={employees.map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
        campusOptions={campuses.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))}
        officeOptions={offices.map((o) => ({ id: o.id, label: `${o.code} - ${o.name}`, campusId: o.campusId }))}
        competencyOptions={competencies.map((c) => ({ id: c.id, label: `${c.code} - ${c.title}` }))}
        onSubmit={(input) => updateCompetencyAssessmentAction(assessmentId, input)}
      />
    </div>
  );
}
