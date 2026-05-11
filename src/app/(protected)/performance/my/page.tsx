import { redirect } from "next/navigation";
import { PageHeader } from "@/components/foundation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { listMyPerformanceRecords } from "@/features/performance/repository/records.repository";
import { MyPerformanceList } from "@/components/features/performance/my-performance-list";
import { listActivePerformanceCycles } from "@/features/performance/repository/cycles.repository";
import { CreateMyRecordList } from "@/components/features/performance/create-my-record-list";

export default async function MyPerformancePage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/performance/my",
    permission: "performance.read",
  });
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) redirect("/forbidden");
  const [rows, activeCycles] = await Promise.all([
    listMyPerformanceRecords(employeeId),
    listActivePerformanceCycles(context),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <CreateMyRecordList cycles={activeCycles.map((c) => ({ id: c.id, name: c.name }))} />
      <MyPerformanceList rows={rows} />
    </div>
  );
}
