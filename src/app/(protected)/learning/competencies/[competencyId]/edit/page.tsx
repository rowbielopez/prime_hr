import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { CompetencyForm } from "@/components/features/learning/competencies/competency-form";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { updateCompetencyAction } from "@/features/learning/competencies/actions";
import { getCompetencyById } from "@/features/learning/competencies/repository/competencies.repository";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";

type Props = { params: Promise<{ competencyId: string }> };

export default async function EditCompetencyPage(props: Props) {
  const { competencyId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/competencies",
    permission: "learning.competencies.write",
  });
  const [row, campuses, offices] = await Promise.all([
    getCompetencyById(competencyId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${row.code}`} subtitle={pageMeta.subtitle} breadcrumb={[...pageMeta.breadcrumb, { label: row.code }]} />
      <CompetencyForm
        initialValue={{
          code: row.code,
          title: row.title,
          description: row.description,
          category: row.category,
          campusId: row.campusId,
          officeId: row.officeId,
          status: row.status,
        }}
        campusOptions={campuses.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))}
        officeOptions={offices.map((o) => ({ id: o.id, label: `${o.code} - ${o.name}`, campusId: o.campusId }))}
        onSubmit={(input) => updateCompetencyAction(competencyId, input)}
        submitLabel="Save changes"
        returnTo={`/learning/competencies/${competencyId}`}
      />
    </div>
  );
}
