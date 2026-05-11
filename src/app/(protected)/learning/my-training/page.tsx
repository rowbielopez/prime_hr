import { PageHeader } from "@/components/foundation";
import { MyTrainingList } from "@/components/features/learning/my-training-list";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { listMyTrainingHistory } from "@/features/learning/participants/repository/participants.repository";
import { getEmployeeIdForAppUser } from "@/features/learning/server/employee-link";
import { redirect } from "next/navigation";

export default async function MyTrainingHistoryPage() {
  const { context, pageMeta } = await withProtectedPageMeta({
    pathname: "/learning/my-training",
    permission: "learning.access",
  });
  const employeeId = await getEmployeeIdForAppUser(context.appUserId);
  if (!employeeId) {
    redirect("/forbidden");
  }
  const rows = await listMyTrainingHistory(employeeId);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <MyTrainingList rows={rows} />
    </div>
  );
}
