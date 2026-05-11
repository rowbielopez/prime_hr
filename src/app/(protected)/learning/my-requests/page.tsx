import { PageHeader } from "@/components/foundation";
import { MyRequestsList } from "@/components/features/learning/my-requests-list";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listMyTrainingRequests } from "@/features/learning/requests/repository/requests.repository";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { redirect } from "next/navigation";

export default async function MyTrainingRequestsPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/my-requests",
    permission: "learning.access",
  });
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) {
    redirect("/forbidden");
  }
  const rows = await listMyTrainingRequests(employeeId);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <MyRequestsList rows={rows} />
    </div>
  );
}
