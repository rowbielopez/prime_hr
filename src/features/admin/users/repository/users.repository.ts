import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  CampusOption,
  OfficeOption,
  RoleOption,
  UserListItem,
} from "@/features/admin/users/types";

export async function listUsers(): Promise<UserListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data: usersData, error: usersError } = await supabase
    .from("app_users")
    .select("id, email, first_name, last_name, status, is_active, last_login_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (usersError) return [];

  const users = (usersData ?? []) as Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    status: "active" | "inactive" | "suspended";
    is_active: boolean;
    last_login_at: string | null;
  }>;

  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return [];

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("id, user_id, role_id, campus_id, effective_from, effective_to, created_at, role:roles(code, name), campus:campuses(name)")
    .in("user_id", userIds)
    .eq("is_active", true);

  const typedRoles = (rolesData ?? []) as Array<{
    id: string;
    user_id: string;
    role_id: string;
    campus_id: string | null;
    created_at: string;
    role: { code: string; name: string } | Array<{ code: string; name: string }> | null;
    campus: { name: string } | Array<{ name: string }> | null;
    effective_from?: string | null;
    effective_to?: string | null;
  }>;

  const today = new Date().toISOString().slice(0, 10);
  const activeRoles = typedRoles.filter((row) => {
    const fromOk = !row.effective_from || row.effective_from <= today;
    const toOk = !row.effective_to || row.effective_to >= today;
    return fromOk && toOk;
  });

  activeRoles.sort((a, b) => {
    if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id);
    return b.created_at.localeCompare(a.created_at);
  });

  const activeRoleByUserId = new Map<string, (typeof activeRoles)[number]>();
  activeRoles.forEach((row) => {
    if (!activeRoleByUserId.has(row.user_id)) {
      activeRoleByUserId.set(row.user_id, row);
    }
  });

  const roleIds = activeRoles.map((role) => role.id);
  const { data: roleOfficeData } = roleIds.length
    ? await supabase
        .from("user_role_offices")
        .select("user_role_id, office_id, office:offices(name)")
        .in("user_role_id", roleIds)
    : { data: [] };

  const typedRoleOfficeData = (roleOfficeData ?? []) as Array<{
    user_role_id: string;
    office_id: string;
    office: { name: string } | Array<{ name: string }> | null;
  }>;
  const officeByRoleId = new Map<string, (typeof typedRoleOfficeData)[number]>();
  typedRoleOfficeData.forEach((row) => {
    if (!officeByRoleId.has(row.user_role_id)) {
      officeByRoleId.set(row.user_role_id, row);
    }
  });

  return users.map((user) => {
    const role = activeRoleByUserId.get(user.id) ?? null;
    const roleInfo = role?.role ? (Array.isArray(role.role) ? role.role[0] : role.role) : null;
    const campusInfo = role?.campus ? (Array.isArray(role.campus) ? role.campus[0] : role.campus) : null;
    const officeInfo = role ? officeByRoleId.get(role.id) : null;
    const officeNameInfo = officeInfo?.office
      ? Array.isArray(officeInfo.office)
        ? officeInfo.office[0]
        : officeInfo.office
      : null;
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

    return {
      id: user.id,
      email: user.email,
      fullName: fullName || "Unnamed User",
      roleId: role?.role_id ?? null,
      roleCode: roleInfo?.code ?? null,
      roleName: roleInfo?.name ?? null,
      roleScopeType:
        roleInfo?.code === "super_admin" || roleInfo?.code === "central_hr_admin"
          ? "global"
          : roleInfo
            ? "scoped"
            : null,
      campusName: campusInfo?.name ?? null,
      campusId: role?.campus_id ?? null,
      officeName: officeNameInfo?.name ?? null,
      officeId: officeInfo?.office_id ?? null,
      isActive: user.is_active,
      status: user.status,
      lastLoginAt: user.last_login_at,
    };
  });
}

export async function listRoleOptions(context: AuthorizationContext): Promise<RoleOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) return [];
  const rows = ((data ?? []) as Array<{ id: string; code: string; name: string }>).filter((row) =>
    context.isSuperAdmin ? true : row.code !== "super_admin"
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    scopeType: row.code === "super_admin" || row.code === "central_hr_admin" ? "global" : "scoped",
  }));
}

export async function listCampusOptions(): Promise<CampusOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campuses")
    .select("id, code, name, short_name, sort_order")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    short_name: string | null;
    sort_order: number;
  }>).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    sortOrder: row.sort_order,
  }));
}

export async function listOfficeOptions(): Promise<OfficeOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offices")
    .select("id, campus_id, code, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Array<{ id: string; campus_id: string; code: string; name: string }>).map((row) => ({
    id: row.id,
    campusId: row.campus_id,
    code: row.code,
    name: row.name,
  }));
}

