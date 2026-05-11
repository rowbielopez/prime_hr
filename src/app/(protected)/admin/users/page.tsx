import { UserTable } from "@/components/features/admin/users/user-table";
import { PageHeader } from "@/components/foundation";
import {
  listCampusOptions,
  listOfficeOptions,
  listRoleOptions,
  listUsers,
} from "@/features/admin/users/repository/users.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function AdminUsersPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/admin/users",
    permission: "admin.users.read",
  });
  const [users, roles, campuses, offices] = await Promise.all([
    listUsers(),
    listRoleOptions(context),
    listCampusOptions(),
    listOfficeOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
      <UserTable
        users={users}
        roles={roles}
        campuses={campuses}
        offices={offices}
        actorIsSuperAdmin={context.isSuperAdmin}
      />
    </div>
  );
}

