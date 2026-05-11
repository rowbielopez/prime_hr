import { OfficeManagement } from "@/components/features/admin/organization/office-management";
import { PageHeader } from "@/components/foundation";
import { listCampusOptions } from "@/features/admin/organization/repository/campus.repository";
import { listOffices } from "@/features/admin/organization/repository/office.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function AdminOfficesPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/admin/offices",
    permission: "admin.organization.read",
  });
  const [offices, campuses] = await Promise.all([listOffices(), listCampusOptions()]);
  const canMutate = context.permissions.includes("admin.organization.write");

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <OfficeManagement offices={offices} campuses={campuses} canMutate={canMutate} />
    </div>
  );
}

