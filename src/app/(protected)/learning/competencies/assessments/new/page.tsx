import { PageHeader } from "@/components/foundation";
import { AssessmentForm } from "@/components/features/learning/competencies/assessment-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createCompetencyAssessmentAction } from "@/features/learning/competencies/actions";
import { listCompetencies } from "@/features/learning/competencies/repository/competencies.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions, listEmployees } from "@/features/employees/repository/employees.repository";

export default async function NewCompetencyAssessmentPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies/assessments",
    permission: "learning.competencies.assess.write",
  });
  const [employees, campuses, offices, competencies] = await Promise.all([
    listEmployees(),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
    listCompetencies(context),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New competency assessment"
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <AssessmentForm
        initialValue={{
          employeeId: "",
          campusId: "",
          officeId: null,
          assessmentDate: today,
          status: "draft",
          remarks: null,
          items: [],
        }}
        employeeOptions={employees.map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeNo})` }))}
        campusOptions={campuses.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))}
        officeOptions={offices.map((o) => ({ id: o.id, label: `${o.code} - ${o.name}`, campusId: o.campusId }))}
        competencyOptions={competencies.map((c) => ({ id: c.id, label: `${c.code} - ${c.title}` }))}
        onSubmit={createCompetencyAssessmentAction}
      />
    </div>
  );
}
