import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listEmployeeCampusOptions, listEmployeeOfficeOptions } from "@/features/employees/repository/employees.repository";
import { PerformanceCycleForm } from "@/components/features/performance/performance-cycle-form";
import { createPerformanceCycleAction } from "@/features/performance/actions";

export default async function NewPerformanceCyclePage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/cycles",
    permission: "performance.write",
  });
  const [campuses, offices] = await Promise.all([
    listEmployeeCampusOptions(context),
    listEmployeeOfficeOptions(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="New performance cycle"
        subtitle={pageMeta.subtitle}
        breadcrumb={[...pageMeta.breadcrumb, { label: "New" }]}
      />
      <PerformanceCycleForm
        initialValue={{
          name: "",
          description: null,
          startDate: "",
          submissionDeadline: "",
          reviewDeadline: "",
          endDate: "",
          campusId: null,
          officeId: null,
          status: "draft",
        }}
        campusOptions={campuses}
        officeOptions={offices}
        onSubmit={createPerformanceCycleAction}
      />
    </div>
  );
}
