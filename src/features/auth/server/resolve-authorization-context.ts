import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/constants/roles";
import type { AuthorizationContext } from "@/features/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePermissions } from "@/lib/rbac/permissions";
import { isRoleActiveForDate } from "@/features/auth/server/authorization-predicates";

type AppUserLookup = {
  id: string;
  email: string;
  status: "active" | "inactive" | "suspended";
  is_active: boolean;
  primary_campus_id: string | null;
  primary_office_id: string | null;
};

type UserRoleLookup = {
  id: string;
  campus_id: string | null;
  effective_from: string | null;
  effective_to: string | null;
  role: { code: AppRole } | Array<{ code: AppRole }> | null;
};

type UserRoleOfficeLookup = {
  office_id: string;
};

export async function resolveAuthorizationContext(authUser: User): Promise<AuthorizationContext | null> {
  const supabase = await createSupabaseServerClient();

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, email, status, is_active, primary_campus_id, primary_office_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (appUserError || !appUser) {
    return null;
  }

  const typedAppUser = appUser as AppUserLookup;
  if (typedAppUser.status !== "active" || !typedAppUser.is_active) {
    return null;
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("id, campus_id, effective_from, effective_to, role:roles(code)")
    .eq("user_id", typedAppUser.id)
    .eq("is_active", true);

  if (roleError || !roleRows || roleRows.length === 0) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const typedRoleRows = (roleRows as UserRoleLookup[]).filter((row) => {
    return isRoleActiveForDate(row, today);
  });

  const roles = [
    ...new Set(
      typedRoleRows
        .map((row) => {
          if (!row.role) return null;
          return Array.isArray(row.role) ? row.role[0]?.code ?? null : row.role.code;
        })
        .filter(Boolean)
    ),
  ] as AppRole[];
  if (roles.length === 0) {
    return null;
  }

  const campusScopes = [...new Set(typedRoleRows.map((row) => row.campus_id).filter(Boolean))] as string[];
  const permissions = resolvePermissions(roles);
  const roleIds = typedRoleRows.map((row) => row.id);

  let officeScopes: string[] = [];
  if (roleIds.length > 0) {
    const { data: officeRows } = await supabase
      .from("user_role_offices")
      .select("office_id")
      .in("user_role_id", roleIds);
    officeScopes = [...new Set(((officeRows ?? []) as UserRoleOfficeLookup[]).map((row) => row.office_id))];
  }
  if (typedAppUser.primary_office_id) {
    officeScopes = [...new Set([...officeScopes, typedAppUser.primary_office_id])];
  }

  return {
    authUserId: authUser.id,
    appUserId: typedAppUser.id,
    email: typedAppUser.email,
    roles,
    permissions,
    campusScopes,
    officeScopes,
    primaryCampusId: typedAppUser.primary_campus_id,
    primaryOfficeId: typedAppUser.primary_office_id,
    isSuperAdmin: roles.includes("super_admin"),
  };
}

