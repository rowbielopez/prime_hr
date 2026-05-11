import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";
import { listEmployees } from "@/features/employees/repository/employees.repository";
import { listPerformanceManagementRecords } from "@/features/performance/repository/records.repository";
import { listActivePerformanceCycles } from "@/features/performance/repository/cycles.repository";
import { ManagementRecordsList } from "@/components/features/performance/management-records-list";
import { CreateHrPerformanceRecordForm } from "@/components/features/performance/create-hr-performance-record-form";

export default async function PerformanceRecordsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/records",
    permission: "performance.read",
  });
  const canWrite = hasPermission(context, "performance.write");
  const [rows, employees, activeCycles] = await Promise.all([
    listPerformanceManagementRecords(context),
    listEmployees(),
    listActivePerformanceCycles(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      {canWrite ? <CreateHrPerformanceRecordForm employees={employees} activeCycles={activeCycles} /> : null}
      <ManagementRecordsList rows={rows} />
    </div>
  );
}
