import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthorizationContext } from "@/features/auth/types";
import type {
  CampusOption,
  EmployeeSearchResult,
  EmployeeEmailAssignmentSearchResult,
  OfficeOption,
  RoleOption,
  UserListItem,
} from "@/features/admin/users/types";

type UserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: "active" | "inactive" | "suspended";
  is_active: boolean;
  last_login_at: string | null;
  employee_id: string | null;
  primary_campus_id: string | null;
  primary_office_id: string | null;
};

type EmployeeLookup = {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  campus_id: string;
  office_id: string | null;
};

function isGlobalUserAdmin(context?: AuthorizationContext): boolean {
  return (
    !context ||
    context.isSuperAdmin ||
    context.roles.includes("central_hr_admin")
  );
}

function isInCampusScope(
  context: AuthorizationContext | undefined,
  campusId: string | null | undefined,
): boolean {
  if (!context || isGlobalUserAdmin(context)) return true;
  return Boolean(campusId && context.campusScopes.includes(campusId));
}

function userIsVisibleToContext(input: {
  context?: AuthorizationContext;
  user: UserRow;
  roleCampusId: string | null | undefined;
  employee: EmployeeLookup | null;
}): boolean {
  const { context, user, roleCampusId, employee } = input;
  if (!context || isGlobalUserAdmin(context)) return true;
  return (
    isInCampusScope(context, roleCampusId) ||
    isInCampusScope(context, user.primary_campus_id) ||
    isInCampusScope(context, employee?.campus_id)
  );
}

export async function listUsers(
  context?: AuthorizationContext,
): Promise<UserListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data: usersData, error: usersError } = await supabase
    .from("app_users")
    .select(
      "id, email, first_name, last_name, status, is_active, last_login_at, employee_id, primary_campus_id, primary_office_id",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (usersError) return [];

  const users = (usersData ?? []) as UserRow[];

  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return [];

  // Batch fetch linked employee data
  const employeeIds = users
    .map((u) => u.employee_id)
    .filter(Boolean) as string[];
  const employeeById = new Map<string, EmployeeLookup>();
  if (employeeIds.length > 0) {
    const { data: empData } = await supabase
      .from("employees")
      .select("id, employee_no, first_name, last_name, campus_id, office_id")
      .in("id", employeeIds)
      .is("deleted_at", null);
    for (const emp of (empData ?? []) as EmployeeLookup[]) {
      employeeById.set(emp.id, emp);
    }
  }

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select(
      "id, user_id, role_id, campus_id, effective_from, effective_to, created_at, role:roles(code, name), campus:campuses(name)",
    )
    .in("user_id", userIds)
    .eq("is_active", true);

  const typedRoles = (rolesData ?? []) as Array<{
    id: string;
    user_id: string;
    role_id: string;
    campus_id: string | null;
    created_at: string;
    role:
      | { code: string; name: string }
      | Array<{ code: string; name: string }>
      | null;
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
  const officeByRoleId = new Map<
    string,
    (typeof typedRoleOfficeData)[number]
  >();
  typedRoleOfficeData.forEach((row) => {
    if (!officeByRoleId.has(row.user_role_id)) {
      officeByRoleId.set(row.user_role_id, row);
    }
  });

  return users.flatMap((user) => {
    const role = activeRoleByUserId.get(user.id) ?? null;
    const roleInfo = role?.role
      ? Array.isArray(role.role)
        ? role.role[0]
        : role.role
      : null;
    const campusInfo = role?.campus
      ? Array.isArray(role.campus)
        ? role.campus[0]
        : role.campus
      : null;
    const officeInfo = role ? officeByRoleId.get(role.id) : null;
    const officeNameInfo = officeInfo?.office
      ? Array.isArray(officeInfo.office)
        ? officeInfo.office[0]
        : officeInfo.office
      : null;
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    const employee = user.employee_id
      ? (employeeById.get(user.employee_id) ?? null)
      : null;
    const employeeName = employee
      ? `${employee.first_name} ${employee.last_name}`.trim()
      : null;
    if (
      !userIsVisibleToContext({
        context,
        user,
        roleCampusId: role?.campus_id,
        employee,
      })
    )
      return [];

    return [
      {
        id: user.id,
        email: user.email,
        fullName: fullName || "Unnamed User",
        roleId: role?.role_id ?? null,
        roleCode: roleInfo?.code ?? null,
        roleName: roleInfo?.name ?? null,
        roleScopeType:
          roleInfo?.code === "super_admin" ||
          roleInfo?.code === "central_hr_admin"
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
        employeeId: user.employee_id,
        employeeNo: employee?.employee_no ?? null,
        employeeName: employeeName || null,
      },
    ];
  });
}

export async function searchEmployeesForLinking(
  query: string,
  context?: AuthorizationContext,
): Promise<EmployeeSearchResult[]> {
  const supabase = await createSupabaseServerClient();
  const q = query.trim();
  if (!q || q.length < 2) return [];

  let queryBuilder = supabase
    .from("employees")
    .select(
      "id, employee_no, first_name, middle_name, last_name, email, campus_id, campus:campuses(name)",
    )
    .or(
      `employee_no.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
    )
    .is("deleted_at", null);
  if (
    context &&
    !isGlobalUserAdmin(context) &&
    context.campusScopes.length > 0
  ) {
    queryBuilder = queryBuilder.in("campus_id", context.campusScopes);
  }
  const { data, error } = await queryBuilder.limit(10);

  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      employee_no: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      email: string | null;
      campus_id: string;
      campus: { name: string } | Array<{ name: string }> | null;
    }>
  ).map((emp) => {
    const campusInfo = emp.campus
      ? Array.isArray(emp.campus)
        ? emp.campus[0]
        : emp.campus
      : null;
    return {
      id: emp.id,
      employeeNo: emp.employee_no,
      fullName: [emp.first_name, emp.middle_name, emp.last_name]
        .filter(Boolean)
        .join(" "),
      email: emp.email,
      campusName: campusInfo?.name ?? null,
    };
  });
}

export async function searchEmployeesForEmailAssignment(
  query: string,
  context?: AuthorizationContext,
): Promise<EmployeeEmailAssignmentSearchResult[]> {
  const supabase = await createSupabaseServerClient();
  const q = query.trim();
  if (!q || q.length < 2) return [];

  let queryBuilder = supabase
    .from("employees")
    .select(
      "id, employee_no, first_name, middle_name, last_name, email, campus_id, office_id, campus:campuses(name), office:offices(name)",
    )
    .or(
      `employee_no.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
    )
    .is("deleted_at", null);
  if (
    context &&
    !isGlobalUserAdmin(context) &&
    context.campusScopes.length > 0
  ) {
    queryBuilder = queryBuilder.in("campus_id", context.campusScopes);
  }
  const { data, error } = await queryBuilder.limit(10);
  if (error) return [];

  const employeeRows = (data ?? []) as Array<{
    id: string;
    employee_no: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string | null;
    campus_id: string;
    office_id: string | null;
    campus: { name: string } | Array<{ name: string }> | null;
    office: { name: string } | Array<{ name: string }> | null;
  }>;
  const employeeIds = employeeRows.map((employee) => employee.id);
  const { data: accountRows } = employeeIds.length
    ? await supabase
        .from("app_users")
        .select("employee_id, email, status, is_active")
        .in("employee_id", employeeIds)
        .is("deleted_at", null)
    : { data: [] };
  const accountByEmployeeId = new Map(
    (
      (accountRows ?? []) as Array<{
        employee_id: string;
        email: string;
        status: "active" | "inactive" | "suspended";
        is_active: boolean;
      }>
    ).map((account) => [account.employee_id, account]),
  );

  return employeeRows.map((employee) => {
    const campusInfo = employee.campus
      ? Array.isArray(employee.campus)
        ? employee.campus[0]
        : employee.campus
      : null;
    const officeInfo = employee.office
      ? Array.isArray(employee.office)
        ? employee.office[0]
        : employee.office
      : null;
    const linkedAccount = accountByEmployeeId.get(employee.id) ?? null;
    return {
      id: employee.id,
      employeeNo: employee.employee_no,
      fullName: [employee.first_name, employee.middle_name, employee.last_name]
        .filter(Boolean)
        .join(" "),
      email: employee.email,
      campusName: campusInfo?.name ?? null,
      officeName: officeInfo?.name ?? null,
      linkedAccountEmail: linkedAccount?.email ?? null,
      linkedAccountStatus: linkedAccount?.status ?? null,
      linkedAccountIsActive: linkedAccount?.is_active ?? null,
    };
  });
}

export async function listRoleOptions(
  context: AuthorizationContext,
): Promise<RoleOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) return [];
  const rows = (
    (data ?? []) as Array<{ id: string; code: string; name: string }>
  ).filter((row) =>
    isGlobalUserAdmin(context)
      ? context.isSuperAdmin
        ? true
        : row.code !== "super_admin"
      : row.code !== "super_admin" && row.code !== "central_hr_admin",
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    scopeType:
      row.code === "super_admin" || row.code === "central_hr_admin"
        ? "global"
        : "scoped",
  }));
}

export async function listCampusOptions(
  context?: AuthorizationContext,
): Promise<CampusOption[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("campuses")
    .select("id, code, name, short_name, sort_order")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (
    context &&
    !isGlobalUserAdmin(context) &&
    context.campusScopes.length > 0
  ) {
    query = query.in("id", context.campusScopes);
  }
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      code: string;
      name: string;
      short_name: string | null;
      sort_order: number;
    }>
  ).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    sortOrder: row.sort_order,
  }));
}

export async function listOfficeOptions(
  context?: AuthorizationContext,
): Promise<OfficeOption[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("offices")
    .select("id, campus_id, code, name")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (
    context &&
    !isGlobalUserAdmin(context) &&
    context.campusScopes.length > 0
  ) {
    query = query.in("campus_id", context.campusScopes);
  }
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return (
    (data ?? []) as Array<{
      id: string;
      campus_id: string;
      code: string;
      name: string;
    }>
  ).map((row) => ({
    id: row.id,
    campusId: row.campus_id,
    code: row.code,
    name: row.name,
  }));
}
