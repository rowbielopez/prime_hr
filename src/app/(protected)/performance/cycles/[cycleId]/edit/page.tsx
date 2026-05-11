import { notFound } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { getPerformanceCycleById } from "@/features/performance/repository/cycles.repository";
import { updatePerformanceCycleAction } from "@/features/performance/actions";
import { PerformanceCycleForm } from "@/components/features/performance/performance-cycle-form";

type Props = { params: Promise<{ cycleId: string }> };

export default async function EditPerformanceCyclePage(props: Props) {
  const { cycleId } = await props.params;
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/cycles",
    permission: "performance.write",
  });
  const [row, campuses, offices] = await Promise.all([
    getPerformanceCycleById(cycleId, context),
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  if (!row) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${row.name}`} subtitle={pageMeta.subtitle} breadcrumb={[...pageMeta.breadcrumb, { label: row.name }]} />
      <PerformanceCycleForm
        initialValue={{
          name: row.name,
          description: row.description,
          startDate: row.startDate,
          submissionDeadline: row.submissionDeadline,
          reviewDeadline: row.reviewDeadline,
          endDate: row.endDate,
          campusId: row.campusId,
          officeId: row.officeId,
          status: row.status,
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={(input) => updatePerformanceCycleAction(cycleId, input)}
      />
    </div>
  );
}
