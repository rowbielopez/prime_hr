import { UserTable } from "@/components/features/admin/users/user-table";
import { PageHeader } from "@/components/foundation";
import {
  listCampusOptions,
  listOfficeOptions,
  listRoleOptions,
  listUsers,
} from "@/features/admin/users/repository/users.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { hasPermission } from "@/lib/rbac/scopes";

export default async function AdminUsersPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/admin/users",
    permissions: ["admin.users.read", "admin.campus.users.read"],
  });
  const [users, roles, campuses, offices] = await Promise.all([
    listUsers(context),
    listRoleOptions(context),
    listCampusOptions(context),
    listOfficeOptions(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={pageMeta.breadcrumb}
      />
      <UserTable
        users={users}
        roles={roles}
        campuses={campuses}
        offices={offices}
        actorIsSuperAdmin={context.isSuperAdmin}
        canAssignEmployeeEmail={
          hasPermission(context, "admin.users.write") ||
          hasPermission(context, "admin.campus.users.write")
        }
        canProvisionAccounts={
          context.isSuperAdmin || context.roles.includes("central_hr_admin")
        }
      />
    </div>
  );
}
