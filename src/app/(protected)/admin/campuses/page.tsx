import { CampusManagement } from "@/components/features/admin/organization/campus-management";
import { PageHeader } from "@/components/foundation";
import { listCampuses } from "@/features/admin/organization/repository/campus.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function AdminCampusesPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/admin/campuses",
    permission: "admin.organization.read",
  });
  const campuses = await listCampuses();
  const canMutate = context.permissions.includes("admin.organization.write");

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <CampusManagement campuses={campuses} canMutate={canMutate} />
    </div>
  );
}

