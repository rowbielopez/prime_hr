import { PageHeader } from "@/components/foundation";
import { CompetencyForm } from "@/components/features/learning/competencies/competency-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { createCompetencyAction } from "@/features/learning/competencies/actions";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

export default async function NewCompetencyPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies",
    permission: "learning.competencies.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="New competency"
        subtitle="Add a scoped competency to the learning catalog."
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <CompetencyForm
        initialValue={{
          code: "",
          title: "",
          description: null,
          category: null,
          campusId: null,
          officeId: null,
          status: "draft",
        }}
        campusOptions={campuses.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))}
        officeOptions={offices.map((o) => ({ id: o.id, label: `${o.code} - ${o.name}`, campusId: o.campusId }))}
        onSubmit={createCompetencyAction}
        submitLabel="Create competency"
        returnTo="/learning/competencies"
      />
    </div>
  );
}
